// 所有数据库验证均在本机新建的独立库执行，不接触业务数据库。
import { Client } from 'pg';
import fs from 'node:fs';
import assert from 'node:assert/strict';

export async function openTonerDatabase() {
  const url = new URL(process.env.TEST_DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), '仅允许本机隔离 PostgreSQL');
  const runId = process.env.TONER_TEST_RUN_ID ?? `${process.pid}_${Date.now()}`;
  assert.match(runId, /^\d+(?:_\d+)?$/);
  const name = `hiwe_toner_test_${runId}`;
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  url.pathname = `/${name}`;
  const db = new Client({ connectionString: url.toString() });
  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    await db.end();
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.end();
  }
  try {
    await db.connect();
    const schema = fs.readFileSync('supabase-migrations/20260720_add_toners_table.sql', 'utf8');
    await db.query(schema.match(/CREATE TABLE IF NOT EXISTS public\.toners \([\s\S]*?\n\);/)[0]);
    await db.query(`CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$`);
    await db.query(schema.match(/CREATE TRIGGER update_toners_updated_at[\s\S]*?;/)[0]);
    for (const insert of schema.matchAll(/INSERT INTO public\.toners[\s\S]*?ON CONFLICT \(code\) DO NOTHING;/g)) await db.query(insert[0]);
    const before = (await db.query("SELECT to_jsonb(t) - 'updated_at' AS row FROM toners t ORDER BY code")).rows;
    const migration = fs.readFileSync('supabase-migrations/20261103000001_toner_website_url.sql', 'utf8');
    await db.query(migration);
    assert.deepEqual((await db.query("SELECT to_jsonb(t) - 'website_url' - 'updated_at' AS row FROM toners t ORDER BY code")).rows, before);
    const legacy = [...fs.readFileSync('src/data/toner-site-links.ts', 'utf8').matchAll(/^\s*"([^"]+)": "(https:\/\/www\.hiwe\.com\/[^"]+)"/gm)];
    const rows = (await db.query('SELECT code, website_url FROM toners ORDER BY code')).rows;
    for (const [, code, link] of legacy) assert.equal(rows.find(row => row.code === code)?.website_url, link);
    assert.equal(rows.filter(row => row.website_url).length, legacy.length);
    const code = legacy[0][1], edited = legacy[1][1];
    await db.query('UPDATE toners SET website_url = NULL WHERE code = $1', [code]);
    await db.query('UPDATE toners SET website_url = $1 WHERE code = $2', ['https://hiwe.com/manual-edit', edited]);
    await db.query(migration);
    assert.equal((await db.query('SELECT website_url FROM toners WHERE code = $1', [code])).rows[0].website_url, null);
    assert.equal((await db.query('SELECT website_url FROM toners WHERE code = $1', [edited])).rows[0].website_url, 'https://hiwe.com/manual-edit');
    // 验证旧客户端 upsert 省略字段时，数据库保留链接。
    await db.query('INSERT INTO toners(code,trade_name,name_zh,category) VALUES ($1,$2,$3,$4) ON CONFLICT(code) DO UPDATE SET trade_name=EXCLUDED.trade_name', [edited, 'Edited name', '名称', '1K_BASECOAT']);
    assert.equal((await db.query('SELECT website_url FROM toners WHERE code = $1', [edited])).rows[0].website_url, 'https://hiwe.com/manual-edit');
    await db.query('UPDATE toners t SET website_url = snapshot.website_url FROM jsonb_to_recordset($1) AS snapshot(code text, website_url text) WHERE t.code = snapshot.code', [JSON.stringify(rows)]);
    console.log(`PASS 官网链接迁移：${rows.length} 条色母、${legacy.length} 个旧链接；重跑保留修改和解除，旧客户端保留链接`);
    return { db, close };
  } catch (error) {
    await close();
    throw error;
  }
}

// Windows 可能直接终止测试服务器；由 Playwright 再次确保测试库已清理。
export default async function teardown() {
  const runId = process.env.TONER_TEST_RUN_ID;
  assert.match(runId ?? '', /^\d+$/);
  await fetch(`http://127.0.0.1:54330/__close?run=${runId}`, { signal: AbortSignal.timeout(5000) }).catch(() => {});
  const url = new URL(process.env.TEST_DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  try { await admin.query(`DROP DATABASE IF EXISTS hiwe_toner_test_${runId} WITH (FORCE)`); }
  finally { await admin.end(); }
}

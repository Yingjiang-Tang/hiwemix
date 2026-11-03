// 仅连接本机测试集群，创建独立数据库；绝不在传入的数据库中修改业务表。
import { Client } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const connection = process.env.TEST_DATABASE_URL;
if (!connection || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(connection).hostname)) throw new Error('TEST_DATABASE_URL 必须指向本机隔离 PostgreSQL 集群');
const name = `hiwe_year_test_${Date.now()}`;
const admin = new Client({ connectionString: connection });
const target = new URL(connection); target.pathname = `/${name}`;
const db = new Client({ connectionString: target.toString() });
let count = 0;
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const component = [{ toner_code: 'W', toner_name: 'White', percentage: 100 }];
async function save(client, id, mode, years, extra = {}) {
  return client.query('SELECT * FROM public.save_formula_with_years($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
    [id, extra.color || 'c', null, 'v1', '2K', 'Single Stage', extra.notes || '', JSON.stringify(extra.components || component), null, extra.isNew ?? true, mode ?? null, years === undefined ? null : JSON.stringify(years)]);
}
async function check(label, fn) { await fn(); count++; console.log(`PASS ${label}`); }
async function reject(fn, pattern) { await assert.rejects(fn, pattern); }
async function main() {
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await db.connect();
  await db.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
  END $$;`);
  const schema = read('supabase-formula-schema.sql');
  for (const table of ['brands', 'color_variants', 'colors', 'color_variant_map', 'formulas', 'formula_components']) {
    await db.query(schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table} \\([\\s\\S]*?\\n\\);`))[0]);
  }
  await db.query(`ALTER TABLE colors ADD COLUMN car_model text;
    CREATE TABLE formula_types(id text PRIMARY KEY, name text, year_range text);
    CREATE TABLE color_years(color_id text REFERENCES colors(id) ON DELETE CASCADE, year int, year_end int, PRIMARY KEY(color_id,year));
    INSERT INTO brands VALUES ('brand','Brand','JPN');
    INSERT INTO colors(id,make_id,color_code,color_name) VALUES ('c','brand','001','White'), ('gap','brand','002','Grey');
    INSERT INTO color_years VALUES ('c',2018,2025),('gap',2018,2021),('gap',2023,2025);
    INSERT INTO formulas(id,color_id) VALUES ('legacy','c');
    INSERT INTO formula_components(formula_id,toner_code,toner_name,percentage,grams_per_100g) VALUES ('legacy','W','White',100,100);`);
  await db.query(read('supabase-migrations/20260819000000_formula_image_url.sql'));
  await db.query(read('supabase-migrations/20260812000001_save_color_transaction.sql'));
  await db.query('GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role');
  const before = (await db.query("SELECT id,percentage,grams_per_100g FROM formula_components ORDER BY id")).rows;
  const formulaBefore = (await db.query('SELECT to_jsonb(f) row FROM formulas f ORDER BY id')).rows;
  const migration = read('supabase-migrations/20261103000000_formula_years.sql');
  await check('迁移可重复执行，历史年份不回填、组件不变', async () => {
    await db.query(migration); await db.query(migration);
    await db.query(read('supabase/verify-formula-years.sql'));
    assert.deepEqual((await db.query('SELECT id,percentage,grams_per_100g FROM formula_components ORDER BY id')).rows, before);
    assert.deepEqual((await db.query("SELECT to_jsonb(f) - 'year_mode' row FROM formulas f ORDER BY id")).rows, formulaBefore);
    assert.equal((await db.query("SELECT year_mode FROM formulas WHERE id='legacy'")).rows[0].year_mode, 'inherit');
    assert.equal((await db.query('SELECT count(*)::int n FROM formula_years')).rows[0].n, 0);
  });
  await db.query('SET ROLE service_role');
  await check('旧版事务入口保持兼容', async () => {
    await db.query("SELECT * FROM save_formula_with_components('legacy','c',NULL,'v2','2K','Single Stage','old client',$1,NULL,false)", [JSON.stringify(component)]);
    await db.query("SELECT * FROM save_formula_with_components('old-new','c',NULL,'v1','2K','Single Stage','old client',$1,NULL,true)", [JSON.stringify(component)]);
    assert.equal((await db.query("SELECT year_mode FROM formulas WHERE id='old-new'")).rows[0].year_mode, 'inherit');
  });
  await check('保存两个独立范围，重读持久化；允许重叠备选和单年', async () => {
    await save(db, 'A', 'custom', [{year:2018,year_end:2021}]);
    await save(db, 'B', 'custom', [{year:2022,year_end:2025}]);
    await save(db, 'alternative', 'custom', [{year:2021}]);
    assert.equal((await db.query("SELECT year_end FROM formula_years WHERE formula_id='B'")).rows[0].year_end, 2025);
  });
  await check('新建缺失模式、部分字段、空范围和非法区间均拒绝', async () => {
    await reject(() => save(db,'missing'), /必须明确选择/);
    await reject(() => save(db,'partial','inherit'), /格式错误/);
    await reject(() => save(db,'empty','custom',[]), /模式不一致/);
    await reject(() => save(db,'invalid','custom',[{year:2024,year_end:2020}]), /check constraint/);
  });
  await check('旧编辑不清空自定义年份，旧 RPC 也保留', async () => {
    await save(db,'A',undefined,undefined,{isNew:false,notes:'legacy edit'});
    await db.query("SELECT * FROM save_formula_with_components('A','c',NULL,'v3','2K','Single Stage','old',$1,NULL,false)",[JSON.stringify(component)]);
    assert.equal((await db.query("SELECT year FROM formula_years WHERE formula_id='A'")).rows[0].year, 2018);
    assert.equal((await db.query("SELECT year_mode FROM formulas WHERE id='A'")).rows[0].year_mode,'custom');
  });
  await check('范围边界、空档与越界验证；失败不留下半成品', async () => {
    await save(db,'multi','custom',[{year:2018,year_end:2021},{year:2023,year_end:2025}],{color:'gap'});
    await reject(() => save(db,'crossgap','custom',[{year:2021,year_end:2023}],{color:'gap'}), /范围冲突/);
    await reject(() => save(db,'outside','custom',[{year:2026}]), /范围冲突/);
    assert.equal((await db.query("SELECT count(*)::int n FROM formulas WHERE id IN ('crossgap','outside')")).rows[0].n,0);
  });
  await check('组件错误或年份失败，主行、原组件与原年份全部回滚', async () => {
    const state = async () => (await db.query("SELECT to_jsonb(f) f, (SELECT jsonb_agg(c ORDER BY id) FROM formula_components c WHERE formula_id='A') c, (SELECT jsonb_agg(y ORDER BY year) FROM formula_years y WHERE formula_id='A') y FROM formulas f WHERE id='A'")).rows;
    const prior = await state();
    await reject(() => save(db,'A','custom',[{year:2026}],{isNew:false,notes:'must rollback'}), /范围冲突/);
    assert.deepEqual(await state(),prior);
    await reject(() => save(db,'A','custom',[{year:2020}],{isNew:false,components:[{...component[0],density:'bad'}]}), /invalid input/);
    assert.deepEqual(await state(),prior);
  });
  await check('缩小颜色范围列出所有冲突配方，整个颜色事务回滚', async () => {
    await reject(() => db.query("SELECT * FROM save_color_with_components('c','brand','001','changed',ARRAY['solid'],'#fff',NULL,ARRAY[]::text[],$1,false)",[JSON.stringify([{year:2022,year_end:2025}])]), /A/);
    assert.equal((await db.query("SELECT year FROM color_years WHERE color_id='c'")).rows[0].year,2018);
    assert.equal((await db.query("SELECT color_name FROM colors WHERE id='c'")).rows[0].color_name,'White');
  });
  await check('并发配方与颜色保存串行化，不能提交不一致范围', async () => {
    const other = new Client({ connectionString: target.toString() }); await other.connect();
    try {
      await other.query('SET ROLE service_role');
      await db.query('BEGIN');
      await save(db,'concurrent','custom',[{year:2025}]);
      let done = false;
      const pending = other.query("SELECT * FROM save_color_with_components('c','brand','001','White',ARRAY['solid'],'#fff',NULL,ARRAY[]::text[],$1,false)",[JSON.stringify([{year:2018,year_end:2024}])]).then(()=>{done=true;return null},e=>{done=true;return e});
      await new Promise(r=>setTimeout(r,150)); assert.equal(done,false);
      await db.query('COMMIT');
      assert.match((await pending).message,/范围冲突/);
      assert.equal((await db.query("SELECT year_end FROM color_years WHERE color_id='c'")).rows[0].year_end,2025);
    } finally { await db.query('ROLLBACK'); await other.end(); }
  });
  await check('颜色先保存时，等待中的越界配方也不能提交', async () => {
    await db.query("INSERT INTO colors(id,make_id,color_code,color_name) VALUES ('reverse','brand','003','Reverse'); INSERT INTO color_years VALUES ('reverse',2018,2025)");
    const other = new Client({ connectionString: target.toString() }); await other.connect();
    try {
      await other.query('SET ROLE service_role'); await db.query('BEGIN');
      await db.query("SELECT * FROM save_color_with_components('reverse','brand','003','Reverse',ARRAY['solid'],'#fff',NULL,ARRAY[]::text[],$1,false)",[JSON.stringify([{year:2018,year_end:2024}])]);
      let done = false;
      const pending = save(other,'reverse-formula','custom',[{year:2025}],{color:'reverse'}).then(()=>{done=true;return null},e=>{done=true;return e});
      await new Promise(r=>setTimeout(r,150)); assert.equal(done,false);
      await db.query('COMMIT'); assert.match((await pending).message,/范围冲突/);
      assert.equal((await db.query("SELECT count(*)::int n FROM formulas WHERE id='reverse-formula'")).rows[0].n,0);
    } finally { await db.query('ROLLBACK'); await other.end(); }
  });
  await check('切回沿用模式清理自定义条目；旧入口换色也受范围约束', async () => {
    await save(db,'switch','custom',[{year:2025}]);
    await save(db,'switch','inherit',[],{isNew:false});
    assert.equal((await db.query("SELECT count(*)::int n FROM formula_years WHERE formula_id='switch'")).rows[0].n,0);
    await reject(() => db.query("SELECT * FROM save_formula_with_components('B','reverse',NULL,'v1','2K','Single Stage','', $1,NULL,false)",[JSON.stringify(component)]), /范围冲突/);
    assert.equal((await db.query("SELECT color_id FROM formulas WHERE id='B'")).rows[0].color_id,'c');
  });
  await db.query('RESET ROLE');
  await check('anon/authenticated 禁止写 RPC，登录用户可读年份', async () => {
    const privileges = (await db.query("SELECT bool_or(has_function_privilege('anon',oid,'EXECUTE') OR has_function_privilege('authenticated',oid,'EXECUTE')) allowed FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('save_formula_with_years','save_formula_with_components','_save_formula_components_legacy','check_color_formula_years','enforce_formula_years')")).rows;
    assert.equal(privileges[0].allowed,false);
    await db.query('SET ROLE authenticated');
    assert.ok((await db.query('SELECT * FROM formula_years')).rows.length > 0);
    await reject(() => save(db,'forbidden','inherit',[]), /permission denied/);
    await reject(() => db.query("INSERT INTO formula_years VALUES ('A',2020,NULL)"), /permission denied/);
    await db.query('RESET ROLE'); await db.query('SET ROLE anon');
    await reject(() => save(db,'forbidden','inherit',[]), /permission denied/);
    await reject(() => db.query("SELECT * FROM save_formula_with_components('X','c',NULL,'v1','2K','Single Stage','', '[]',NULL,true)"), /permission denied/);
    await db.query('RESET ROLE');
  });
  console.log(`PostgreSQL integration: ${count} checks passed`);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
  await db.end().catch(()=>{});
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`).catch(()=>{});
  await admin.end().catch(()=>{});
});

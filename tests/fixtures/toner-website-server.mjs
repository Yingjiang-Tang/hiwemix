// 使用真实本机 PostgreSQL，HTTP 层仅模拟 Supabase Auth 与 PostgREST 协议。
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { openTonerDatabase } from './toner-postgres.mjs';

const database = await openTonerDatabase();
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'audit@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
let role = 'admin';
function send(res, body, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' });
  res.end(JSON.stringify(body));
}
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, {});
    const url = new URL(req.url, 'http://127.0.0.1:54330');
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    if (url.pathname === '/__close' && url.searchParams.get('run') === process.env.TONER_TEST_RUN_ID) {
      await database.close(); return send(res, {});
    }
    if (url.pathname === '/__fixture') {
      role = body.role ?? 'admin';
      if (body.toners) {
        await database.db.query('TRUNCATE toners');
        for (const row of body.toners) await database.db.query('INSERT INTO toners(code,trade_name,name_zh,category,hex,website_url) VALUES($1,$2,$3,$4,$5,$6)', [row.code, row.trade_name, row.name_zh, row.category, row.hex, row.website_url ?? null]);
      }
      return send(res, {});
    }
    if (url.pathname === '/auth/v1/user') return send(res, user);
    if (url.pathname.startsWith('/auth/')) return send(res, {});
    if (url.pathname === '/rest/v1/profiles') return send(res, { role });
    if (url.pathname === '/rest/v1/analytics_events') return send(res, []);
    if (url.pathname === '/rest/v1/toners') {
      let rows;
      if (req.method === 'POST') {
        const columns = Object.keys(body);
        if (!columns.every(column => ['code', 'trade_name', 'name_zh', 'category', 'hex', 'website_url'].includes(column))) throw new Error('Unexpected toner column');
        const update = columns.filter(column => column !== 'code').map(column => `${column}=EXCLUDED.${column}`).join(',');
        rows = (await database.db.query(`INSERT INTO toners(${columns.join(',')}) VALUES(${columns.map((_, index) => `$${index + 1}`).join(',')}) ON CONFLICT(code) DO UPDATE SET ${update} RETURNING *`, columns.map(column => body[column]))).rows;
      } else {
        rows = (await database.db.query('SELECT * FROM toners ORDER BY code')).rows;
      }
      return send(res, String(req.headers.accept).includes('vnd.pgrst.object') ? rows[0] ?? null : rows);
    }
    send(res, []);
  } catch (error) {
    send(res, { code: error.code, message: error.message }, 400);
  }
});
server.listen(54330, '127.0.0.1', () => {
  const child = spawn(process.execPath, [path.resolve('node_modules/next/dist/bin/next'), 'dev', '--port', '3006'], {
    cwd: process.cwd(), windowsHide: true, stdio: 'inherit',
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54330', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-publishable', SUPABASE_SECRET_KEY: 'test-service', NEXT_PUBLIC_SITE_URL: 'http://localhost:3006' },
  });
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    child.kill();
    server.closeAllConnections(); server.close();
    await database.close();
  }
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  child.on('exit', async (code) => { await stop(); process.exit(code ?? 0); });
});

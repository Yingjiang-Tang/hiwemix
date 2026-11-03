// 浏览器交互专用本机后端；SQL 约束另由 test:db-years 在真实 PostgreSQL 中验证。
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { openBrowserDatabase, seedBrowserDatabase, saveBrowserFormula } from './formula-year-postgres.mjs';

const postgres = process.env.TEST_DATABASE_URL ? await openBrowserDatabase() : null;

const user = { id: '11111111-1111-4111-8111-111111111111', email: 'audit@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const initial = {
  regions: [{ code: 'JPN' }], brands: [{ id: 'toyota', name: 'Toyota', region: 'JPN' }],
  formula_types: [{ id: '1', name: 'Single Stage', year_range: '1990-1991' }],
  colors: [{ id: 'toyota_A', make_id: 'toyota', color_code: 'A', color_name: 'Audit Color A', color_type: ['solid'], hex_preview: '#ccc', color_variant_map: [{ color_variants: { id: '1', name: 'Single Stage', year_range: '1990-1991' } }] }],
  color_years: [], formulas: [], user_favorites: [], settings: [],
  toners: [{ code: '2K-2001', trade_name: 'White', name_zh: '白色', category: '2K_BASECOAT', hex: '#ffffff' }],
};
let db = structuredClone(initial);
function send(res, body, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' });
  res.end(JSON.stringify(body));
}
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, {});
  const url = new URL(req.url, 'http://127.0.0.1:54329');
  if (url.pathname === '/__postgres-close' && url.searchParams.get('run') === process.env.FORMULA_YEAR_TEST_RUN_ID) {
    await postgres?.end(); return send(res, {});
  }
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  let body; try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { body = {}; }
  if (url.pathname === '/__reset') { db = structuredClone(initial); return send(res, {}); }
  if (url.pathname === '/__fixture') {
    Object.assign(db, body);
    if (postgres) await seedBrowserDatabase(postgres, db);
    return send(res, {});
  }
  if (url.pathname === '/auth/v1/user') return send(res, user);
  if (url.pathname.startsWith('/auth/')) return send(res, {});
  if (url.pathname === '/rest/v1/profiles') return send(res, { role: 'admin' });
  if (url.pathname === '/rest/v1/rpc/save_formula_with_years') {
    if (postgres) {
      try { await saveBrowserFormula(postgres, body); return send(res, []); }
      catch (error) { return send(res, { code: error.code, message: error.message }, 400); }
    }
    const old = db.formulas.find((formula) => formula.id === body.p_id);
    if (old && body.p_is_new) return send(res, { code: '23505', message: 'exists' }, 409);
    const row = { ...old, id: body.p_id, color_id: body.p_color_id, variant_id: body.p_variant_id, version: body.p_version, paint_system: body.p_paint_system, formula_type: body.p_formula_type, notes: body.p_notes, image_url: body.p_image_url, formula_components: body.p_components, year_mode: body.p_year_mode ?? old?.year_mode ?? 'inherit', formula_years: body.p_years ?? old?.formula_years ?? [], updated_at: '2026-11-03T00:00:00Z' };
    db.formulas = db.formulas.filter((formula) => formula.id !== row.id).concat(row);
    return send(res, [row]);
  }
  const table = url.pathname.split('/').pop();
  if (postgres && table === 'formulas') {
    const { rows } = await postgres.query(`SELECT f.*, COALESCE((SELECT jsonb_agg(c ORDER BY id) FROM formula_components c WHERE c.formula_id=f.id),'[]') AS formula_components, COALESCE((SELECT jsonb_agg(y ORDER BY year) FROM formula_years y WHERE y.formula_id=f.id),'[]') AS formula_years FROM formulas f`);
    db.formulas = rows;
  }
  if (postgres && table === 'color_years') db.color_years = (await postgres.query('SELECT * FROM color_years ORDER BY year')).rows;
  if (table === 'analytics_events') return send(res, []);
  if (!db[table]) return send(res, { message: `Unknown test endpoint ${table}` }, 404);
  let rows = db[table].filter((row) => [...url.searchParams].every(([key, value]) => !value.startsWith('eq.') || String(row[key]) === value.slice(3)));
  if (req.method === 'POST') { db[table].push(body); rows = [body]; }
  const order = url.searchParams.get('order');
  if (order) { const [key, direction] = order.split('.'); rows.sort((a, b) => (a[key] > b[key] ? 1 : -1) * (direction === 'desc' ? -1 : 1)); }
  send(res, String(req.headers.accept).includes('vnd.pgrst.object') ? rows[0] ?? null : rows);
});
server.listen(54329, '127.0.0.1', () => {
  const child = spawn(process.execPath, [path.resolve('node_modules/next/dist/bin/next'), 'dev', '--port', '3005'], {
    cwd: process.cwd(), windowsHide: true, stdio: 'inherit',
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-publishable', SUPABASE_SECRET_KEY: 'test-service', NEXT_PUBLIC_SITE_URL: 'http://localhost:3005' },
  });
  function stop() { child.kill(); server.close(); }
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  child.on('exit', (code) => { server.close(); process.exit(code ?? 0); });
});

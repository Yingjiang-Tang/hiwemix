import { Client } from 'pg';
import fs from 'node:fs';
import assert from 'node:assert/strict';

export function browserDatabaseName() {
  const id = process.env.FORMULA_YEAR_TEST_RUN_ID;
  assert.match(id ?? '', /^\d+$/);
  return `hiwe_year_browser_${id}`;
}

export function localConnection() {
  const url = new URL(process.env.TEST_DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), '仅允许本机隔离 PostgreSQL');
  return url;
}

export async function openBrowserDatabase() {
  const url = localConnection();
  const admin = new Client({ connectionString: url.toString() }); await admin.connect();
  const name = browserDatabaseName(); await admin.query(`CREATE DATABASE ${name}`); await admin.end();
  url.pathname = `/${name}`;
  const db = new Client({ connectionString: url.toString() }); await db.connect();
  await db.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
  END $$;`);
  const schema = fs.readFileSync('supabase-formula-schema.sql', 'utf8');
  for (const table of ['brands', 'color_variants', 'colors', 'color_variant_map', 'formulas', 'formula_components']) {
    await db.query(schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table} \\([\\s\\S]*?\\n\\);`))[0]);
  }
  await db.query(`ALTER TABLE colors ADD COLUMN car_model text;
    CREATE TABLE formula_types(id text PRIMARY KEY, name text, year_range text);
    CREATE TABLE color_years(color_id text REFERENCES colors(id) ON DELETE CASCADE, year int, year_end int, PRIMARY KEY(color_id,year));`);
  for (const file of ['20260819000000_formula_image_url.sql', '20260812000001_save_color_transaction.sql', '20261103000000_formula_years.sql']) {
    await db.query(fs.readFileSync(`supabase-migrations/${file}`, 'utf8'));
  }
  return db;
}

export async function saveBrowserFormula(db, body) {
  await db.query('SELECT * FROM save_formula_with_years($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [body.p_id, body.p_color_id, body.p_variant_id, body.p_version, body.p_paint_system, body.p_formula_type, body.p_notes, JSON.stringify(body.p_components), body.p_image_url ?? null, body.p_is_new, body.p_year_mode ?? null, body.p_years === null ? null : JSON.stringify(body.p_years)]);
}

export async function seedBrowserDatabase(db, fixture) {
  await db.query('BEGIN');
  try {
    await db.query('TRUNCATE brands CASCADE; TRUNCATE color_variants CASCADE');
    for (const brand of fixture.brands) await db.query('INSERT INTO brands VALUES ($1,$2,$3)', [brand.id, brand.name, brand.region]);
    for (const variant of fixture.formula_types) await db.query('INSERT INTO color_variants VALUES ($1,$2,$3)', [variant.id, variant.name, variant.year_range]);
    for (const color of fixture.colors) await db.query('INSERT INTO colors(id,make_id,color_code,color_name,color_type,hex_preview) VALUES ($1,$2,$3,$4,$5,$6)', [color.id,color.make_id,color.color_code,color.color_name,color.color_type,color.hex_preview]);
    for (const entry of fixture.color_years) await db.query('INSERT INTO color_years VALUES ($1,$2,$3)', [entry.color_id,entry.year,entry.year_end ?? null]);
    for (const formula of fixture.formulas) await saveBrowserFormula(db, { p_id: formula.id, p_color_id: formula.color_id, p_variant_id: formula.variant_id, p_version: formula.version, p_paint_system: formula.paint_system, p_formula_type: formula.formula_type, p_notes: formula.notes, p_components: formula.formula_components, p_is_new: true, p_year_mode: formula.year_mode, p_years: formula.formula_years });
    await db.query('COMMIT');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
}

export default async function cleanup() {
  if (!process.env.TEST_DATABASE_URL) return;
  await fetch(`http://127.0.0.1:54329/__postgres-close?run=${process.env.FORMULA_YEAR_TEST_RUN_ID}`, { signal: AbortSignal.timeout(5000) }).catch(() => {});
  const admin = new Client({ connectionString: localConnection().toString() }); await admin.connect();
  try { await admin.query(`DROP DATABASE IF EXISTS ${browserDatabaseName()} WITH (FORCE)`); }
  finally { await admin.end(); }
}

// ============================================================
// 色母数据访问层 — 读操作用 session 感知的 SSR 客户端（RLS 按登录用户生效），写操作 getSupabaseAdmin()
// ============================================================
import { createClient } from "./supabase/server";
import { getSupabaseAdmin } from "./supabase-server";
import type { Toner } from "@/types";

// ====== 读（SSR 客户端，受 RLS SELECT 策略保护：仅已登录用户） ======

export async function getToners(): Promise<Toner[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("toners")
    .select("*")
    .order("code", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapTonerRow);
}

// ====== 写（getSupabaseAdmin()，BYPASSRLS，仅服务端 API 调用） ======

// 色母目录变更后调用，使 db-formula 侧的内存缓存失效（见 db-formula.ts getTonerMap）
export function invalidateTonerCache(): void {
  const g = globalThis as Record<string, unknown>;
  if (typeof g.__TONER_CACHE_VERSION === "number") {
    g.__TONER_CACHE_VERSION = (g.__TONER_CACHE_VERSION as number) + 1;
  } else {
    // 首次变更（缓存版本号尚未初始化）：置为 1，保证与 getTonerMap 的初始 -1 不同
    g.__TONER_CACHE_VERSION = 1;
  }
}

export async function saveToner(toner: Toner): Promise<Toner> {
  const row = toTonerRow(toner);
  const { data, error } = await getSupabaseAdmin()
    .from("toners")
    .upsert(row)
    .select()
    .single();
  if (error) throw error;
  invalidateTonerCache();
  return mapTonerRow(data as Record<string, unknown>);
}

export async function deleteToner(code: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("toners").delete().eq("code", code);
  if (error) throw error;
  invalidateTonerCache();
}

/** 批量种子数据 — 首次导入使用（幂等：ON CONFLICT DO NOTHING 需在 SQL 中配合） */
export async function seedToners(toners: Toner[]): Promise<void> {
  const rows = toners.map(toTonerRow);
  const { error } = await getSupabaseAdmin().from("toners").upsert(rows, {
    onConflict: "code",
    ignoreDuplicates: true,
  });
  if (error) throw error;
}

// ====== 内部映射（snake_case → camelCase） ======

function mapTonerRow(row: Record<string, unknown>): Toner {
  const t: Toner = {
    code: row.code as string,
    tradeName: row.trade_name as string,
    nameZh: row.name_zh as string,
    category: row.category as Toner["category"],
    hex: (row.hex as string) ?? "#FFFFFF",
  };
  if (row.rgb_r != null) {
    t.rgb_r = Number(row.rgb_r);
    t.rgb_g = Number(row.rgb_g);
    t.rgb_b = Number(row.rgb_b);
  }
  return t;
}

// 注意：toners 表当前不包含 rgb_r/g/b 列（仅 code/trade_name/name_zh/category/hex）
// RGB 数据由前端 hex 值和色母静态数据派生，无需持久化到数据库
function toTonerRow(toner: Toner): Record<string, unknown> {
  return {
    code: toner.code,
    trade_name: toner.tradeName,
    name_zh: toner.nameZh,
    category: toner.category,
    hex: toner.hex,
  };
}

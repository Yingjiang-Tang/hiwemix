import { getSupabaseAdmin } from "./supabase-server";

// ============================================================
// 行为分析（轻量埋点）
// 事件类型：page_view / search / formula_view / color_view
// 只记录匿名 visitor_id，不关联账号身份（规避 GDPR 个人数据采集）
// ============================================================

export type AnalyticsEventType =
  | "page_view"
  | "search"
  | "formula_view"
  | "color_view";

export interface AnalyticsEventInput {
  visitor_id: string;
  event_type: AnalyticsEventType;
  event_data: Record<string, string | number | undefined>;
  lang: string;
}

export interface AnalyticsEventRow extends AnalyticsEventInput {
  id: number;
  created_at: string;
}

/** 写入一条事件（service_role 插入，前端无法直接写表） */
export async function insertAnalyticsEvent(input: AnalyticsEventInput): Promise<boolean> {
  // 净化：event_data 可能含空值，过滤掉再存
  const data: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(input.event_data)) {
    if (v !== undefined && v !== "" && v !== null) data[k] = v;
  }
  const { error } = await getSupabaseAdmin()
    .from("analytics_events")
    .insert({
      visitor_id: input.visitor_id,
      event_type: input.event_type,
      event_data: data,
      lang: input.lang || "en",
    });
  return !error;
}

// ============================================================
// Admin 统计查询（聚合，供数据分析页）
// ============================================================

/** 最近 N 天的每日访问量（page_view 数量按天分组） */
export async function getDailyPageViews(days: number): Promise<{ date: string; count: number }[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("analytics_events")
    .select("created_at")
    .eq("event_type", "page_view")
    .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
  if (error) return [];

  // 按本地日期聚合（服务端时区），填充缺失日期为 0
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const d = new Date(row.created_at as string);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const result: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    result.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return result;
}

/** 热门搜索（按事件数据中的关键词聚合，Top N；限定最近 days 天，避免只取最近 5000 条漏掉历史热词） */
export async function getTopSearches(limit = 20, days = 14): Promise<{ label: string; count: number }[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("analytics_events")
    .select("event_data")
    .eq("event_type", "search")
    .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return [];

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const d = (row.event_data as Record<string, unknown>) ?? {};
    const parts: string[] = [];
    if (d.make) parts.push(String(d.make));
    if (d.code) parts.push(String(d.code));
    if (d.name) parts.push(String(d.name));
    if (d.year) parts.push(String(d.year));
    const label = parts.join(" · ") || "(empty search)";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** 热门查看的配方（按 color 维度聚合，Top N；限定最近 days 天） */
export async function getTopFormulaViews(limit = 20, days = 14): Promise<{ label: string; count: number }[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("analytics_events")
    .select("event_data")
    .eq("event_type", "formula_view")
    .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return [];

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const d = (row.event_data as Record<string, unknown>) ?? {};
    const parts: string[] = [];
    if (d.make) parts.push(String(d.make));
    if (d.code) parts.push(String(d.code));
    if (d.name) parts.push(String(d.name));
    const label = parts.join(" · ") || "(unknown)";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** 独立访客数（近 N 天，按 visitor_id 去重） */
export async function getUniqueVisitors(days: number): Promise<number> {
  const { data, error } = await getSupabaseAdmin()
    .from("analytics_events")
    .select("visitor_id")
    .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
  if (error) return 0;
  return new Set((data ?? []).map((r) => r.visitor_id)).size;
}

/** 各事件类型总数（近 N 天） */
export async function getEventTypeCounts(days: number): Promise<Record<string, number>> {
  const { data, error } = await getSupabaseAdmin()
    .from("analytics_events")
    .select("event_type")
    .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
  if (error) return {};
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const t = row.event_type as string;
    counts[t] = (counts[t] ?? 0) + 1;
  }
  return counts;
}

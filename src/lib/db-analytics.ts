import { getSupabaseAdmin } from "./supabase-server";
import { summarizeAnalyticsEvents } from "./analytics-summary";
import type { AnalyticsEventRecord, AnalyticsEventType, AnalyticsSummary } from "@/types";

// ============================================================
// 行为分析（轻量埋点）
// 事件类型：page_view / search / formula_view / color_view / formula_action
// 只记录匿名 visitor_id，不关联账号身份（规避 GDPR 个人数据采集）
// ============================================================

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

/** 按 UTC 自然日统计，所有卡片使用同一时间窗口和完整事件集。 */
export async function getAnalyticsSummary(days: number, now = new Date()): Promise<AnalyticsSummary> {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const events: AnalyticsEventRecord[] = [];
  let afterId: number | undefined;
  // 按主键游标分页；避免 Supabase 单次最多 1000 行导致统计被截断。
  while (true) {
    let query = getSupabaseAdmin().from("analytics_events")
      .select("id, visitor_id, event_type, event_data, created_at")
      .gte("created_at", start.toISOString()).lte("created_at", now.toISOString())
      .order("id", { ascending: true }).limit(500);
    if (afterId !== undefined) query = query.gt("id", afterId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) break;
    events.push(...data as AnalyticsEventRecord[]);
    afterId = data[data.length - 1].id as number;
  }
  const dailyCounts = new Map<string, number>();
  const eventTypeCounts: Record<string, number> = {};
  for (const event of events) {
    eventTypeCounts[event.event_type] = (eventTypeCounts[event.event_type] ?? 0) + 1;
    if (event.event_type === "page_view") {
      const key = new Date(event.created_at).toISOString().slice(0, 10);
      dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
    }
  }
  const dailyViews = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: dailyCounts.get(key) ?? 0 };
  });
  function rank(type: AnalyticsEventType, keys: string[], empty: string) {
    const counts = new Map<string, number>();
    for (const event of events) {
      if (event.event_type !== type) continue;
      const label = keys.map((key) => event.event_data?.[key]).filter((v) => v !== undefined && v !== "").join(" · ") || empty;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 20);
  }
  return {
    dailyViews,
    uniqueVisitors: new Set(events.map((event) => event.visitor_id)).size,
    eventTypeCounts,
    topSearches: rank("search", ["make", "code", "name", "year"], "(empty search)"),
    topFormulaViews: rank("formula_view", ["make", "code", "name"], "(unknown)"),
    insights: summarizeAnalyticsEvents(events),
  };
}

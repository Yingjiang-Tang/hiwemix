import type { AnalyticsEventRecord, AnalyticsInsights, FormulaActionType } from "@/types";

function roundPercent(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function searchLabel(data: AnalyticsEventRecord["event_data"]): string {
  const parts = [data.make, data.code, data.name, data.year]
    .filter((value) => value !== undefined && value !== "")
    .map(String);
  return parts.join(" · ") || "(empty search)";
}

/** 将匿名埋点事件聚合为搜索质量与配方操作指标。 */
export function summarizeAnalyticsEvents(events: AnalyticsEventRecord[]): AnalyticsInsights {
  const searches = events.filter((event) => event.event_type === "search");
  const measuredSearches = searches.filter((event) => typeof event.event_data.result_count === "number");
  const successfulSearches = measuredSearches.filter((event) => Number(event.event_data.result_count) > 0);
  const zeroResultSearches = measuredSearches.filter((event) => Number(event.event_data.result_count) === 0);

  const zeroResultCounts = new Map<string, number>();
  for (const event of zeroResultSearches) {
    const label = searchLabel(event.event_data);
    zeroResultCounts.set(label, (zeroResultCounts.get(label) ?? 0) + 1);
  }

  const firstSearchAt = new Map<string, number>();
  for (const event of searches) {
    const time = new Date(event.created_at).getTime();
    const previous = firstSearchAt.get(event.visitor_id);
    if (previous === undefined || time < previous) firstSearchAt.set(event.visitor_id, time);
  }

  const convertedVisitors = new Set<string>();
  for (const event of events) {
    if (event.event_type !== "formula_view") continue;
    const searchedAt = firstSearchAt.get(event.visitor_id);
    if (searchedAt !== undefined && new Date(event.created_at).getTime() > searchedAt) {
      convertedVisitors.add(event.visitor_id);
    }
  }

  const actionCounts: Record<FormulaActionType, number> = {
    copy: 0,
    print: 0,
    favorite_add: 0,
    favorite_remove: 0,
  };
  for (const event of events) {
    if (event.event_type !== "formula_action") continue;
    const action = event.event_data.action;
    if (typeof action === "string" && action in actionCounts) {
      actionCounts[action as FormulaActionType] += 1;
    }
  }

  return {
    searches: {
      total: searches.length,
      measured: measuredSearches.length,
      successful: successfulSearches.length,
      zeroResult: zeroResultSearches.length,
      successRate: roundPercent(successfulSearches.length, measuredSearches.length),
    },
    conversion: {
      searchVisitors: firstSearchAt.size,
      convertedVisitors: convertedVisitors.size,
      rate: roundPercent(convertedVisitors.size, firstSearchAt.size),
    },
    actions: {
      copy: actionCounts.copy,
      print: actionCounts.print,
      favoriteAdd: actionCounts.favorite_add,
      favoriteRemove: actionCounts.favorite_remove,
    },
    topZeroResultSearches: [...zeroResultCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 20),
  };
}

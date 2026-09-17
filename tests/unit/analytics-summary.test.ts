import { describe, expect, test } from "vitest";
import { summarizeAnalyticsEvents } from "@/lib/analytics-summary";
import type { AnalyticsEventRecord } from "@/types";

const events: AnalyticsEventRecord[] = [
  {
    visitor_id: "visitor-a",
    event_type: "search",
    event_data: { make: "Toyota", code: "UNKNOWN", result_count: 0 },
    created_at: "2026-09-17T08:00:00Z",
  },
  {
    visitor_id: "visitor-b",
    event_type: "search",
    event_data: { make: "BMW", code: "B39", result_count: 3 },
    created_at: "2026-09-17T08:01:00Z",
  },
  {
    visitor_id: "visitor-b",
    event_type: "formula_view",
    event_data: { formula_id: "bmw_b39_v1" },
    created_at: "2026-09-17T08:02:00Z",
  },
  {
    visitor_id: "visitor-c",
    event_type: "formula_view",
    event_data: { formula_id: "toyota_040_v1" },
    created_at: "2026-09-17T08:03:00Z",
  },
  {
    visitor_id: "visitor-c",
    event_type: "search",
    event_data: { code: "040", result_count: 2 },
    created_at: "2026-09-17T08:04:00Z",
  },
  {
    visitor_id: "visitor-legacy",
    event_type: "search",
    event_data: { code: "OLD" },
    created_at: "2026-09-17T08:05:00Z",
  },
  {
    visitor_id: "visitor-b",
    event_type: "formula_action",
    event_data: { action: "copy" },
    created_at: "2026-09-17T08:06:00Z",
  },
  {
    visitor_id: "visitor-b",
    event_type: "formula_action",
    event_data: { action: "print" },
    created_at: "2026-09-17T08:07:00Z",
  },
  {
    visitor_id: "visitor-b",
    event_type: "formula_action",
    event_data: { action: "favorite_add" },
    created_at: "2026-09-17T08:08:00Z",
  },
];

describe("summarizeAnalyticsEvents", () => {
  test("只用带结果数量的新搜索事件计算搜索成功率", () => {
    const summary = summarizeAnalyticsEvents(events);

    expect(summary.searches).toEqual({
      total: 4,
      measured: 3,
      successful: 2,
      zeroResult: 1,
      successRate: 66.7,
    });
    expect(summary.topZeroResultSearches).toEqual([
      { label: "Toyota · UNKNOWN", count: 1 },
    ]);
  });

  test("只有搜索之后查看配方的访客计入转化", () => {
    const summary = summarizeAnalyticsEvents(events);

    expect(summary.conversion).toEqual({
      searchVisitors: 4,
      convertedVisitors: 1,
      rate: 25,
    });
  });

  test("汇总成功执行的配方操作", () => {
    const summary = summarizeAnalyticsEvents(events);

    expect(summary.actions).toEqual({
      copy: 1,
      print: 1,
      favoriteAdd: 1,
      favoriteRemove: 0,
    });
  });
});

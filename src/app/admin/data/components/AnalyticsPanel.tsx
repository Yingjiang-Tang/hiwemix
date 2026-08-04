"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { RefreshCw, BarChart3, Search, Eye, Users } from "lucide-react";

// ============================================================
// Admin 数据分析面板
// 聚合统计来自 analytics_events 表（轻量埋点，不含个人身份）
// ============================================================

interface DailyCount {
  date: string;
  count: number;
}

interface RankItem {
  label: string;
  count: number;
}

interface AnalyticsSummary {
  dailyViews: DailyCount[];
  uniqueVisitors: number;
  eventTypeCounts: Record<string, number>;
  topSearches: RankItem[];
  topFormulaViews: RankItem[];
}

const DAYS = 14;

function formatDate(d: string): string {
  const [, m, day] = d.split("-");
  return `${m}/${day}`;
}

function StatCard({ icon: Icon, label, value, hint }: { icon: typeof Users; label: string; value: string | number; hint?: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-5 pb-[30px]">
        <div className="-mt-[10px] flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          <span className="text-[15px] font-medium">{label}</span>
        </div>
        <p className="mt-2 text-left text-[29px] font-semibold text-foreground">{value}</p>
        {hint && <p className="mt-1 text-left text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/analytics?days=14");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as AnalyticsSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const maxDaily = Math.max(1, ...(data?.dailyViews ?? []).map((d) => d.count));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">数据分析</h2>
        <Button variant="outline" size="sm" onClick={() => void fetchData()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          加载失败：{error}（请确认 analytics_events 表已创建，且 ANALYTICS 数据已开始采集）
        </p>
      )}

      {/* 概览统计 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={Users} label="独立访客（14天）" value={data?.uniqueVisitors ?? 0} hint="按 visitor_id 去重" />
        <StatCard icon={Eye} label="页面访问（14天）" value={data?.eventTypeCounts?.page_view ?? 0} />
        <StatCard icon={Search} label="搜索次数（14天）" value={data?.eventTypeCounts?.search ?? 0} />
      </div>

      {/* 每日访问柱状图（纯 CSS 柱状，无需图表库） */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15.5px] font-medium">
            <BarChart3 className="size-4" />
            最近 {DAYS} 天页面访问
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="flex h-[158px] items-end gap-0.5">
              {(data?.dailyViews ?? []).map((d) => {
                // 固定像素高度，避免 flex + 百分比高度在部分容器下解析为 0（柱状不显示）
                const barPx = Math.max(2, Math.round((d.count / maxDaily) * 114));
                return (
                  <div key={d.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[13px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      {d.count}
                    </span>
                    <div
                      className="w-1/3 rounded-t bg-primary/80 transition-colors hover:bg-primary"
                      style={{ height: `${barPx}px` }}
                      title={`${d.date}: ${d.count}`}
                    />
                    <span className="w-full text-center text-[13px] whitespace-nowrap text-muted-foreground">{formatDate(d.date)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 热门搜索 / 热门配方 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15.5px] font-medium">
              <Search className="size-4" />
              热门搜索
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (data?.topSearches?.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">暂无数据</p>
            ) : (
              <ol className="flex flex-col gap-1.5">
                {(data?.topSearches ?? []).map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                    <span className="min-w-0 flex-1 truncate">
                      <span className="mr-2 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                      {s.label}
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{s.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15.5px] font-medium">
              <Eye className="size-4" />
              热门查看的配方
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (data?.topFormulaViews?.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">暂无数据</p>
            ) : (
              <ol className="flex flex-col gap-1.5">
                {(data?.topFormulaViews ?? []).map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                    <span className="min-w-0 flex-1 truncate">
                      <span className="mr-2 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                      {s.label}
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{s.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

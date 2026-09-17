"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  ClipboardList,
  Eye,
  MousePointerClick,
  RefreshCw,
  Search,
  SearchCheck,
  SearchX,
  Users,
} from "lucide-react";
import type { AnalyticsRankItem, AnalyticsSummary } from "@/types";

const DAY_OPTIONS = [7, 14, 30, 90] as const;

function formatDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${month}/${day}`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  hint?: string;
}) {
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

function RankedListCard({
  icon: Icon,
  title,
  items,
  loading,
}: {
  icon: typeof Search;
  title: string;
  items: AnalyticsRankItem[];
  loading: boolean;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15.5px] font-medium">
          <Icon className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">暂无数据</p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {items.map((item, index) => (
              <li key={item.label} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                <span className="min-w-0 flex-1 truncate">
                  <span className="mr-2 text-xs font-semibold text-muted-foreground">{index + 1}</span>
                  {item.label}
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.count}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPanel() {
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/analytics?days=${days}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData((await response.json()) as AnalyticsSummary);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const maxDaily = Math.max(1, ...(data?.dailyViews ?? []).map((item) => item.count));
  const insights = data?.insights;
  const actionItems: AnalyticsRankItem[] = [
    { label: "复制配方", count: insights?.actions.copy ?? 0 },
    { label: "打印配方", count: insights?.actions.print ?? 0 },
    { label: "添加收藏", count: insights?.actions.favoriteAdd ?? 0 },
    { label: "取消收藏", count: insights?.actions.favoriteRemove ?? 0 },
  ];
  const totalActions = actionItems.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">分析中心</h2>
          <p className="mt-1 text-sm text-muted-foreground">网站使用、搜索质量与调漆运营指标</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {DAY_OPTIONS.map((option) => (
            <Button
              key={option}
              variant={days === option ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(option)}
              className="max-md:h-11"
            >
              {option} 天
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => void fetchData()} disabled={loading} className="max-md:h-11">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          加载失败：{error}（请确认 analytics_events 表已创建，且分析数据已开始采集）
        </p>
      )}

      <Tabs defaultValue="usage">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-lg p-1 max-md:grid max-md:grid-cols-3">
          <TabsTrigger value="usage" className="max-md:min-h-11">使用分析</TabsTrigger>
          <TabsTrigger value="search-quality" className="max-md:min-h-11">搜索质量</TabsTrigger>
          <TabsTrigger value="mixing" className="max-md:min-h-11">调漆运营</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard icon={Users} label={`独立访客（${days}天）`} value={data?.uniqueVisitors ?? 0} hint="按匿名 visitor_id 去重" />
            <StatCard icon={Eye} label={`页面访问（${days}天）`} value={data?.eventTypeCounts?.page_view ?? 0} />
            <StatCard icon={Search} label={`搜索次数（${days}天）`} value={data?.eventTypeCounts?.search ?? 0} />
          </div>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15.5px] font-medium">
                <BarChart3 className="size-4" />
                最近 {days} 天页面访问
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div
                    className="flex h-[158px] items-end gap-0.5"
                    style={{ minWidth: `${Math.max(560, days * 28)}px` }}
                  >
                  {(data?.dailyViews ?? []).map((item) => {
                    const barPx = Math.max(2, Math.round((item.count / maxDaily) * 114));
                    return (
                      <div key={item.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
                        <span className="text-[13px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                          {item.count}
                        </span>
                        <div
                          className="w-1/3 rounded-t bg-primary/80 transition-colors hover:bg-primary"
                          style={{ height: `${barPx}px` }}
                          title={`${item.date}: ${item.count}`}
                        />
                        <span className="w-full text-center text-[13px] whitespace-nowrap text-muted-foreground">{formatDate(item.date)}</span>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RankedListCard icon={Search} title="热门搜索" items={data?.topSearches ?? []} loading={loading} />
            <RankedListCard icon={Eye} title="热门查看的配方" items={data?.topFormulaViews ?? []} loading={loading} />
          </div>
        </TabsContent>

        <TabsContent value="search-quality" className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              icon={SearchCheck}
              label="搜索成功率"
              value={`${insights?.searches.successRate ?? 0}%`}
              hint={`已覆盖 ${insights?.searches.measured ?? 0}/${insights?.searches.total ?? 0} 次搜索`}
            />
            <StatCard icon={SearchX} label="零结果搜索" value={insights?.searches.zeroResult ?? 0} />
            <StatCard
              icon={MousePointerClick}
              label="搜索访客转化率"
              value={`${insights?.conversion.rate ?? 0}%`}
              hint={`${insights?.conversion.convertedVisitors ?? 0}/${insights?.conversion.searchVisitors ?? 0} 位搜索访客随后查看配方`}
            />
            <StatCard icon={ClipboardList} label="配方操作次数" value={totalActions} hint="复制、打印和收藏操作" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RankedListCard icon={SearchX} title="热门无结果搜索" items={insights?.topZeroResultSearches ?? []} loading={loading} />
            <RankedListCard icon={MousePointerClick} title="配方操作分布" items={actionItems} loading={loading} />
          </div>
        </TabsContent>

        <TabsContent value="mixing" className="mt-4">
          <Card className="border-dashed border-border bg-card">
            <CardContent className="flex flex-col items-center px-6 py-16 text-center">
              <ClipboardList className="size-10 text-muted-foreground" />
              <h3 className="mt-4 font-heading text-lg font-semibold">调漆运营数据待接入</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                建立调漆任务与称重记录后，这里将展示任务量、完成率、平均调漆时间、实际重量、修正次数和色母消耗。当前不使用模拟数据填充业务指标。
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-left text-sm text-muted-foreground sm:grid-cols-4">
                <span className="rounded-lg border border-border px-3 py-2">任务完成率</span>
                <span className="rounded-lg border border-border px-3 py-2">平均调漆时间</span>
                <span className="rounded-lg border border-border px-3 py-2">配方修正次数</span>
                <span className="rounded-lg border border-border px-3 py-2">色母消耗</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

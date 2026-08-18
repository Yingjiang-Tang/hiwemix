"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { useLang } from "@/components/LanguageContext";
import { useCompare } from "@/components/CompareContext";
import { trackPageView } from "@/lib/analytics";
import { buildCompareRows, isPartial } from "@/lib/compare-utils";
import { colorSwatchStyle } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Scale, X } from "lucide-react";
import type { SearchResult, FormulaSnapshot } from "@/types";

// 复用首页的配方抽屉（懒加载）
const FormulaDrawer = dynamic(() => import("@/components/FormulaDrawer"), {
  ssr: false,
  loading: () => null,
});

// 单元格：显示克数 +（共享色母时）与第一配方的差值
function AmountCell({
  value,
  base,
}: {
  value: number | null;
  base: number | null;
}) {
  if (value === null) {
    return <span className="text-muted-foreground/40">—</span>;
  }
  const diff = base !== null && base !== value ? value - base : null;
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span>{value.toFixed(1)}</span>
      {diff !== null && (
        <span className={`text-[11px] leading-none ${diff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
          {diff > 0 ? "+" : ""}{diff.toFixed(1)}
        </span>
      )}
    </span>
  );
}

export default function ComparePage() {
  const { t } = useLang();
  const { compareItems, removeFromCompare, clearCompare } = useCompare();
  const [drawerResult, setDrawerResult] = useState<SearchResult | null>(null);

  // 页面访问埋点（首载一次）
  useEffect(() => { trackPageView("compare"); }, []);

  // 对比表行（并集色母）；行序按第一配方 components 顺序优先
  const rows = useMemo(() => buildCompareRows(compareItems), [compareItems]);

  // 快照直接打开抽屉（零网络请求）
  function openFromSnapshot(snap: FormulaSnapshot) {
    setDrawerResult({ color: snap.color, formulas: [snap.formula] });
  }

  const hasCompare = compareItems.length > 0;

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
      <SiteHeader />
      <div className="h-[84px]" />

      <main className="w-full flex-1 px-6 py-8 sm:px-8 md:px-[60px]">
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-level-1)]">
          {/* 容器顶部标题：天平 + 标题 + 计数 + 清空按钮 */}
          <div className="flex items-center justify-center gap-2 px-5 pt-6 sm:px-6">
            <Scale className="size-6 text-primary" />
            <h1 className="font-heading text-[25px] font-semibold leading-tight text-foreground">{t.compareTitle}</h1>
            <span className="font-heading text-[25px] font-semibold leading-tight text-foreground">( {compareItems.length} )</span>
            {hasCompare && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCompare}
                className="ml-3 h-9 rounded-lg text-xs text-muted-foreground hover:text-foreground"
              >
                {t.compareClearAll}
              </Button>
            )}
          </div>

          <div className="mt-4 border-b border-border" />

          <div className="flex flex-col items-center p-5 sm:p-6">
            {!hasCompare ? (
              /* 空态 */
              <div className="flex flex-col items-center py-24 text-muted-foreground">
                <Scale className="mb-3 size-10 text-muted-foreground/40" />
                <p className="text-sm">{t.compareEmpty}</p>
                <p className="mt-1 text-xs">{t.compareEmptyHint}</p>
              </div>
            ) : (
              <div className="w-full max-w-4xl">
                {/* 顶部：对比配方颜色卡片行（横向滚动，移动端可滑） */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {compareItems.map((snap, i) => (
                    <div
                      key={snap.formula_id}
                      className="group relative w-28 flex-shrink-0 cursor-pointer rounded-xl border border-border bg-card p-2 transition-colors hover:border-primary/40"
                      onClick={() => openFromSnapshot(snap)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFromSnapshot(snap); } }}
                      aria-label={`${snap.color.color_code} ${snap.color.color_name}`}
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-lg border border-border/50" style={colorSwatchStyle(snap.color.hex_preview)} />
                      <p className="mt-2 truncate text-xs font-semibold text-foreground">{snap.color.color_code}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{snap.color.color_name}</p>
                      <span className="absolute left-2 top-2 flex size-5 items-center justify-center rounded-full bg-black/50 text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                      {/* 移除按钮 */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFromCompare(snap.formula_id); }}
                        aria-label={t.compareClearAll}
                        className="absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-destructive max-md:opacity-100"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* 主体：并排对比表（横向滚动） */}
                <div className="mt-6 overflow-x-auto rounded-lg border border-border">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-44 min-w-40 px-[30px] py-3 font-medium text-foreground/70">
                          {t.tonerName}
                        </TableHead>
                        {compareItems.map((snap, i) => (
                          <TableHead key={snap.formula_id} className="min-w-32 px-4 py-3 align-top font-medium text-foreground/70">
                            <span className="text-primary">{i + 1}</span>. {snap.formula.paint_system} · {snap.formula.formula_type}
                            <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                              {snap.color.color_code} · {snap.formula.version}
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, ri) => {
                        const partial = isPartial(row, compareItems.length);
                        return (
                          <TableRow
                            key={row.toner_code}
                            className={ri % 2 === 1 ? "bg-muted/30" : ""}
                          >
                            <TableCell className="px-[30px] py-2.5 align-middle">
                              <p className="font-medium text-foreground">{row.toner_code}</p>
                              <p className="text-xs text-muted-foreground">{row.toner_name}</p>
                              {partial && (
                                <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                                  {t.compareOnlyIn} {row.presentIn.map((i) => i + 1).join(", ")}
                                </span>
                              )}
                            </TableCell>
                            {compareItems.map((snap, i) => (
                              <TableCell
                                key={snap.formula_id}
                                className={`px-4 py-2.5 align-middle ${partial ? "bg-amber-50/60 dark:bg-amber-400/5" : ""}`}
                              >
                                <AmountCell
                                  value={row.values[i] ?? null}
                                  base={compareItems.length > 1 ? (row.values[0] ?? null) : null}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {t.compareGrams} · <span className="text-emerald-600 dark:text-emerald-400">+</span> / <span className="text-red-500 dark:text-red-400">−</span> = Δ vs #1
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <FormulaDrawer
        result={drawerResult}
        onClose={() => setDrawerResult(null)}
      />
    </div>
  );
}

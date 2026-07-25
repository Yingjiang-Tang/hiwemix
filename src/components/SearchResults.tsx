"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLang } from "@/components/LanguageContext";
import { colorSwatchStyle } from "@/lib/utils";
import type { FormulaTableRow } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { SearchSlash } from "lucide-react";

export interface SearchResultsProps {
  rows: FormulaTableRow[];
  isLoading: boolean;
  hasSearched: boolean;
  onOpenFormula: (row: FormulaTableRow) => void;
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-6 gap-x-0 gap-y-[30px] px-0 pb-4">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-none" />
      ))}
    </div>
  );
}

// ===== 子卡片组件：浮层内展示变体差异信息 =====
function VariantSubCard({
  row,
  onClick,
}: {
  row: FormulaTableRow;
  onClick: () => void;
}) {
  const hex = row.color.hex_preview;
  const displayTitle = row.variant?.name || row.formula.version;
  const displayYear = row.variant?.year_range || row.year?.toString() || "";
  const displayMeta = `${row.formula.paint_system} | ${row.formula.formula_type}`;

  return (
    <div
      className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-lg transition-all duration-300 ease-in-out active:scale-[0.95]"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${displayTitle} ${displayYear}`}
    >
      {/* 色块背景 */}
      <div
        className="absolute inset-0"
        style={
          hex ? colorSwatchStyle(hex) : { backgroundColor: "#d1d5db" }
        }
      />

      {/* 悬停遮罩 */}
      <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* 变体差异信息 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 p-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <p className="max-w-full truncate text-center font-mono text-xs font-bold text-white">
          {displayTitle}
        </p>
        {displayYear && (
          <p className="max-w-full truncate text-center text-[10px] text-white/80">
            {displayYear}
          </p>
        )}
        <p className="max-w-full truncate text-center text-[9px] leading-tight text-white/70">
          {displayMeta}
        </p>
      </div>
    </div>
  );
}

// ===== 母卡片组件：含 Popover 浮层展开变体子卡片 =====
function GroupedColorCard({
  rows,
  onSelect,
}: {
  rows: FormulaTableRow[];
  onSelect: (row: FormulaTableRow) => void;
}) {
  const parent = rows[0];
  const hex = parent.color.hex_preview;
  const hasVariants = rows.length > 1;
  const [open, setOpen] = useState(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 清除所有定时器
  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => () => clearTimers(), [clearTimers]);

  // 鼠标进入母卡片：延迟打开浮层（300ms 防误触）
  function handleMouseEnter() {
    if (!hasVariants) return;
    clearTimers();
    openTimerRef.current = setTimeout(() => setOpen(true), 300);
  }

  // 鼠标离开母卡片：延迟关闭浮层
  function handleMouseLeave() {
    if (!hasVariants) return;
    clearTimers();
    closeTimerRef.current = setTimeout(() => setOpen(false), 300);
  }

  // 鼠标进入浮层区域：取消关闭定时器，保持展开
  function handlePopoverEnter() {
    clearTimers();
  }

  // 鼠标离开浮层区域：延迟关闭
  function handlePopoverLeave() {
    clearTimers();
    closeTimerRef.current = setTimeout(() => setOpen(false), 300);
  }

  // 点击母卡片
  function handleClick() {
    if (!hasVariants) {
      // 单配方：直接打开详情面板
      onSelect(parent);
    } else {
      // 多变体：点击切换浮层（支持触屏设备）
      clearTimers();
      setOpen((prev) => !prev);
    }
  }

  // 母卡片纯视觉内容（复用于 PopoverTrigger render 和单配方卡片）
  const cardBody = (
    <div
      className="group relative aspect-square cursor-pointer overflow-hidden transition-all duration-300 ease-in-out active:scale-[0.98]"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${parent.color.color_code} ${parent.color.color_name}`}
    >
      {/* 颜色底色 + 金属漆渐变光泽 */}
      <div
        className="absolute inset-0"
        style={
          hex ? colorSwatchStyle(hex) : { backgroundColor: "#d1d5db" }
        }
      />

      {/* 悬停时半透明黑色遮罩，平滑淡入 */}
      <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* 悬停文字内容，与遮罩同步淡入 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <p className="max-w-full truncate text-center font-mono text-3xl font-bold tracking-tight text-white">
          {parent.color.color_code}
        </p>
        <p className="max-w-full truncate text-center text-sm font-medium text-white">
          {parent.color.color_name}
        </p>
        <p className="text-center text-xs capitalize text-white/80">
          {parent.color.color_type}
        </p>
      </div>

      {/* +N 变体徽标 */}
      {hasVariants && (
        <div className="pointer-events-none absolute bottom-2 right-2 z-10">
          <Badge variant="default" className="text-xs shadow-lg">
            +{rows.length - 1}
          </Badge>
        </div>
      )}
    </div>
  );

  // 单配方：直接返回卡片，无需 Popover
  if (!hasVariants) {
    return <div className="animate-card-row">{cardBody}</div>;
  }

  // 多变体：Popover 包裹，悬停弹出子卡片浮层
  return (
    <div className="animate-card-row">
      <Popover
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            clearTimers();
            setOpen(false);
          }
        }}
      >
        <PopoverTrigger render={cardBody} nativeButton={false} />
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={8}
          className="w-auto border border-border/60 bg-popover p-3 shadow-lg"
          onMouseEnter={handlePopoverEnter}
          onMouseLeave={handlePopoverLeave}
        >
          <div className="flex gap-3">
            {rows.map((row, idx) => (
              <VariantSubCard
                key={idx}
                row={row}
                onClick={() => {
                  setOpen(false);
                  onSelect(row);
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ===== 主搜索结果显示组件 =====
export default function SearchResults({
  rows,
  isLoading,
  hasSearched,
  onOpenFormula,
}: SearchResultsProps) {
  const { t } = useLang();

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center px-4 py-3">
          <Skeleton className="h-4 w-32" />
        </div>
        <SkeletonGrid />
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center">
        <p className="text-xs text-muted-foreground">{t.searchHint}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        className="flex min-h-[300px] flex-col items-center justify-center p-3"
        role="status"
      >
        <SearchSlash
          aria-hidden="true"
          className="mb-2 size-14 text-muted-foreground"
        />
        <p className="text-base font-semibold text-foreground">
          {t.noResults}
        </p>
        <p className="mt-1 text-2xs font-medium text-muted-foreground">
          {t.noResultsHint}
        </p>
      </div>
    );
  }

  // 按 color_code 分组：同一颜色的多个配方合并为一个母卡片
  const groups = new Map<string, FormulaTableRow[]>();
  for (const row of rows) {
    const key = row.color.color_code;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  const groupedEntries = Array.from(groups.entries());

  return (
    <div>
      {/* 结果计数栏 */}
      <div className="flex items-center px-4 py-3">
        <p className="text-sm font-semibold text-primary">
          Found {groupedEntries.length} colors ({rows.length} formulas)
        </p>
      </div>

      {/* 色块网格：每行 6 列，全量展示，滚轮滑动 */}
      <div className="grid grid-cols-6 gap-x-0 gap-y-[30px] px-0 pb-4">
        {groupedEntries.map(([colorCode, groupRows]) => (
          <GroupedColorCard
            key={colorCode}
            rows={groupRows}
            onSelect={(row) => onOpenFormula(row)}
          />
        ))}
      </div>
    </div>
  );
}

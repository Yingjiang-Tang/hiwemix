"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useLang } from "@/components/LanguageContext";
import { colorSwatchStyle } from "@/lib/utils";
import type { FormulaTableRow } from "@/types";
import { formatYearEntry } from "@/lib/db-formula";
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

// 段落固定顺序：实色 → 金属漆 → 珠光漆 → 哑光 → 糖果漆 → 特殊漆
const SECTION_ORDER = ["solid", "metallic", "pearl", "matte", "candy", "special"] as const;

// 段落标题英文标签
const SECTION_LABELS: Record<string, string> = {
  solid: "Solid",
  metallic: "Metallic",
  pearl: "Pearl",
  matte: "Matte",
  candy: "Candy",
  special: "Special",
};

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-5 justify-items-center gap-x-0 gap-y-0 px-0 pb-4">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <Skeleton key={i} className="mb-[70px] aspect-square w-[87.5%] rounded-none" />
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
  const displayYear = row.variant?.year_range || (row.yearEntry ? formatYearEntry(row.yearEntry) : "");
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
  // 颜色卡片照片：public/images/colors/<CODE>.jpg 存在则显示真实车漆照片，否则回退纯色块
  // 文件名不允许含 "/"，故将 color_code 中的 "/" 去除后匹配（如 C2/45U -> C245U.jpg）
  const photoSrc = `/images/colors/${parent.color.color_code.replace(/\//g, "").toUpperCase()}.jpg`;
  const [photoFailed, setPhotoFailed] = useState(false);
  const usePhoto = !photoFailed;
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
      className="group relative aspect-square w-full cursor-pointer overflow-hidden transition-all duration-300 ease-in-out hover:scale-[1.15]"
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
      {/* 颜色照片（存在则显示）或纯色块 + 金属漆渐变光泽；无照片代码回退纯色块 */}
      {usePhoto ? (
        <Image
          src={photoSrc}
          alt={`${parent.color.color_code} ${parent.color.color_name}`}
          fill
          sizes="300px"
          className="absolute inset-0 object-cover"
          priority={false}
          onError={() => setPhotoFailed(true)}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={
            hex ? colorSwatchStyle(hex) : { backgroundColor: "#d1d5db" }
          }
        />
      )}

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

  // 卡片下方信息块：左对齐卡片，常显配方代码 / 颜色 / 漆面类型
  const infoBlock = (
    <div className="mt-[45px] text-left font-[family-name:var(--font-outfit)]">
      <p className="truncate text-[20px] font-normal leading-tight text-foreground">
        {parent.color.color_code}
      </p>
      <p className="mt-2 truncate text-[16px] font-normal leading-tight text-muted-foreground">
        {parent.color.color_name}
      </p>
      <p className="truncate text-[16px] font-normal capitalize leading-tight text-muted-foreground">
        {parent.color.color_type.join(", ")}
      </p>
    </div>
  );

  // 单配方：直接返回卡片，无需 Popover
  if (!hasVariants) {
    return (
      <div className="animate-card-row mb-[70px] w-[87.5%]">
        {cardBody}
        {infoBlock}
      </div>
    );
  }

  // 多变体：Popover 包裹，悬停弹出子卡片浮层
  return (
    <div className="animate-card-row mb-[70px] w-[87.5%]">
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
      {infoBlock}
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
        <div className="flex items-center pl-0 pr-4 py-3">
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

  // 段内卡片按颜色代码升序
  groupedEntries.sort((a, b) => a[0].localeCompare(b[0]));

  // 按漆面类型分桶：多类型颜色整张母卡片重复进入每个所属段落
  const sections = SECTION_ORDER.map((type) => ({
    type,
    cards: groupedEntries.filter(([, groupRows]) =>
      groupRows[0].color.color_type.includes(type)
    ),
  }));

  return (
    <div>
      {/* 结果计数栏 */}
      <div className="flex items-center pl-0 pr-4 py-3">
        <p className="text-sm font-semibold text-primary">
          Found {groupedEntries.length} colors ({rows.length} formulas)
        </p>
      </div>

      {/* 按漆面类型分段落展示 */}
      {sections.map(({ type, cards }) =>
        cards.length === 0 ? null : (
          <section
            key={type}
            aria-labelledby={`section-${type}`}
            className="mb-[80px]"
          >
            {/* 段落标题：英文类型名居中，外框药丸圆角浅灰边框（shadcn 风格） */}
            <div className="flex items-center justify-center px-4 py-2">
              <h2
                id={`section-${type}`}
                className="rounded-full border-[0.5px] border-[#a8a8a8] px-4 py-1.5 font-heading text-[27px] font-normal tracking-wide text-ink"
              >
                {SECTION_LABELS[type] ?? type}
              </h2>
            </div>
            {/* 段内 6 列网格：距标题条 40px，--card-delay 从 0 重置交错入场动画 */}
            <div
              className="grid grid-cols-5 justify-items-center gap-x-0 gap-y-0 px-0 pb-4 mt-10"
              style={{ ["--card-delay" as string]: "0s" }}
            >
              {cards.map(([colorCode, groupRows]) => (
                <GroupedColorCard
                  key={colorCode}
                  rows={groupRows}
                  onSelect={(row) => onOpenFormula(row)}
                />
              ))}
            </div>
          </section>
        )
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useLang } from "@/components/LanguageContext";
import { useFavorites } from "@/components/FavoritesContext";
import { colorSwatchStyle, cn } from "@/lib/utils";
import { getColorPhotoCandidates } from "@/lib/color-photo";
import type { FormulaTableRow } from "@/types";
import { formatYearEntry } from "@/lib/formula-utils";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { SearchSlash, ChevronUp, ChevronDown, Eye, Heart } from "lucide-react";

// 品牌筛选「全部品牌」选项的值
const ALL_MAKES = "all";

// 品牌筛选 TabsTrigger 样式：
//   桌面端（≥768px）保持药丸选中底（data-active:bg-muted）
//   移动端（<768px）选中态去药丸底、文字变蓝（效果与品牌筛选栏一致）
const brandTrigger =
  "h-9 flex-none gap-1.5 rounded-full px-4 text-sm data-active:bg-muted max-md:data-active:bg-transparent max-md:data-active:shadow-none max-md:data-active:text-primary max-md:h-10 max-md:w-full max-md:justify-start max-md:data-active:bg-card max-md:data-active:border max-md:data-active:border-primary";

export interface SearchResultsProps {
  rows: FormulaTableRow[];
  isLoading: boolean;
  hasSearched: boolean;
  onOpenFormula: (row: FormulaTableRow) => void;
}

// 段标题样式：品牌名居中，外框药丸圆角浅灰边框（与原来类型分段标题一致）
function SectionTitle({ label, id }: { label: string; id: string }) {
  return (
    <div className="mt-8 max-md:mt-4 flex items-center justify-start px-4 py-2">
      <h2 id={id} className="rounded-full border-[0.5px] border-[#a8a8a8] px-4 py-1.5 font-heading text-[27px] font-normal tracking-wide text-ink">
        {label}
      </h2>
    </div>
  );
}

// ===== 子卡片组件：浮层内展示变体差异信息，悬停时放大展示颜色照片 =====
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
  // 颜色照片：差异化行优先专属图 {color_id}.jpg，否则回退 {code}.jpg；再失败回退纯色块
  const photoCandidates = getColorPhotoCandidates(row.color);
  const [photoIdx, setPhotoIdx] = useState(0);
  const photoSrc = photoCandidates[Math.min(photoIdx, photoCandidates.length - 1)] ?? null;
  const [photoFailed, setPhotoFailed] = useState(false);
  const usePhoto = !photoFailed && photoSrc != null;

  return (
    <div
      className="group relative h-36 w-36 cursor-pointer overflow-hidden rounded-xl transition-all duration-300 ease-in-out active:scale-[0.95] max-md:shrink-0 max-md:snap-start"
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
      {/* 颜色照片（存在则显示）或纯色块背景 */}
      {usePhoto ? (
        <Image
          src={photoSrc}
          alt={`${displayTitle} ${displayYear}`}
          fill
          sizes="144px"
          className="absolute inset-0 object-cover"
          onError={() => {
            if (photoIdx < photoCandidates.length - 1) {
              setPhotoIdx((i) => i + 1);
            } else {
              setPhotoFailed(true);
            }
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={hex ? colorSwatchStyle(hex) : { backgroundColor: "#d1d5db" }}
        />
      )}

      {/* 悬停遮罩 */}
      <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* 变体差异信息 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <p className="max-w-full truncate text-center font-mono text-base font-bold text-white">
          {displayTitle}
        </p>
        {displayYear && (
          <p className="max-w-full truncate text-center text-xs text-white/80">
            {displayYear}
          </p>
        )}
        <p className="max-w-full truncate text-center text-[11px] leading-tight text-white/70">
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
  const { t } = useLang();
  const { isFavorite, toggleFavorite } = useFavorites();
  const parent = rows[0];
  const hex = parent.color.hex_preview;
  const hasVariants = rows.length > 1;
  // 收藏以该颜色下的第一个配方为对象（与抽屉内收藏同一粒度）
  const favFormula = parent.formula;
  const isFav = isFavorite(favFormula.id);
  // 颜色卡片照片：差异化行优先 {color_id}.jpg，否则回退 {CODE}.jpg；失败再回退纯色块
  // （文件名不允许含 "/"，故将 color_code 中的 "/" 去除后大写，如 C2/45U -> C245U.jpg）
  const photoCandidates = getColorPhotoCandidates(parent.color);
  const [photoIdx, setPhotoIdx] = useState(0);
  const photoSrc = photoCandidates[Math.min(photoIdx, photoCandidates.length - 1)] ?? null;
  const [photoFailed, setPhotoFailed] = useState(false);
  const usePhoto = !photoFailed && photoSrc != null;
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
      className="group relative aspect-square w-full cursor-pointer overflow-hidden transition-all duration-300 ease-in-out hover:scale-[1.15] hover:z-10 transform-gpu [backface-visibility:hidden]"
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
          onError={() => {
            // 差异化行优先专属图，加载失败时逐级回退到 {code}.jpg，再失败才退纯色块
            if (photoIdx < photoCandidates.length - 1) {
              setPhotoIdx((i) => i + 1);
            } else {
              setPhotoFailed(true);
            }
          }}
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

  // 卡片下方信息块：左对齐卡片，常显配方代码 / 颜色 / 漆面类型；右侧线框收藏按钮
  const infoBlock = (
    <div className="mt-[45px] max-md:mt-[22px] flex items-start justify-between gap-2 text-left font-[family-name:var(--font-sans)]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[20px] max-md:text-[18px] font-normal leading-tight text-foreground">
          {parent.color.color_code}
        </p>
        <p className="mt-2 max-md:mt-0.5 truncate text-[16px] max-md:text-[15px] font-normal leading-tight text-muted-foreground">
          {parent.color.color_name}
        </p>
        <p className="truncate text-[16px] max-md:text-[15px] font-normal capitalize leading-tight text-muted-foreground">
          {parent.color.color_type.join(", ")}
        </p>
      </div>
      {/* 线框收藏按钮：未收藏空心，已收藏实心高亮 */}
      <button
        type="button"
        onClick={() => toggleFavorite({
          formula_id: favFormula.id,
          color_code: parent.color.color_code,
          color_name: parent.color.color_name,
          make_name: parent.makeName,
          formula_type: favFormula.formula_type,
          paint_system: favFormula.paint_system,
          version: favFormula.version,
        })}
        aria-pressed={isFav}
        aria-label={isFav ? t.favorited : t.favorite}
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
          isFav
            ? "border-muted-foreground/30 bg-muted text-foreground"
            : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
        }`}
      >
        <Heart className={`size-4 ${isFav ? "fill-current" : ""}`} />
      </button>
    </div>
  );

  // 单配方：直接返回卡片，无需 Popover
  if (!hasVariants) {
    return (
      <div className="animate-card-row mb-[70px] max-md:mb-[22px] w-[87.5%]">
        {cardBody}
        {infoBlock}
      </div>
    );
  }

  // 多变体：Popover 包裹，悬停弹出子卡片浮层
  return (
    <div className="animate-card-row mb-[70px] max-md:mb-[22px] w-[87.5%]">
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
          className="w-auto border border-border/60 bg-popover p-4 shadow-lg max-md:max-w-[calc(100vw-2.5rem)]"
          onMouseEnter={handlePopoverEnter}
          onMouseLeave={handlePopoverLeave}
        >
          <div className="flex gap-4 max-md:overflow-x-auto max-md:snap-x max-md:pb-1">
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

// ===== 品牌段落组件：折叠时只显示一行，点击「查看更多」展开全部 =====
const CARDS_PER_ROW = 5; // 每行卡片数（与网格 grid-cols-5 对应）
const VISIBLE_WHEN_COLLAPSED = 4; // 折叠时显示的真实卡片数，第 5 格留给「查看更多」

function BrandSection({
  makeName,
  colorCards,
  onSelect,
}: {
  makeName: string;
  colorCards: [string, FormulaTableRow[]][];
  onSelect: (row: FormulaTableRow) => void;
}) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const prevExpandedRef = useRef(false);
  const needsMore = colorCards.length > VISIBLE_WHEN_COLLAPSED;
  // 折叠时只渲染前 N 张 + 占位；展开时渲染全部
  const visibleCards = needsMore && !expanded ? colorCards.slice(0, VISIBLE_WHEN_COLLAPSED) : colorCards;

  // 收起后内容变短，浏览器滚动位置会漂移到别的品牌；平滑滚回本品牌标题处
  useEffect(() => {
    if (prevExpandedRef.current && !expanded && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    prevExpandedRef.current = expanded;
  }, [expanded]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby={`make-${makeName}`}
      className="mb-0 scroll-mt-[175px]"
    >
      {/* 车漆流动动画：内联 <style> 避免 Turbopack 漏掉 globals.css 中的 @keyframes（见 HeroSection 同款注释） */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes paint-flow {
          0%   { background-position: 0% 50%; }
          25%  { background-position: 70% 30%; }
          50%  { background-position: 100% 70%; }
          75%  { background-position: 40% 90%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes paint-blob-drift {
          0%   { transform: translate(0, 0) scale(1) rotate(0deg); }
          20%  { transform: translate(14%, -12%) scale(1.2) rotate(20deg); }
          45%  { transform: translate(-12%, 8%) scale(0.85) rotate(-25deg); }
          70%  { transform: translate(8%, 16%) scale(1.15) rotate(15deg); }
          100% { transform: translate(0, 0) scale(1) rotate(0deg); }
        }
        .paint-flow {
          background:
            radial-gradient(ellipse 90% 70% at 20% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 60%),
            radial-gradient(ellipse 70% 60% at 80% 75%, rgba(50, 180, 192, 0.45) 0%, transparent 65%),
            linear-gradient(115deg, #2587c9 0%, #32b4c0 33%, #e471fd 66%, #2587c9 100%);
          background-size: 260% 260%;
          animation: paint-flow 5s ease-in-out infinite;
        }
        .paint-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(28px);
          pointer-events: none;
          animation: paint-blob-drift 4s ease-in-out infinite;
        }
      ` }} />
      <SectionTitle label={makeName} id={`make-${makeName}`} />
      {/* 段内网格：折叠时一行，展开时可多行；--card-delay 从 0 重置交错入场动画 */}
      <div
        className="grid grid-cols-2 justify-items-center gap-x-0 gap-y-0 px-0 pb-4 mt-10 max-md:mt-5 sm:grid-cols-3 md:grid-cols-5"
        style={{ ["--card-delay" as string]: "0s" }}
      >
        {visibleCards.map(([colorCode, cardRows]) => (
          <GroupedColorCard
            key={colorCode}
            rows={cardRows}
            onSelect={(row) => onSelect(row)}
          />
        ))}

        {/* 折叠且还有更多时：第 5 格显示「查看更多」占位卡片（车漆流动效果） */}
        {needsMore && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="group relative aspect-square w-[87.5%] mb-[70px] max-md:mb-[22px] cursor-pointer overflow-hidden transition-all duration-300 ease-in-out transform-gpu [backface-visibility:hidden]"
            aria-label={`${t.viewMore} ${makeName}`}
          >
            {/* 流动漆液背景 */}
            <div className="paint-flow absolute inset-0" />
            {/* 漂移光斑，模拟漆面光泽流动 */}
            <div className="paint-blob left-[10%] top-[15%] h-[45%] w-[45%]" style={{ animationDelay: "0s", backgroundColor: "rgba(255,255,255,0.4)" }} />
            <div className="paint-blob right-[5%] bottom-[10%] h-[55%] w-[55%]" style={{ animationDelay: "-2s", backgroundColor: "rgba(228,113,253,0.45)" }} />
            {/* 压暗遮罩保证文字可读 */}
            <div className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <Eye className="size-7 drop-shadow transition-transform duration-300 group-hover:scale-110" strokeWidth={1.75} />
              <span className="text-[19px] font-normal drop-shadow transition-transform duration-300 group-hover:scale-105">
                {t.viewMore}
              </span>
            </div>
          </button>
        )}

        {/* 展开状态：末尾显示「收起」占位卡片（车漆流动效果） */}
        {needsMore && expanded && (
          <button
            onClick={() => setExpanded(false)}
            className="group relative aspect-square w-[87.5%] mb-[70px] max-md:mb-[22px] cursor-pointer overflow-hidden transition-all duration-300 ease-in-out transform-gpu [backface-visibility:hidden]"
            aria-label={`${t.collapse} ${makeName}`}
          >
            <div className="paint-flow absolute inset-0" />
            <div className="paint-blob left-[10%] top-[15%] h-[45%] w-[45%]" style={{ animationDelay: "-1s", backgroundColor: "rgba(255,255,255,0.4)" }} />
            <div className="paint-blob right-[5%] bottom-[10%] h-[55%] w-[55%]" style={{ animationDelay: "-3s", backgroundColor: "rgba(228,113,253,0.45)" }} />
            <div className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <ChevronUp className="size-7 drop-shadow transition-transform duration-300 group-hover:scale-110" strokeWidth={1.75} />
              <span className="text-[19px] font-normal drop-shadow transition-transform duration-300 group-hover:scale-105">
                {t.collapse}
              </span>
            </div>
          </button>
        )}
      </div>
    </section>
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
  // 品牌筛选：默认「全部品牌」，选中某个品牌后只显示该品牌的分段
  const [activeMake, setActiveMake] = useState<string>(ALL_MAKES);
  // 手机端：品牌筛选栏折叠/展开
  const [filterExpanded, setFilterExpanded] = useState(false);

  // sticky 品牌筛选栏
  const barRef = useRef<HTMLDivElement>(null);

  // 新搜索产生新的 rows 时，重置品牌筛选为「全部品牌」（新结果里不一定还有之前选中的品牌）
  useEffect(() => {
    setActiveMake(ALL_MAKES);
  }, [rows]);

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-muted-foreground">
        <Spinner className="size-8" />
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

  // 先按品牌分组：同一品牌的所有配方合并为一个品牌段落
  const groups = new Map<string, FormulaTableRow[]>();
  for (const row of rows) {
    const key = row.makeName;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  const groupedEntries = Array.from(groups.entries());

  // 品牌段落按名称首字母 A→Z 排序；段内再按 color_code 分组（同一颜色的多条配方合成一张母卡片）
  groupedEntries.sort((a, b) => a[0].localeCompare(b[0], "en"));
  const brandSections = groupedEntries.map(([makeName, groupRows]) => {
    const colorGroups = new Map<string, FormulaTableRow[]>();
    for (const row of groupRows) {
      const key = row.color.color_code;
      if (!colorGroups.has(key)) colorGroups.set(key, []);
      colorGroups.get(key)!.push(row);
    }
    const colorCards = Array.from(colorGroups.entries());
    colorCards.sort((a, b) => a[0].localeCompare(b[0], "en"));
    return { makeName, colorCards };
  });

  // 品牌筛选栏选项：全部品牌 + 每个品牌（按当前结果中出现的品牌排序）
  const makeTabs = brandSections.map((s) => ({
    value: s.makeName,
    label: s.makeName,
    count: s.colorCards.length,
  }));

  // 选中的品牌分段（「全部品牌」时展示所有）
  const visibleSections =
    activeMake === ALL_MAKES
      ? brandSections
      : brandSections.filter((s) => s.makeName === activeMake);

  return (
    <div>
      {/* 品牌筛选栏：外层面包使 sticky 不因负 margin 在移动端抖动 */}
      <div className="-mx-6 sm:-mx-8 md:-mx-[60px] sticky top-[79px] z-30">
        <div className="rounded-none bg-card ring-1 ring-border shadow-[var(--shadow-level-1)] px-6 py-3 sm:px-8 md:px-[60px] md:py-6">
        {/* 手机端折叠头部 */}
        <button
          type="button"
          onClick={() => setFilterExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium md:hidden"
        >
          <span className="text-foreground">
            {activeMake === ALL_MAKES ? t.allMakes : activeMake}
          </span>
          <ChevronDown className={cn("size-4 transition-transform", filterExpanded && "rotate-180")} />
        </button>

        {/* Tabs 列表：手机端折叠隐藏，桌面端始终显示 */}
        <div className={cn(filterExpanded ? "block" : "hidden md:block")}>
        <div className="flex min-w-0 flex-1">
          <Tabs value={activeMake} onValueChange={(v) => { setActiveMake(v); setFilterExpanded(false); }} className="w-full">
            <TabsList variant="default" className="group-data-horizontal/tabs:h-fit h-auto w-full flex-wrap justify-start gap-1 rounded-none bg-transparent p-0 max-md:grid max-md:grid-cols-3 max-md:gap-2">
              <TabsTrigger value={ALL_MAKES} className={brandTrigger}>
                {t.allMakes}
                <Badge variant="secondary" className="h-5 min-w-5 rounded-full bg-muted px-1.5 text-[11px] leading-none text-muted-foreground">
                  {rows.length}
                </Badge>
              </TabsTrigger>
              {makeTabs.map((mk) => (
                <TabsTrigger key={mk.value} value={mk.value} className={brandTrigger}>
                  {mk.label}
                  <Badge variant="secondary" className="h-5 min-w-5 rounded-full bg-muted px-1.5 text-[11px] leading-none text-muted-foreground">
                    {mk.count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
         </Tabs>
        </div>
        </div>
      </div>
    </div>

      {/* 按品牌分段展示，品牌名 A→Z */}
      {visibleSections.map(({ makeName, colorCards }) => (
        <BrandSection
          key={makeName}
          makeName={makeName}
          colorCards={colorCards}
          onSelect={(row) => onOpenFormula(row)}
        />
      ))}
    </div>
  );
}

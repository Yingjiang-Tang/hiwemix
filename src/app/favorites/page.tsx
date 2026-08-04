"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { useLang } from "@/components/LanguageContext";
import { useFavorites } from "@/components/FavoritesContext";
import { trackPageView } from "@/lib/analytics";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Heart, Search, RotateCcw, X } from "lucide-react";
import { classifyColorFamily, COLOR_FAMILIES, type ColorFamily } from "@/lib/utils";
import type { Color, Formula, SearchResult } from "@/types";

// 复用首页的配方抽屉（懒加载）
const FormulaDrawer = dynamic(() => import("@/components/FormulaDrawer"), {
  ssr: false,
  loading: () => null,
});

// 色系筛选「全部」选项
const ALL_FAMILIES = "all";

// 卡片背景：优先真实车漆照片，加载失败/无照片时回退纯色块
function CardSwatch({ photoSrc, hex, alt }: { photoSrc: string | null; hex: string; alt: string }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  if (!photoSrc || photoFailed) {
    return <div className="absolute inset-0" style={{ backgroundColor: hex }} />;
  }
  return (
    <Image
      src={photoSrc}
      alt={alt}
      fill
      sizes="300px"
      className="absolute inset-0 object-cover"
      priority={false}
      onError={() => setPhotoFailed(true)}
    />
  );
}

export default function FavoritesPage() {
  const { t } = useLang();
  const { snapshotList, toggleFavorite } = useFavorites();
  const [colors, setColors] = useState<Color[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFamily, setActiveFamily] = useState<string>(ALL_FAMILIES);
  const [query, setQuery] = useState("");
  const [drawerResult, setDrawerResult] = useState<SearchResult | null>(null);
  const [drawerFormulaId, setDrawerFormulaId] = useState<string | undefined>();

  // 页面访问埋点（首载一次）
  useEffect(() => { trackPageView("favorites"); }, []);

  // 拉取全量数据，用于从收藏快照反查完整配方
  useEffect(() => {
    Promise.all([
      fetch("/api/colors").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/formulas").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([c, f]) => {
        setColors(c as Color[]);
        setFormulas(f as Formula[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 每个收藏快照反查其颜色，得到用于分类的 hex 和色系
  const snapWithColor = useMemo(() => {
    return snapshotList.map((s) => {
      const formula = formulas.find((f) => f.id === s.formula_id);
      const color = formula ? colors.find((c) => c.id === formula.color_id) : undefined;
      const hex = color?.hex_preview ?? "#d1d5db";
      return { snap: s, color, hex, family: classifyColorFamily(hex) };
    });
  }, [snapshotList, formulas, colors]);

  // 出现过的色系（保持标准色系顺序）
  const presentFamilies = useMemo(() => {
    const present = new Set(snapWithColor.map((x) => x.family.key));
    return COLOR_FAMILIES.filter((f) => present.has(f.key));
  }, [snapWithColor]);

  // 筛选：色系 + 模糊搜索（匹配颜色代码 / 颜色名 / 品牌）
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return snapWithColor.filter((x) => {
      if (activeFamily !== ALL_FAMILIES && x.family.key !== activeFamily) return false;
      const s = x.snap;
      if (!q) return true;
      return (
        s.color_code.toLowerCase().includes(q) ||
        s.color_name.toLowerCase().includes(q) ||
        s.make_name.toLowerCase().includes(q) ||
        (s.formula_type || "").toLowerCase().includes(q) ||
        (s.version || "").toLowerCase().includes(q)
      );
    });
  }, [snapWithColor, activeFamily, query]);

  // 根据快照构造可点击的 SearchResult（打开抽屉）
  function openFromSnapshot(snapshot: { formula_id: string }) {
    const formula = formulas.find((f) => f.id === snapshot.formula_id);
    if (!formula) return;
    const color = colors.find((c) => c.id === formula.color_id);
    if (!color) return;
    const result: SearchResult = {
      color,
      formulas: formulas.filter((f) => f.color_id === color.id),
    };
    setDrawerResult(result);
    setDrawerFormulaId(formula.id);
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
      <SiteHeader />
      <div className="h-[84px]" />

      {/* 主内容：卡片容器左右边距相等（居中） */}
      <main className="w-full flex-1 px-6 py-8 sm:px-8 md:px-[60px]">
        {/* 单个内容容器：顶部标题 → 搜索 → 品牌 → 卡片 */}
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-level-1)]">
          {/* 容器顶部标题：爱心 + 标题 + 计数，水平居中，与顶部留间距 */}
          <div className="flex items-center justify-center gap-2 px-5 pt-6 sm:px-6">
            <Heart className="size-6 fill-primary text-primary" />
            <h1 className="font-heading text-[25px] font-semibold leading-tight text-foreground">{t.favoritesTitle}</h1>
            <span className="font-heading text-[25px] font-semibold leading-tight text-foreground">( {filtered.length} )</span>
          </div>

          {/* 标题与内容的分隔线 */}
          <div className="mt-4 border-b border-border" />

          {/* 容器主体：搜索 + 色系圆点 → 卡片 */}
          <div className="flex flex-col items-center p-5 sm:p-6">
            {/* 顶部行：搜索框 + 色系圆点（两组之间留较大间距） */}
            <div className="flex w-full max-w-[627px] flex-wrap items-center">
              <div className="relative min-w-[180px] flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.favoritesSearchPlaceholder}
                  className="h-10 rounded-lg pl-9 text-sm"
                />
              </div>

              {/* 色系圆点组：重置按钮 + 各色系，彼此紧邻 */}
              <div className="ml-6 flex items-center gap-[0.75px]">
                {/* 重置按钮：点击清除色系筛选（回到全部），替代原白色圆点 */}
                <button
                  type="button"
                  title={t.reset}
                  onClick={() => setActiveFamily(ALL_FAMILIES)}
                  aria-pressed={activeFamily === ALL_FAMILIES}
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-all ${
                    activeFamily === ALL_FAMILIES
                      ? "text-primary"
                      : "text-muted-foreground hover:scale-105 hover:text-primary"
                  }`}
                >
                  <RotateCcw className="size-[23px]" />
                </button>
                {presentFamilies.map((fam: ColorFamily) => (
                  <button
                    key={fam.key}
                    type="button"
                    title={fam.name}
                    onClick={() => setActiveFamily(fam.key)}
                    aria-pressed={activeFamily === fam.key}
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-all ${
                      activeFamily === fam.key
                        ? "ring-1 ring-muted-foreground"
                        : "hover:ring-1 hover:ring-muted-foreground/40"
                    }`}
                  >
                    <span
                      className="size-5 rounded-full border border-black/10"
                      style={{ backgroundColor: fam.hex }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* 色系圆点下方：卡片网格（与首页搜索结果卡片同款） */}
            <div className="mt-[60px] w-full">
            {loading ? (
              <div className="flex flex-col items-center py-20 text-muted-foreground">
                <Spinner className="size-6" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-24 text-muted-foreground">
                <Heart className="mb-3 size-10 text-muted-foreground/40" />
                <p className="text-sm">{t.favoritesEmpty}</p>
                <p className="mt-1 text-xs">{t.favoritesEmptyHint}</p>
              </div>
            ) : (
              <div
                className="grid grid-cols-5 justify-items-center gap-x-0 gap-y-0 px-0 pb-4"
                style={{ ["--card-delay" as string]: "0s" }}
              >
                {filtered.map(({ snap, color, hex }) => {
                  const photoSrc = color
                    ? `/images/colors/${color.color_code.replace(/\//g, "").toUpperCase()}.jpg`
                    : null;
                  return (
                    <div key={snap.formula_id} className="animate-card-row mb-[70px] w-[87.5%]">
                      {/* 圆角矩形卡片：色块/照片 + 圆角 + 边框，与整页卡片风格一致 */}
                      <div
                        className="group relative w-full cursor-pointer overflow-hidden rounded-xl border border-border bg-card"
                        onClick={() => openFromSnapshot(snap)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFromSnapshot(snap); } }}
                        aria-label={`${snap.color_code} ${snap.color_name}`}
                      >
                        <div className="relative aspect-square w-full">
                          {photoSrc ? (
                            <CardSwatch photoSrc={photoSrc} hex={hex} alt={`${snap.color_code} ${snap.color_name}`} />
                          ) : (
                            <div className="absolute inset-0" style={{ backgroundColor: hex }} />
                          )}
                        </div>

                        {/* 卡片右上角：红色叉叉（取消收藏），鼠标移入卡片时才显示 */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(snap); }}
                          aria-label={t.removeFavorite}
                          className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      {/* 卡片下方信息块：左对齐常显，与首页一致 */}
                      <div className="mt-[45px] text-left font-[family-name:var(--font-sans)]">
                        <p className="truncate text-[20px] font-normal leading-tight text-foreground">
                          {snap.color_code}
                        </p>
                        <p className="mt-2 truncate text-[16px] font-normal leading-tight text-muted-foreground">
                          {snap.color_name}
                        </p>
                        <p className="truncate text-[16px] font-normal capitalize leading-tight text-muted-foreground">
                          {snap.make_name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </div>
        </div>
      </main>

      <Footer />

      <FormulaDrawer
        result={drawerResult}
        formulaId={drawerFormulaId}
        onClose={() => setDrawerResult(null)}
      />
    </div>
  );
}

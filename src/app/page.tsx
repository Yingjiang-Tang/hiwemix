"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import SearchPanel from "@/components/SearchPanel";
import SearchResults from "@/components/SearchResults";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import VerifiedBanner from "@/components/VerifiedBanner";
import { useLang } from "@/components/LanguageContext";
import { yearEntryContains } from "@/lib/db-formula";
import { track, trackPageView } from "@/lib/analytics";
import type { CarMake, Color, ColorType, Formula, SearchParams, SearchResult, FormulaTableRow, YearEntry } from "@/types";

// FormulaDrawer（Sheet + Tabs + KapciFormulaTable + framer-motion 依赖较重）
// 只在用户真正打开配方抽屉时才加载 JS，首屏不打包
const FormulaDrawer = dynamic(() => import("@/components/FormulaDrawer"), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  const { t } = useLang();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [tableRows, setTableRows] = useState<FormulaTableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [drawerResult, setDrawerResult] = useState<SearchResult | null>(null);
  const [drawerFormulaId, setDrawerFormulaId] = useState<string | undefined>();
  const [drawerYear, setDrawerYear] = useState<YearEntry | undefined>();
  // Hero 三段式落地页：默认显示，点击 Explore Now 后隐藏；滚回顶部或点 Logo 可恢复
  const [heroVisible, setHeroVisible] = useState(true);
  const [heroExplored, setHeroExplored] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement>(null);

  const dataPromiseRef = useRef<Promise<{ colors: Color[]; formulas: Formula[]; brands: CarMake[] }> | null>(null);

  function loadData() {
    if (!dataPromiseRef.current) {
      dataPromiseRef.current = Promise.all([
        fetch("/api/colors").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/formulas").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/brands").then((r) => (r.ok ? r.json() : [])),
      ]).then(([c, f, b]) => ({ colors: c as Color[], formulas: f as Formula[], brands: b as CarMake[] }));
    }
    return dataPromiseRef.current;
  }

  useEffect(() => { loadData().catch(() => {}); }, []);

  // 页面访问埋点（首载一次）
  useEffect(() => { trackPageView("home"); }, []);

  function handleSearch(params: SearchParams) {
    setIsLoading(true);
    setHasSearched(true);
    loadData().then(({ colors, formulas, brands }) => {
      let filtered = colors;

      if (params.region) {
        const regionBrandIds = brands
          .filter((b) => b.region === params.region)
          .map((b) => b.id);
        filtered = filtered.filter((c) => regionBrandIds.includes(c.make_id));
      }

      if (params.make_id) filtered = filtered.filter((c) => c.make_id === params.make_id);

      if (params.color_code) {
        const code = params.color_code!.toUpperCase();
        filtered = filtered.filter((c) => c.color_code.toUpperCase().includes(code));
      }

      if (params.color_name) {
        const name = params.color_name!.toLowerCase();
        filtered = filtered.filter((c) => c.color_name.toLowerCase().includes(name));
      }

      if (params.color_type) filtered = filtered.filter((c) => c.color_type.includes(params.color_type as ColorType));

      if (params.year) {
        const searchYear = parseInt(params.year, 10);
        if (!isNaN(searchYear)) {
          filtered = filtered.filter((c) =>
            c.years && c.years.some((entry) => yearEntryContains(entry, searchYear))
          );
        }
      }
      const results: SearchResult[] = filtered.map((color) => ({
        color,
        formulas: formulas.filter((f) => f.color_id === color.id),
      }));
      const brandsMap = new Map(brands.map((b) => [b.id, b.name]));
      const searchYear = params.year ? parseInt(params.year, 10) : undefined;
      const rows: FormulaTableRow[] = [];
      for (const r of results) {
        // 匹配的 YearEntry（按搜索年份过滤）；若无搜索年份则展示全部 YearEntry
        const matchedEntries = searchYear && !isNaN(searchYear)
          ? r.color.years?.filter(e => yearEntryContains(e, searchYear)) ?? []
          : (r.color.years && r.color.years.length > 0 ? r.color.years : [undefined]);
        for (const f of r.formulas) {
          for (const entry of matchedEntries) {
            rows.push({
              color: r.color,
              formula: f,
              variant: r.color.variants.find((v) => v.id === f.variant_id),
              makeName: brandsMap.get(r.color.make_id) ?? r.color.make_id,
              yearEntry: entry,
            });
          }
        }
      }
      setSearchResults(results);
      setTableRows(rows);
      // 搜索事件埋点（记录品牌/色号/颜色名/年份，不含个人身份）
      void track("search", {
        make: params.make_id ? brandsMap.get(params.make_id) ?? params.make_id : undefined,
        code: params.color_code,
        name: params.color_name,
        year: params.year,
      });
    }).catch((err) => { console.error(err); setSearchResults([]); }).finally(() => setIsLoading(false));
  }

  function handleOpenFormula(row: FormulaTableRow) {
    const r = searchResults.find((x) => x.color.id === row.color.id);
    if (!r) return;
    setDrawerResult(r);
    setDrawerFormulaId(row.formula.id);
    setDrawerYear(row.yearEntry);
  }

  // Explore Now 触发：Hero 退出 + 首次载入全部配方（无筛选），用户再在搜索框自行筛选；滚回顶部或点 Logo 可恢复
  function handleExplore() {
    setHeroVisible(false);
    setHeroExplored(true);
    handleSearch({});
  }

  return (
    <div className={heroVisible ? "flex h-screen flex-col overflow-hidden" : "flex min-h-screen flex-col"}>
      <SiteHeader useHomeTheme={heroVisible} />
      <main className={heroVisible ? "relative flex-1 overflow-hidden" : "flex min-h-screen flex-col"}>
        {/* Hero：占满 main 区域，Header 固定在其上方 */}
        {heroVisible && <HeroSection onExplore={handleExplore} animateEntrance={!heroExplored} />}

        {/* 搜索区域：白色背景，Hero 可见时完全隐藏（heroVisible=true 时不渲染下方 DOM） */}
        {!heroVisible && (
        <section className="flex flex-1 flex-col bg-background px-6 sm:px-8 md:px-[60px]">
          <VerifiedBanner />

          <div className="pt-[100px] md:pt-[116px]">
            <SearchPanel onSearch={handleSearch} isLoading={isLoading} />
          </div>

          {hasSearched && (
            <div className="mt-[26px] md:mt-[30px]">
              <SearchResults rows={tableRows} isLoading={isLoading} hasSearched={hasSearched} onOpenFormula={handleOpenFormula} />
            </div>
          )}

          <div className="pb-10" />
        </section>
        )}

        {!heroVisible && <Footer />}
      </main>
      <FormulaDrawer result={drawerResult} formulaId={drawerFormulaId} initialYear={drawerYear} onClose={() => setDrawerResult(null)} />
    </div>
  );
}

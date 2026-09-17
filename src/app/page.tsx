"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import SearchPanel from "@/components/SearchPanel";
import SearchResults from "@/components/SearchResults";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import VerifiedBanner from "@/components/VerifiedBanner";
import { searchFormulas } from "@/lib/search-formulas";
import { track, trackPageView } from "@/lib/analytics";
import type { CarMake, Color, Formula, SearchParams, SearchResult, FormulaTableRow, YearEntry } from "@/types";

// FormulaDrawer（Sheet + Tabs + KapciFormulaTable + framer-motion 依赖较重）
// 只在用户真正打开配方抽屉时才加载 JS，首屏不打包
const FormulaDrawer = dynamic(() => import("@/components/FormulaDrawer"), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [tableRows, setTableRows] = useState<FormulaTableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [drawerResult, setDrawerResult] = useState<SearchResult | null>(null);
  const [drawerFormulaId, setDrawerFormulaId] = useState<string | undefined>();
  const [drawerYear, setDrawerYear] = useState<YearEntry | undefined>();
  const searchPanelRef = useRef<HTMLDivElement>(null);

  const [hasExplored, setHasExplored] = useState(false);

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
      const { results, rows, makeNameById } = searchFormulas(colors, formulas, brands, params);
      setSearchResults(results);
      setTableRows(rows);
      // 搜索事件埋点（记录品牌/色号/颜色名/年份，不含个人身份）
      void track("search", {
        make: params.make_id ? makeNameById.get(params.make_id) ?? params.make_id : undefined,
        code: params.color_code,
        name: params.color_name,
        year: params.year,
        result_count: rows.length,
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

  // Explore Now 触发：解锁滚动 + 首次载入全部配方
  function handleExplore() {
    setHasExplored(true);
    if (!hasSearched) handleSearch({});
  }

  // 滚动必须在 Hero 卸载、滚动解锁后的新布局上执行，
  // 同步调用 scrollIntoView 会按旧布局（Hero 未移除）计算位置导致停在配方卡片区域
  useEffect(() => {
    if (hasExplored && searchPanelRef.current) {
      searchPanelRef.current.scrollIntoView({ behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasExplored]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <SiteHeader useHomeTheme />
      <main className={`relative flex-1 ${hasExplored ? "overflow-y-auto" : "overflow-hidden"}`}>
        {/* Hero：占满 main 区域，点击后隐藏 */}
        {!hasExplored && (
          <section className="h-full">
            <HeroSection onExplore={handleExplore} />
          </section>
        )}

        {/* 搜索区域 */}
        <section className="min-h-full flex flex-col bg-background px-6 sm:px-8 md:px-[60px]">
          <VerifiedBanner />

          <div className="pt-[100px] md:pt-[116px]" ref={searchPanelRef}>
            <SearchPanel onSearch={handleSearch} isLoading={isLoading} />
          </div>

          {hasSearched && (
            <div className="mt-[26px] md:mt-[30px]">
              <SearchResults rows={tableRows} isLoading={isLoading} hasSearched={hasSearched} onOpenFormula={handleOpenFormula} />
            </div>
          )}

          <div className="pb-10" />
        </section>

        <Footer />
      </main>
      <FormulaDrawer result={drawerResult} formulaId={drawerFormulaId} initialYear={drawerYear} onClose={() => setDrawerResult(null)} />
    </div>
  );
}

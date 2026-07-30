"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SearchPanel from "@/components/SearchPanel";
import SearchResults from "@/components/SearchResults";
import FormulaDrawer from "@/components/FormulaDrawer";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import VerifiedBanner from "@/components/VerifiedBanner";
import { useLang } from "@/components/LanguageContext";
import { yearEntryContains } from "@/lib/db-formula";
import type { CarMake, Color, Formula, SearchParams, SearchResult, FormulaTableRow, YearEntry } from "@/types";

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

      if (params.color_type) filtered = filtered.filter((c) => c.color_type.toLowerCase() === params.color_type);

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
    }).catch((err) => { console.error(err); setSearchResults([]); }).finally(() => setIsLoading(false));
  }

  function handleOpenFormula(row: FormulaTableRow) {
    const r = searchResults.find((x) => x.color.id === row.color.id);
    if (!r) return;
    setDrawerResult(r);
    setDrawerFormulaId(row.formula.id);
    setDrawerYear(row.yearEntry);
  }

  // Explore Now 触发：Hero 退出 + SearchPanel 滑入视口
  const handleExplore = useCallback(() => {
    setHeroVisible(false);
    setHeroExplored(true);
  }, []);

  // Logo 点击恢复 Hero
  const handleRestoreHero = useCallback(() => {
    setHeroVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        onHomeLogoClick={!heroVisible ? handleRestoreHero : undefined}
        useHomeTheme={heroVisible}
      />
      <main className="flex min-h-screen flex-col">
        {/* Hero：普通文档流，占100svh，Header 固定在其上方 */}
        <AnimatePresence>
          {heroVisible && (
            <motion.div
              key="hero"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: "-30vh", transition: { duration: 0.3, ease: "easeIn" } }}
            >
              <HeroSection onExplore={handleExplore} animateEntrance={!heroExplored} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 搜索区域：白色背景，Hero 可见时 grid 收起不占空间 */}
        <section className="flex flex-1 flex-col bg-background px-6 sm:px-8 md:px-[60px]">
          <VerifiedBanner />

          <div
            className={`grid transition-[grid-template-rows] duration-[0.6s] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              heroVisible ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <motion.div
                ref={searchPanelRef}
                initial={{ opacity: 0, y: 40 }}
                animate={heroVisible ? { opacity: 0, y: 40 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: heroVisible ? 0 : 0.15 }}
                className="pt-20 md:pt-24"
              >
                <SearchPanel onSearch={handleSearch} isLoading={isLoading} />
              </motion.div>
            </div>
          </div>

          {hasSearched && (
            <div className="mt-4 md:mt-5">
              <SearchResults rows={tableRows} isLoading={isLoading} hasSearched={hasSearched} onOpenFormula={handleOpenFormula} />
            </div>
          )}

          <div className="pb-10" />
        </section>

        {!heroVisible && <Footer />}
      </main>
      <FormulaDrawer result={drawerResult} formulaId={drawerFormulaId} initialYear={drawerYear} onClose={() => setDrawerResult(null)} />
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import SearchPanel from "@/components/SearchPanel";
import SearchResults from "@/components/SearchResults";
import FormulaDrawer from "@/components/FormulaDrawer";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { useLang } from "@/components/LanguageContext";
import type { CarMake, Color, Formula, SearchParams, SearchResult, FormulaTableRow } from "@/types";

export default function Home() {
  const { t } = useLang();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [tableRows, setTableRows] = useState<FormulaTableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [drawerResult, setDrawerResult] = useState<SearchResult | null>(null);
  const [drawerFormulaId, setDrawerFormulaId] = useState<string | undefined>();
  const [drawerYear, setDrawerYear] = useState<number | undefined>();

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
            c.years && c.years.some((y) => y === searchYear)
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
        const colorYears = searchYear && !isNaN(searchYear)
          ? [searchYear]
          : r.color.years && r.color.years.length > 0 ? r.color.years : [undefined];
        for (const f of r.formulas) {
          for (const year of colorYears) {
            rows.push({
              color: r.color,
              formula: f,
              variant: r.color.variants.find((v) => v.id === f.variant_id),
              makeName: brandsMap.get(r.color.make_id) ?? r.color.make_id,
              year,
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
    setDrawerYear(row.year);
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* 页面内容 */}
      <div className="flex flex-col flex-1">
        <SiteHeader />
        <section className="flex-1 flex flex-col pt-20 md:pt-24 px-6 sm:px-8 md:px-[60px]">
            {/* 搜索卡片容器（标题 + 表单一并由 SearchPanel 渲染） */}
            <div className="mb-6 md:mb-8 mt-2 md:mt-3">
              <SearchPanel onSearch={handleSearch} isLoading={isLoading} />
            </div>
          {hasSearched && (
            <div className="mt-4 md:mt-5">
              <SearchResults rows={tableRows} isLoading={isLoading} hasSearched={hasSearched} onOpenFormula={handleOpenFormula} />
            </div>
          )}
        </section>
        <Footer isLightBackground={false} />
        <FormulaDrawer result={drawerResult} formulaId={drawerFormulaId} initialYear={drawerYear} onClose={() => setDrawerResult(null)} />
      </div>
    </div>
  );
}

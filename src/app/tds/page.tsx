"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useLang } from "@/components/LanguageContext";
import type { Guide, GuideCategory, DocType } from "@/types";
import { Input } from "@/components/ui/input";
import { Search, FileText } from "lucide-react";

export default function TdsIndexPage() {
  const { t, lang } = useLang();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDocType, setSelectedDocType] = useState<"" | DocType>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<GuideCategory[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);

  useEffect(() => {
    fetch("/api/tds")
      .then((r) => (r.ok ? r.json() : { categories: [], guides: [] }))
      .then((d: { categories: GuideCategory[]; guides: Guide[] }) => {
        setCategories(d.categories ?? []);
        setGuides(d.guides ?? []);
      })
      .catch(() => {
        setCategories([]);
        setGuides([]);
      });
  }, []);

  const filteredGuides = useMemo(() => {
    let r = guides;
    if (selectedCategory) r = r.filter((g) => g.categoryId === selectedCategory);
    if (selectedDocType) r = r.filter((g) => g.docType === selectedDocType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter((g) => {
        const title = lang === "zh" ? g.titleZh : g.title;
        const summary = lang === "zh" ? g.summaryZh : g.summary;
        return (
          title.toLowerCase().includes(q) ||
          (summary?.toLowerCase().includes(q) ?? false)
        );
      });
    }
    return r;
  }, [guides, selectedCategory, selectedDocType, searchQuery, lang]);

  return (
    <div className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
      {/* 左栏：分类菜单 */}
      <div className="border-b border-border px-6 pt-5 pb-3 sm:px-8 md:pl-[60px] md:pr-4 lg:w-[240px] lg:flex-shrink-0 lg:border-b-0 lg:border-r lg:pt-8 lg:overflow-y-auto lg:max-h-[calc(100vh-64px)]">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t.tdsCategories}
        </span>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => setSelectedCategory("")}
            className={`relative rounded-lg px-3 py-2 text-left text-2xs transition-colors ${
              selectedCategory === ""
                ? "bg-blue-50/60 font-semibold text-primary"
                : "font-medium text-muted-foreground hover:bg-muted"
            }`}
          >
            {selectedCategory === "" && (
              <span className="absolute left-0 top-1/2 h-3/5 w-[3px] -translate-y-1/2 rounded-r bg-primary" />
            )}
            {t.tdsAllCategories}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`relative rounded-lg px-3 py-2 text-left text-2xs transition-colors ${
                selectedCategory === cat.id
                  ? "bg-blue-50/60 font-semibold text-primary"
                  : "font-medium text-muted-foreground hover:bg-muted"
              }`}
            >
              {selectedCategory === cat.id && (
                <span className="absolute left-0 top-1/2 h-3/5 w-[3px] -translate-y-1/2 rounded-r bg-primary" />
              )}
              {lang === "zh" ? cat.nameZh : cat.name}
            </button>
          ))}
        </div>

        {/* 文档类型筛选 */}
        <span className="mb-2 mt-5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Type
        </span>
        <div className="flex flex-col gap-0.5">
          {[
            { v: "", label: "All" },
            { v: "tds", label: "TDS" },
            { v: "msds", label: "MSDS" },
            { v: "sds", label: "SDS" },
            { v: "manual", label: "Manual" },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setSelectedDocType(opt.v as "" | DocType)}
              className={`rounded-lg px-3 py-1.5 text-left text-2xs transition-colors ${
                selectedDocType === opt.v
                  ? "bg-blue-50/60 font-semibold text-primary"
                  : "font-medium text-muted-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 中栏：文档列表 */}
      <div className="border-b border-border bg-muted/50 p-4 pt-4 sm:p-5 lg:w-[320px] lg:flex-shrink-0 lg:border-b-0 lg:border-r lg:pt-5 lg:overflow-y-auto lg:max-h-[calc(100vh-64px)]">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.tdsSearchPlaceholder}
            className="h-9 rounded-xl pl-9 text-2xs"
          />
        </div>

        <div className="flex flex-col gap-2">
          {filteredGuides.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">—</p>
          ) : (
            filteredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/tds/${guide.categoryId}/${guide.id}`}
                className="block rounded-xl border border-border/60 bg-card px-3.5 py-3 transition-colors hover:border-primary"
              >
                <p className="text-2xs font-semibold text-foreground md:text-sm">
                  {lang === "zh" ? guide.titleZh : guide.title}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="size-3" />
                    {guide.docType.toUpperCase()} · {guide.version}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 右栏：欢迎提示 */}
      <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8 md:px-[60px] md:py-6">
        <div className="flex min-h-[256px] flex-col items-center justify-center text-center">
          <FileText className="mb-4 size-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t.tdsSelectHint}</p>
          <p className="mt-2 text-xs text-muted-foreground/60">
            {categories.length} {t.tdsCategories} · {guides.length} {t.tdsListLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
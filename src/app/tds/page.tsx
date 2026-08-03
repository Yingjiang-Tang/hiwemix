"use client";

import { useState, useEffect, useMemo } from "react";
import { useLang } from "@/components/LanguageContext";
import type { Guide, GuideCategory, DocType } from "@/types";
import { Input } from "@/components/ui/input";
import { Search, FileText } from "lucide-react";
import TdsSidebar from "@/components/TdsSidebar";
import TdsGuideContent from "@/components/TdsGuideContent";
import { cn } from "@/lib/utils";

export default function TdsIndexPage() {
  const { t, lang } = useLang();
  const [selectedCategory, setSelectedCategory] = useState("");
  // 默认展开 TDS 文档（用户主要使用的类型，其余 MSDS/SDS/Manual 为辅助）
  const [selectedDocType, setSelectedDocType] = useState<"" | DocType>("tds");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<GuideCategory[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

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

  // 选中的文档对象（从全部 guides 中查找）
  const selectedGuide = useMemo(
    () => guides.find((g) => g.id === selectedGuideId) ?? null,
    [guides, selectedGuideId]
  );

  // 列表筛选变化时若当前选中已不在结果中，清空选中
  useEffect(() => {
    if (selectedGuideId && !filteredGuides.some((g) => g.id === selectedGuideId)) {
      setSelectedGuideId(null);
    }
  }, [filteredGuides, selectedGuideId]);

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* 左栏：分类菜单 */}
      <TdsSidebar
        categories={categories}
        guides={guides}
        selectedCategory={selectedCategory}
        selectedDocType={selectedDocType}
        onSelectCategory={setSelectedCategory}
        onSelectDocType={setSelectedDocType}
      />

      {/* 中栏：文档列表 */}
      <div className="border-b border-border bg-background pt-8 pr-5 pb-5 pl-5 lg:w-[320px] lg:flex-shrink-0 lg:border-b-0 lg:border-r lg:overflow-y-auto lg:h-[calc(100vh-84px)] lg:sticky lg:top-[84px]">
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
            filteredGuides.map((guide) => {
              const isSelected = selectedGuideId === guide.id;
              return (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => setSelectedGuideId(guide.id)}
                  className={cn(
                    "block w-full rounded-md border px-3.5 py-3 text-left transition-colors",
                    isSelected
                      ? "border-transparent bg-border"
                      : "border-border/60 bg-card hover:border-primary"
                  )}
                >
                  <p
                    className={cn(
                      "text-2xs font-semibold md:text-sm",
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {lang === "zh" ? guide.titleZh : guide.title}
                  </p>
                  <div
                    className={cn(
                      "mt-1 flex items-center gap-2 text-xs",
                      isSelected ? "text-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      <FileText className="size-3" />
                      {guide.docType.toUpperCase()} · {guide.version}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 右栏：详情内容 / 欢迎提示 */}
      <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100vh-84px)] lg:sticky lg:top-[84px]">
        {selectedGuide ? (
          <TdsGuideContent
            guide={selectedGuide}
            onBack={() => setSelectedGuideId(null)}
          />
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8 md:px-[60px] md:py-6">
            <div className="flex min-h-[256px] flex-col items-center justify-center text-center">
              <FileText className="mb-4 size-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t.tdsSelectHint}</p>
              <p className="mt-2 text-xs text-muted-foreground/60">
                {categories.length} {t.tdsCategories} · {guides.length} {t.tdsListLabel}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

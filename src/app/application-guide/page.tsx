"use client";

import { useState, useEffect, useMemo } from "react";
import { useLang } from "@/components/LanguageContext";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import type { Guide, GuideCategory } from "@/types";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

function GuideContent({ guide }: { guide: Guide }) {
  const { lang } = useLang();
  const content = lang === "zh" ? guide.contentZh : guide.content;
  const lines = content.split("\n");

  return (
    <div>
      <h2 className="mb-4 text-base font-semibold text-foreground font-heading">
        {lang === "zh" ? guide.titleZh : guide.title}
      </h2>
      <div>
        {lines.map((line, index) => {
          if (line.endsWith(":") && !line.startsWith(" ")) {
            return (
              <h3 key={index} className="mt-5 mb-1 text-sm font-semibold text-foreground">
                {line}
              </h3>
            );
          }
          if (line.match(/^\d+\./)) {
            return (
              <div key={index} className="ml-4">
                <p className="text-sm text-muted-foreground">{line}</p>
              </div>
            );
          }
          if (line.trim() === "") return <br key={index} />;
          return (
            <p key={index} className="text-sm leading-relaxed text-muted-foreground">
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}

export default function ApplicationGuidePage() {
  const { t, lang } = useLang();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<GuideCategory[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);

  useEffect(() => {
    fetch("/api/guides")
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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter((g) => {
        const t = lang === "zh" ? g.titleZh : g.title;
        const c = lang === "zh" ? g.contentZh : g.content;
        return t.toLowerCase().includes(q) || c.toLowerCase().includes(q);
      });
    }
    return r;
  }, [guides, selectedCategory, searchQuery, lang]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-white">
      <SiteHeader />

      {/* Body: 三栏布局 */}
      <div className="flex flex-1 flex-col pt-[84px] lg:flex-row lg:overflow-hidden">
        {/* 左栏：分类菜单 */}
        <div className="border-b border-border px-6 pt-5 pb-3 sm:px-8 md:pl-[60px] md:pr-4 lg:w-[240px] lg:flex-shrink-0 lg:border-b-0 lg:border-r lg:pt-8 lg:overflow-y-auto lg:max-h-[calc(100vh-64px)]">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.guideCategories}
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
              {t.guideAllCategories}
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
        </div>

        {/* 中栏：指南列表 */}
        <div className="border-b border-border bg-muted/50 p-4 pt-4 sm:p-5 lg:w-[320px] lg:flex-shrink-0 lg:border-b-0 lg:border-r lg:pt-5 lg:overflow-y-auto lg:max-h-[calc(100vh-64px)]">
          {/* 搜索框 */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.guideSearchPlaceholder}
              className="h-9 rounded-xl pl-9 text-2xs"
            />
          </div>

          <div className="flex flex-col gap-2">
            {filteredGuides.map((guide) => (
              <div
                key={guide.id}
                onClick={() => setSelectedGuide(guide)}
                className={`cursor-pointer rounded-xl border px-3.5 py-3 transition-colors ${
                  selectedGuide?.id === guide.id
                    ? "border-primary bg-blue-50/30 shadow-sm"
                    : "border-border/60 bg-white hover:border-primary"
                }`}
              >
                <p className="text-2xs font-semibold text-foreground md:text-sm">
                  {lang === "zh" ? guide.titleZh : guide.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {categories.find((c) => c.id === guide.categoryId)?.[lang === "zh" ? "nameZh" : "name"] || guide.categoryId}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 右栏：文章内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8 md:px-[60px] md:py-6">
          {selectedGuide ? (
            <GuideContent guide={selectedGuide} />
          ) : (
            <div className="flex min-h-[256px] items-center justify-center">
              <p className="text-sm text-muted-foreground">{t.guideSelectHint}</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

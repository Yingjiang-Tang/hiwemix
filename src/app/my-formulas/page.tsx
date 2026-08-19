"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { useLang } from "@/components/LanguageContext";
import { trackPageView } from "@/lib/analytics";
import { Spinner } from "@/components/ui/spinner";
import { Bookmark, Trash2 } from "lucide-react";
import { getFormulaImageCandidates } from "@/lib/color-photo";
import type { SearchResult, FormulaSnapshot } from "@/types";
import type { UserSavedFormula } from "@/lib/db-user-formulas";

// 复用首页的配方抽屉（懒加载）
const FormulaDrawer = dynamic(() => import("@/components/FormulaDrawer"), {
  ssr: false,
  loading: () => null,
});

// 卡片背景：优先真实车漆照片，加载失败/无照片时回退纯色块
function CardSwatch({
  photoCandidates,
  hex,
  alt,
}: {
  photoCandidates: string[];
  hex: string;
  alt: string;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const src = photoCandidates[Math.min(photoIdx, photoCandidates.length - 1)] ?? null;
  if (photoCandidates.length === 0 || photoFailed || !src) {
    return <div className="absolute inset-0" style={{ backgroundColor: hex }} />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="300px"
      className="absolute inset-0 object-cover"
      priority={false}
      onError={() => {
        if (photoIdx < photoCandidates.length - 1) {
          setPhotoIdx((i) => i + 1);
        } else {
          setPhotoFailed(true);
        }
      }}
    />
  );
}

export default function MyFormulasPage() {
  const { t } = useLang();
  const [items, setItems] = useState<UserSavedFormula[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [drawerResult, setDrawerResult] = useState<SearchResult | null>(null);

  // 页面访问埋点（首载一次）
  useEffect(() => { trackPageView("my-formulas"); }, []);

  // 拉取已保存配方列表
  useEffect(() => {
    fetch("/api/user-formulas")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setItems(d as UserSavedFormula[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 快照直接打开抽屉（零网络请求：formula_json 已含完整 Color + Formula）
  const openFromSnapshot = useCallback((snap: FormulaSnapshot) => {
    setDrawerResult({ color: snap.color, formulas: [snap.formula] });
  }, []);

  // 删除保存的配方
  async function handleDelete(item: UserSavedFormula) {
    setDeleting(item.id);
    try {
      const res = await fetch(`/api/user-formulas?id=${item.id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      }
    } catch {
      // 网络失败保持原样
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
      <SiteHeader />
      <div className="h-[84px]" />

      <main className="w-full flex-1 px-6 py-8 sm:px-8 md:px-[60px]">
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-level-1)]">
          {/* 容器顶部标题：书签 + 标题 + 计数 */}
          <div className="flex items-center justify-center gap-2 px-5 pt-6 sm:px-6">
            <Bookmark className="size-6 fill-primary text-primary" />
            <h1 className="font-heading text-[25px] font-semibold leading-tight text-foreground">{t.myFormulasTitle}</h1>
            <span className="font-heading text-[25px] font-semibold leading-tight text-foreground">( {items.length} )</span>
          </div>

          <div className="mt-4 border-b border-border" />

          <div className="flex flex-col items-center p-5 sm:p-6">
            <div className="mt-[60px] w-full">
              {loading ? (
                <div className="flex flex-col items-center py-20 text-muted-foreground">
                  <Spinner className="size-6" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center py-24 text-muted-foreground">
                  <Bookmark className="mb-3 size-10 text-muted-foreground/40" />
                  <p className="text-sm">{t.myFormulasEmpty}</p>
                  <p className="mt-1 text-xs">{t.myFormulasEmptyHint}</p>
                </div>
              ) : (
                <div
                  className="grid grid-cols-2 justify-items-center gap-x-0 gap-y-0 px-0 pb-4 sm:grid-cols-3 md:grid-cols-5"
                  style={{ ["--card-delay" as string]: "0s" }}
                >
                  {items.map((item) => {
                    const snap = item.formula_json as FormulaSnapshot;
                    const hex = snap.color.hex_preview ?? "#d1d5db";
                    const photoCandidates = getFormulaImageCandidates(snap.formula, snap.color);
                    return (
                      <div key={item.id} className="animate-card-row mb-[70px] w-[87.5%]">
                        <div
                          className="group relative w-full cursor-pointer overflow-hidden rounded-xl border border-border bg-card"
                          onClick={() => openFromSnapshot(snap)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFromSnapshot(snap); } }}
                          aria-label={`${snap.color.color_code} ${snap.color.color_name}`}
                        >
                          <div className="relative aspect-square w-full">
                            {photoCandidates.length > 0 ? (
                              <CardSwatch photoCandidates={photoCandidates} hex={hex} alt={`${snap.color.color_code} ${snap.color.color_name}`} />
                            ) : (
                              <div className="absolute inset-0" style={{ backgroundColor: hex }} />
                            )}
                          </div>

                          {/* 卡片右上角：删除按钮（移动端常显） */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                            disabled={deleting === item.id}
                            aria-label={t.myFormulasDelete}
                            className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-destructive max-md:opacity-100"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>

                        {/* 卡片下方信息块：名称 + 颜色代码 + 保存日期 */}
                        <div className="mt-[45px] text-left font-[family-name:var(--font-sans)]">
                          <p className="truncate text-[20px] font-normal leading-tight text-foreground">
                            {item.name}
                          </p>
                          <p className="mt-2 truncate text-[16px] font-normal leading-tight text-muted-foreground">
                            {snap.color.color_code} {snap.color.color_name}
                          </p>
                          <p className="truncate text-[16px] font-normal leading-tight text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
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
        onClose={() => setDrawerResult(null)}
      />
    </div>
  );
}

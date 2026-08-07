"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LanguageContext";
import { pickText } from "@/lib/i18n";
import Markdown from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import type { Guide } from "@/types";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";

interface TocItem {
  id: string;
  level: number;
  text: string;
}

export interface TdsGuideContentProps {
  guide: Guide | null;
  onBack?: () => void;
}

export default function TdsGuideContent({ guide, onBack }: TdsGuideContentProps) {
  const { t, lang } = useLang();
  const [activeId, setActiveId] = useState<string>("");
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  // 右侧导航栏容器：滚轮事件转发到左侧文档滚动容器
  const tocRef = useRef<HTMLElement | null>(null);

  const content = guide ? pickText(lang, guide.content || "", guide.contentZh) : "";
  const title = guide ? pickText(lang, guide.title, guide.titleZh) : "";

  // 章节闪烁：把目标章节 + 后续正文 8s 内变主题蓝
  const flashSection = (heading: HTMLElement) => {
    document.querySelectorAll("[data-flash]").forEach((n) => {
      const node = n as HTMLElement;
      node.style.color = "";
      node.style.transition = "";
      delete node.dataset.flash;
    });
    const targets: HTMLElement[] = [heading];
    const stopTag = heading.tagName === "H2" ? "H2" : "H2,H3";
    let next = heading.nextElementSibling;
    while (next && !next.matches(stopTag)) {
      targets.push(next as HTMLElement);
      next = next.nextElementSibling;
    }
    targets.forEach((t) => {
      t.dataset.flash = "1";
      t.style.transition = "none";
      t.style.color = "var(--primary)";
    });
    void document.body.offsetWidth;
    requestAnimationFrame(() => {
      targets.forEach((t) => {
        t.style.transition = "color 8s ease";
        t.style.color = "";
      });
      setTimeout(() => {
        targets.forEach((t) => {
          t.style.transition = "";
          delete t.dataset.flash;
        });
      }, 8000);
    });
  };

  // 从 DOM 读取真实 h2/h3（含 rehype-slug 生成的 id）
  const extractTocFromDom = () => {
    const body = bodyRef.current;
    if (!body) return [] as TocItem[];
    const out: TocItem[] = [];
    body.querySelectorAll("h2, h3").forEach((el) => {
      const id = el.id;
      if (!id) return;
      out.push({
        id,
        level: el.tagName === "H3" ? 3 : 2,
        text: el.textContent?.trim() ?? "",
      });
    });
    return out;
  };

  // Markdown 渲染完后提取 TOC
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    // 等待 Markdown 完成 + rehype-slug 渲染
    const raf = requestAnimationFrame(() => {
      setToc(extractTocFromDom());
    });
    return () => cancelAnimationFrame(raf);
  }, [guide, lang]);

  // 点击 TOC 条目：容器内滚动到目标 + 闪烁
  const onTocItemClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const item = toc[index];
    if (!item) return;
    const headings = bodyRef.current?.querySelectorAll("h2, h3");
    const el = headings?.[index];
    if (el instanceof HTMLElement && scrollRef.current) {
      const container = scrollRef.current;
      const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
      container.scrollTo({ top, behavior: "smooth" });
      setActiveId(item.id);
      flashSection(el);
    }
  };

  // 容器内滚动时高亮当前章节
  useEffect(() => {
    if (toc.length === 0) return;
    let raf = 0;
    const updateActive = () => {
      raf = 0;
      const container = scrollRef.current;
      if (!container) return;
      const st = container.scrollTop;
      // 顶部兜底
      if (st < 60) {
        setActiveId(toc[0].id);
        return;
      }
      // 底部兜底
      if (st + container.clientHeight >= container.scrollHeight - 40) {
        setActiveId(toc[toc.length - 1].id);
        return;
      }
      // 最后一个「top 距容器顶 <= 阈值」的章节
      const containerTop = container.getBoundingClientRect().top;
      const threshold = containerTop + 120;
      let active = "";
      for (const item of toc) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= threshold) active = item.id;
      }
      setActiveId(active);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(updateActive);
    };
    const container = scrollRef.current;
    if (!container) return;
    container.addEventListener("scroll", onScroll, { passive: true });
    updateActive();
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [toc]);

  // 右侧导航栏滚轮事件转发：鼠标在 TOC 栏内滚轮时，驱动左侧文档容器同步滚动
  // 用捕获阶段 + [] 依赖，避免 toc 数组变化导致 deps 大小变化（React Compiler 会展开数组元素报错）
  // 每次事件时通过 ref 实时读取容器，因此无需重绑
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const tocEl = tocRef.current;
      const container = scrollRef.current;
      if (!tocEl || !container) return;
      // 仅当鼠标事件源位于 TOC 栏内部时才转发
      if (!(e.target instanceof Node) || !tocEl.contains(e.target)) return;
      e.preventDefault();
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16; // DOM_DELTA_LINE：行数 → 像素
      else if (e.deltaMode === 2) delta *= window.innerHeight; // DOM_DELTA_PAGE
      container.scrollTop += delta;
    };
    // passive:false + capture 阶段拦截，阻止 TOC 栏/页面自身的默认滚动
    document.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => document.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  if (!guide) {
    return (
      <div className="flex h-full min-h-[256px] flex-col items-center justify-center text-center">
        <FileText className="mb-4 size-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t.tdsSelectHint}</p>
      </div>
    );
  }

  return (
    <div className="tds-guide-content flex h-full min-h-0">
      {/* 左栏：正文（容器内滚动） */}
      <div ref={scrollRef} className="flex-1 min-w-0 overflow-y-auto">
        <div className="px-6 py-5 sm:px-8 md:px-[60px] md:py-8">
          <div className="mx-auto max-w-[680px]">
            {/* 返回 */}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="tds-content-back-btn mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
              >
                <ChevronLeft className="size-3" />
                {t.tdsBackToList}
              </button>
            )}

            {/* 面包屑 */}
            <div className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Link href="/tds" className="hover:text-primary">
                {t.tdsCategories}
              </Link>
              <ChevronRight className="size-3" />
              <span className="text-foreground/80">{title}</span>
            </div>

            {/* 封面图 */}
            {guide.coverImage && (
              <img
                src={guide.coverImage}
                alt={title}
                className="mb-6 w-full rounded-lg border border-border object-cover"
              />
            )}

            {/* Markdown 正文 */}
            <div
              ref={bodyRef}
              className="prose prose-base max-w-none dark:prose-invert prose-headings:scroll-mt-[120px] prose-h1:text-3xl prose-h2:text-xl prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:mt-8 prose-h3:text-base font-sans"
            >
              <Markdown>{content}</Markdown>
            </div>
          </div>
        </div>
      </div>

      {/* 右栏：内嵌 TOC（不浮动） */}
      {toc.length > 0 && (
        <aside
          ref={tocRef}
          className="hidden w-[260px] flex-shrink-0 border-l border-border px-4 pt-8 pb-5 lg:block"
        >
          <div className="sticky top-0">
            <div className="mb-2">
              <span className="inline-flex items-center rounded-md border border-foreground/40 bg-background px-[13px] py-[5px] text-2xs font-semibold text-ink lg:text-[15px]">
                {t.tdsTableOfContents}
              </span>
            </div>
            <nav className="flex max-h-[calc(100vh-200px)] flex-col items-start gap-0.5 overflow-y-auto">
              {toc.map(({ id, level, text }, index) => (
                <a
                  key={`${id}-${index}`}
                  href={`#${id}`}
                  onClick={(e) => onTocItemClick(e, index)}
                  className={`w-fit rounded-md px-2 py-1.5 text-left text-[15px] transition-colors ${
                    activeId === id
                      ? "bg-muted-foreground/20 font-semibold text-foreground"
                      : level === 3
                        ? "ml-5 text-muted-foreground hover:bg-muted hover:text-foreground/80"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground/80"
                  }`}
                >
                  {text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}
    </div>
  );
}

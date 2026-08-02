"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLang } from "@/components/LanguageContext";
import Markdown from "@/components/Markdown";
import type { Guide } from "@/types";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export default function TdsDetailPage() {
  const params = useParams<{ category: string; id: string }>();
  const { t, lang } = useLang();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string>("");
  // 拖动只在标题栏生效：pointer 事件，按住标题栏拖动卡片
  const [tocPos, setTocPos] = useState({ x: 0, y: 0 });
  const tocPosRef = useRef({ x: 0, y: 0 });
  const [tocHidden, setTocHidden] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null); // Markdown 正文容器

  const onTocBarPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: tocPosRef.current.x,
      offsetY: tocPosRef.current.y,
    };
  };
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      e.preventDefault();
      const pos = {
        x: d.offsetX + (e.clientX - d.startX),
        y: d.offsetY + (e.clientY - d.startY),
      };
      tocPosRef.current = pos;
      setTocPos(pos);
    };
    const onPointerUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  // 双击标题栏回原位
  const onTocBarDoubleClick = () => {
    tocPosRef.current = { x: 0, y: 0 };
    setTocPos({ x: 0, y: 0 });
  };

  // 点击 TOC 条目：平滑滚动到对应章节，并用主题色边框闪烁标记目标
  const onTocItemClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault(); // 阻止默认 #hash 跳转（即使 id 匹配也不走默认路径）
    const item = toc[index];
    if (!item) return;
    const headings = bodyRef.current?.querySelectorAll("h2, h3");
    const el = headings?.[index];
    if (el instanceof HTMLElement) {
      // 目标章节滚动到视口垂直居中（比顶部更醒目，配合闪烁框提示）
      const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2;
      window.scrollTo({ top, behavior: "smooth" });
      setActiveId(item.id); // 立即高亮
      flashSection(el); // 标题+正文一起变主题蓝，8s 过渡回正常色
    }
  };

  // 章节闪烁提示：把目标章节（标题 + 其后续正文节点，直到下一个同级标题）
  // 整体变主题蓝，再在 8s 内过渡回正常色（黑）
  const flashSection = (heading: HTMLElement) => {
    // 还原上一次残留
    document.querySelectorAll("[data-flash]").forEach((n) => {
      const node = n as HTMLElement;
      node.style.color = "";
      node.style.transition = "";
      delete node.dataset.flash;
    });
    // 收集标题 + 后续正文节点：h2 收集到下一个 h2；h3 收集到下一个 h2/h3
    const targets: HTMLElement[] = [heading];
    const stopTag = heading.tagName === "H2" ? "H2" : "H2,H3";
    let next = heading.nextElementSibling;
    while (next && !next.matches(stopTag)) {
      targets.push(next as HTMLElement);
      next = next.nextElementSibling;
    }
    // 瞬时变主题蓝
    targets.forEach((t) => {
      t.dataset.flash = "1";
      t.style.transition = "none";
      t.style.color = "var(--primary)";
    });
    void document.body.offsetWidth; // 强制重排，确保重新触发动画
    // 下一帧：8s 渐变回正常色
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

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tds`)
      .then((r) => (r.ok ? r.json() : { guides: [] }))
      .then((d: { guides: Guide[] }) => {
        const g = d.guides?.find((x) => x.id === params.id) ?? null;
        setGuide(g);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const content = guide ? (lang === "zh" ? guide.contentZh || guide.content : guide.content || guide.contentZh) : "";
  const title = guide ? (lang === "zh" ? guide.titleZh : guide.title) : "";

  // 从 DOM 读取真实的 h2/h3（含 rehype-slug 生成的真实 id），保证点击跳转与高亮都指向真实元素
  const extractTocFromDom = () => {
    const body = bodyRef.current;
    if (!body) return [] as { id: string; level: number; text: string }[];
    const out: { id: string; level: number; text: string }[] = [];
    body.querySelectorAll("h2, h3").forEach((el) => {
      const id = el.id;
      if (!id) return; // 跳过无 id 的标题
      out.push({
        id,
        level: el.tagName === "H3" ? 3 : 2,
        text: el.textContent?.trim() ?? "",
      });
    });
    return out;
  };

  const [toc, setToc] = useState<{ id: string; level: number; text: string }[]>([]);
  // Markdown 渲染完成后（bodyRef 挂载）提取一次 TOC
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    setToc(extractTocFromDom());
  }, [guide, lang]);

  // 滚动监听高亮当前章节
  // 页面级滚动：监听 window 滚动 + 锚点滚动（hash 跳转），
  // 计算最后一个「顶部位置已越过视口顶 + 阈值」的章节作为 active
  useEffect(() => {
    if (toc.length === 0) return;

    let raf = 0;
    const updateActive = () => {
      raf = 0;
      const st = window.scrollY;
      // 顶部兜底：还没滚动时高亮第一章节
      if (st < 60) {
        setActiveId(toc[0].id);
        return;
      }
      // 底部兜底：滚到底时高亮最后一个章节
      if (st + window.innerHeight >= document.documentElement.scrollHeight - 40) {
        setActiveId(toc[toc.length - 1].id);
        return;
      }
      // 最后一个「顶部位置 <= 视口顶 + 阈值」的章节
      // getBoundingClientRect().top 就是距视口顶的距离，直接与阈值比较
      const threshold = 120; // header(84) + 一点余量
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
    window.addEventListener("scroll", onScroll, { passive: true });
    updateActive(); // 初始状态
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [toc]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Document not found</p>
        <Link href="/tds" className="text-sm text-primary hover:underline">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* 悬浮 TOC 卡片：默认停在文档左侧，按住标题栏可拖动到任意位置 */}
      <aside
        className="hidden w-[200px] rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm lg:block"
        style={{
          position: "fixed",
          left: 24,
          top: 96,
          transform: `translate(${tocPos.x}px, ${tocPos.y}px)`,
          zIndex: 40,
        }}
      >
        {/* 标题栏：按住拖动 */}
        <div
          onPointerDown={onTocBarPointerDown}
          onDoubleClick={onTocBarDoubleClick}
          className="mb-1 flex items-center justify-between"
          style={{ touchAction: "none", userSelect: "none", cursor: "grab" }}
          title="按住拖动，双击回原位"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.tdsTableOfContents}
          </span>
          <button
            type="button"
            onClick={() => setTocHidden(true)}
            className="text-muted-foreground hover:text-foreground"
            title="隐藏目录"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <nav className="flex max-h-[calc(100vh-200px)] flex-col gap-0.5 overflow-y-auto">
          {toc.map(({ id, level, text }, index) => (
            <a
              key={`${id}-${index}`}
              href={`#${id}`}
              onClick={(e) => onTocItemClick(e, index)}
              className={`rounded-md px-2 py-1.5 text-xs transition-colors ${
                level === 3 ? "pl-5" : ""
              } ${
                activeId === id
                  ? "bg-blue-50/60 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {text}
            </a>
          ))}
        </nav>
        <div className="mt-2 pt-2">
          <Link
            href="/tds"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ChevronLeft className="size-3" />
            {t.tdsBackToList}
          </Link>
        </div>
      </aside>

      {/* 隐藏后的恢复按钮 */}
      {tocHidden && (
        <button
          type="button"
          onClick={() => setTocHidden(false)}
          className="hidden lg:block fixed left-4 top-[96px] z-40 rounded-lg border border-border bg-card/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-lg hover:text-primary"
        >
          {t.tdsTableOfContents}
        </button>
      )}

      {/* 主内容 */}
      <article className="flex-1 min-w-0 px-6 py-5 sm:px-8 md:px-[60px] md:py-8">
        <div className="mx-auto max-w-[680px]">
          {/* 移动端返回 */}
          <Link
            href="/tds"
            className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary lg:hidden"
          >
            <ChevronLeft className="size-3" />
            {t.tdsBackToList}
          </Link>

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
          {/* scroll-mt 给锚点跳转留出 header 高度，避免标题被固定导航遮住 */}
          <div
            ref={bodyRef}
            className="prose prose-base max-w-none dark:prose-invert prose-headings:scroll-mt-[120px] prose-headings:font-heading prose-h1:text-3xl prose-h2:text-xl prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:mt-8 prose-h3:text-base"
          >
            <Markdown>{content}</Markdown>
          </div>

          {/* 文档脚注 */}
          <div className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
            <p>
              {guide.docType.toUpperCase()} · {guide.version}
              {guide.productSku ? ` · SKU: ${guide.productSku}` : ""}
            </p>
          </div>
        </div>
      </article>
    </>
  );
}
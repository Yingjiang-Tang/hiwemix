"use client";

import { useState, useEffect, useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";

// 回到顶部按钮：默认固定在页面右侧垂直居中，滚动超过一定距离才显示；
// 支持按住拖动到任意位置，松手后停留并记住（localStorage）
const STORAGE_KEY = "back-to-top-pos";
const DRAG_THRESHOLD = 5; // 位移超过此像素才算拖动（否则视为点击回顶）

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  // 路由切换时重新定位滚动容器（不同页面滚动容器可能不同）
  const pathname = usePathname();
  const btnRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);
  // 最近一次抬手是否为拖动：onClick 里区分「点击回顶」和「拖动结束」（pointerup 会先清空 dragRef）
  const draggedRef = useRef(false);

  // 挂载后读取持久化位置（clamp 回视口内，防止窗口尺寸变化后越界）
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { x?: unknown; y?: unknown };
        if (typeof p?.x === "number" && typeof p?.y === "number") {
          const w = btnRef.current?.offsetWidth ?? 44;
          const h = btnRef.current?.offsetHeight ?? 44;
          setPos({
            x: Math.min(Math.max(0, p.x), window.innerWidth - w),
            y: Math.min(Math.max(0, p.y), window.innerHeight - h),
          });
        }
      }
    } catch {}
  }, []);

  // 同时监听 main 与 window：首页用 main 作滚动容器（overflow-y-auto），
  // admin/favorites 等页面 main 不滚动、滚动发生在 body/window。
  // 只绑 main 会导致后者永不触发（按钮不显示 / 点击无效）。
  useEffect(() => {
    const main = document.querySelector("main");
    function onScroll() {
      const mainTop = main ? main.scrollTop : 0;
      const winTop = window.scrollY;
      const scrollTop = Math.max(mainTop, winTop);
      // 搜索区域（第二个 section）距容器顶部的偏移
      const searchSection = document.querySelector("main > section:nth-of-type(2)");
      const refTop = main ? main.scrollTop : winTop;
      const threshold = searchSection ? searchSection.getBoundingClientRect().top + refTop : 300;
      setVisible(scrollTop > threshold - 100);
    }
    onScroll();
    main?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      main?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
    // pathname 变化时重新绑定 listener（路由切换会换滚动容器）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function scrollToTop() {
    // 同时滚动 main 与 window：实际滚动的容器被滚回顶部，未滚动的容器 scrollTo 无操作
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // —— 拖动逻辑（Pointer Events，兼容鼠标/触摸） ——
  function handlePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!visible || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: rect.left,
      baseY: rect.top,
      moved: false,
    };
    setDragging(true);
    try { btnRef.current.setPointerCapture(e.pointerId); } catch {}
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    // 未超阈值前仍算点击，不做位置更新
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const w = btnRef.current?.offsetWidth ?? 44;
    const h = btnRef.current?.offsetHeight ?? 44;
    const maxX = window.innerWidth - w;
    const maxY = window.innerHeight - h;
    setPos({
      x: Math.min(Math.max(0, drag.baseX + dx), maxX),
      y: Math.min(Math.max(0, drag.baseY + dy), maxY),
    });
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const wasMoved = drag.moved;
    dragRef.current = null;
    draggedRef.current = wasMoved;
    setDragging(false);
    if (btnRef.current?.hasPointerCapture?.(e.pointerId)) {
      try { btnRef.current.releasePointerCapture(e.pointerId); } catch {}
    }
    if (wasMoved) {
      // 拖动结束：以抬手瞬间坐标计算最终位置并记住，刷新后保持
      const w = btnRef.current?.offsetWidth ?? 44;
      const h = btnRef.current?.offsetHeight ?? 44;
      const maxX = window.innerWidth - w;
      const maxY = window.innerHeight - h;
      const finalPos = {
        x: Math.min(Math.max(0, drag.baseX + (e.clientX - drag.startX)), maxX),
        y: Math.min(Math.max(0, drag.baseY + (e.clientY - drag.startY)), maxY),
      };
      setPos(finalPos);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPos)); } catch {}
    }
  }

  const hasPos = mounted && pos != null;
  const style: CSSProperties = hasPos ? { left: pos.x, top: pos.y } : {};

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={(e) => {
        if (draggedRef.current) { draggedRef.current = false; e.preventDefault(); return; }
        scrollToTop();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label="Back to top"
      title="Back to top"
      className={`fixed z-40 flex size-11 touch-none select-none cursor-grab items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg active:cursor-grabbing hover:border-primary/40 hover:text-primary ${
        hasPos ? "" : "right-6 bottom-6 md:right-[39px]"
      } ${
        dragging ? "" : "transition-[opacity,border-color,color] duration-300"
      } ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      style={style}
    >
      <ArrowUp className="size-5 pointer-events-none" />
    </button>
  );
}

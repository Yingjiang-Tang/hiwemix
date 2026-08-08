"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowUp } from "lucide-react";

// 回到顶部按钮：固定在页面右侧垂直居中，滚动超过一定距离才显示
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  // 定位页面主滚动容器（main 标签），同时兼容 window 滚动
  const getScrollContainer = useCallback((): HTMLElement | Window => {
    // 优先找 main 作为滚动容器（Home 页用了 main overflow-y-auto）
    const main = document.querySelector("main");
    if (main) {
      const style = getComputedStyle(main);
      if (style.overflowY === "auto" || style.overflowY === "scroll") return main;
    }
    return window;
  }, []);

  useEffect(() => {
    const container = getScrollContainer();
    function onScroll() {
      const el = container === window ? document.documentElement : (container as HTMLElement);
      const scrollTop = container === window ? window.scrollY : (container as HTMLElement).scrollTop;
      // 搜索区域（第二个 section）距容器顶部的偏移
      const searchSection = document.querySelector("main > section:nth-of-type(2)");
      const threshold = searchSection ? searchSection.getBoundingClientRect().top + scrollTop : 300;
      setVisible(scrollTop > threshold - 100);
    }
    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [getScrollContainer]);

  function scrollToTop() {
    const container = getScrollContainer();
    if (container === window) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      (container as HTMLElement).scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className={`fixed right-6 bottom-6 md:right-[39px] z-40 flex size-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg transition-all duration-300 hover:border-primary/40 hover:text-primary ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <ArrowUp className="size-5" />
    </button>
  );
}

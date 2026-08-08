"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";

// 回到顶部按钮：固定在页面右侧垂直居中，滚动超过一定距离才显示
export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  // 路由切换时重新定位滚动容器（不同页面滚动容器可能不同）
  const pathname = usePathname();

  // 定位页面主滚动容器：Home 页用 main 作为滚动容器（即使 hasExplored=false 时
  // main 是 overflow-hidden，切换为 true 时才是 overflow-y-auto；为避免挂载期误判，
  // 直接锁定 main，不再依赖 getComputedStyle 的 overflowY 值）
  const getScrollContainer = useCallback((): HTMLElement | Window => {
    if (typeof document === "undefined") return window;
    const main = document.querySelector("main");
    return main ?? window;
  }, []);

  useEffect(() => {
    const container = getScrollContainer();
    function onScroll() {
      const scrollTop = container === window ? window.scrollY : (container as HTMLElement).scrollTop;
      // 搜索区域（第二个 section）距容器顶部的偏移
      const searchSection = document.querySelector("main > section:nth-of-type(2)");
      const threshold = searchSection ? searchSection.getBoundingClientRect().top + scrollTop : 300;
      setVisible(scrollTop > threshold - 100);
    }
    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
    // pathname 变化时重新绑定 listener（路由切换会换滚动容器）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getScrollContainer, pathname]);

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

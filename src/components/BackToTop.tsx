"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

// 回到顶部按钮：固定在页面右侧垂直居中，滚动超过一定距离才显示
export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const SHOW_AFTER = 300;

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SHOW_AFTER);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className={`fixed right-6 top-1/2 z-40 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg transition-all duration-300 hover:border-primary/40 hover:text-primary ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <ArrowUp className="size-5" />
    </button>
  );
}

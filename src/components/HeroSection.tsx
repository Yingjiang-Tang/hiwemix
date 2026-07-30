"use client";

import Image from "next/image";
import { useRef, useCallback } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useLang } from "@/components/LanguageContext";
import { CheckCircle, ArrowRight } from "lucide-react";

interface HeroSectionProps {
  onExplore: () => void;
  animateEntrance?: boolean;
}

// 入场容器：错峰触发子项
const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

// 入场子项：透明度 + 上浮
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function HeroSection({ onExplore, animateEntrance = true }: HeroSectionProps) {
  const { t } = useLang();
  const reduces = useReducedMotion();
  const shouldAnimate = animateEntrance && !reduces;

  // 顶层（红车）背景容器引用，用于直接操作 CSS 变量，避免 React 重渲染
  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    // requestAnimationFrame 节流，每帧最多更新一次
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = overlayRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
      el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    const el = overlayRef.current;
    if (!el) return;
    el.style.setProperty("--mouse-x", "-9999px");
    el.style.setProperty("--mouse-y", "-9999px");
  }, []);

  return (
    // 撑满视口，fixed header 透明悬浮其上
    <section
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative h-[100svh] min-h-[640px] w-full overflow-hidden"
    >
      {/* 底层背景 — 黄车 */}
      <Image
        src="/bg-home.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {/* 顶层背景 — 红车，CSS Mask 探照灯透视 */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "url(/01.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          // 初始圆心在屏幕外，页面加载时无透视孔
          WebkitMaskImage:
            "radial-gradient(circle 30px at var(--mouse-x, -9999px) var(--mouse-y, -9999px), transparent 0%, rgba(0,0,0,0.3) 58%, black 100%)",
          maskImage:
            "radial-gradient(circle 30px at var(--mouse-x, -9999px) var(--mouse-y, -9999px), transparent 0%, rgba(0,0,0,0.3) 58%, black 100%)",
        }}
      />

      {/* 内容层：白字 + 品牌色，z-10 确保不被背景遮挡 */}
      <motion.div
        variants={shouldAnimate ? containerVariants : undefined}
        initial={shouldAnimate ? "hidden" : "visible"}
        animate="visible"
        className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 text-white -translate-y-[200px]"
      >
        {/* 顶部药丸标签 */}
        <motion.span
          variants={itemVariants}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur-sm"
        >
          <CheckCircle className="size-3.5" />
          {t.heroBadge}
        </motion.span>

        {/* 主标题：双行，纯白 */}
        <motion.h1
          variants={itemVariants}
          className="font-heading mt-6 text-center font-extrabold leading-[1.05] tracking-tight text-[clamp(2.5rem,5vw,4rem)]"
        >
          <span>{t.heroTitlePrefix} </span>
          <span className="text-white">{t.heroTitleHighlight}</span>
        </motion.h1>

        {/* 副标题 */}
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-5 max-w-[820px] text-center font-[family-name:var(--font-outfit)] text-[14px] font-light leading-relaxed text-white/85 md:mt-6 md:text-[16px]"
        >
          {t.heroSubtitle}
        </motion.p>

        {/* CTA 探索按钮 */}
        <button
          onClick={onExplore}
          type="button"
          className="group mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-9 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-xl shadow-primary/30 ring-1 ring-white/20 transition-transform duration-200 hover:scale-[1.04] hover:shadow-primary/50 active:scale-[0.98]"
        >
          {t.heroCta}
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </motion.div>
    </section>
  );
}

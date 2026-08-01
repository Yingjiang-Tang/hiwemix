"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useLang } from "@/components/LanguageContext";
import { CheckCircle, ArrowRight } from "lucide-react";
import ShinyText from "@/components/ShinyText";

interface HeroSectionProps {
  onExplore: () => void;
  animateEntrance?: boolean;
}

type SplitMode = "none" | "left" | "right";

// 从 1x.jpg 生成的遮罩图尺寸（1920px 宽版本）
const MASK_W = 1920;
const MASK_H = 919;

// Hero CTA 按钮呼吸动画周期（4 秒一个完整循环：缩小→恢复→缩小→恢复）
const HERO_CTA_BREATHE_S = 4;

export default function HeroSection({ onExplore }: HeroSectionProps) {
  const { t } = useLang();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  // 是否已发生首次指针交互：控制 SHY/pink 两张被裁剪图层是否挂载。
  // 首屏只下载可见的 BULE（LCP），另外两张合计 2.8MB 等第一次鼠标移入才加载。
  const [interacted, setInteracted] = useState(false);
  const interactedRef = useRef(false);

  // DOM 引用
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buleRef = useRef<HTMLImageElement>(null);
  const shyRef = useRef<HTMLImageElement>(null);
  const pinkRef = useRef<HTMLImageElement>(null);

  // 状态引用（不触发 React 重渲染，直接操作 DOM 以保证 60fps 流畅）
  const modeRef = useRef<SplitMode>("none");
  const splitXRef = useRef(0); // 分割线位置：占容器宽度的百分比 0-100
  const rafIdRef = useRef(0);
  const maskCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const maskReadyRef = useRef(false);
  const animatingRef = useRef(false);
  const coordsRef = useRef({ x: 0, y: 0 }); // 缓存最近一次指针坐标

  // 加载遮罩图到离屏 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = MASK_W;
    canvas.height = MASK_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    maskCtxRef.current = ctx;

    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      maskReadyRef.current = true;
    };
    img.src = "/car-mask.png";
  }, []);

  // 检查遮罩图某像素是否在车身范围内
  const isInMask = useCallback((imgX: number, imgY: number): boolean => {
    if (!maskReadyRef.current) return false;
    const ctx = maskCtxRef.current;
    if (!ctx) return false;
    const x = Math.round(imgX);
    const y = Math.round(imgY);
    if (x < 0 || x >= MASK_W || y < 0 || y >= MASK_H) return false;
    return ctx.getImageData(x, y, 1, 1).data[0] > 128;
  }, []);

  // 屏幕坐标 → 遮罩图坐标（补偿 object-cover 的缩放和偏移）
  const getCoords = useCallback(
    (clientX: number, clientY: number) => {
      const el = sectionRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      // object-cover = max(w 比, h 比) 缩放，居中裁剪
      const scale = Math.max(rect.width / MASK_W, rect.height / MASK_H);
      const renderedW = MASK_W * scale;
      const renderedH = MASK_H * scale;
      const offsetX = (rect.width - renderedW) / 2;
      const offsetY = (rect.height - renderedH) / 2;
      return {
        imgX: (clientX - rect.left - offsetX) / scale,
        imgY: (clientY - rect.top - offsetY) / scale,
        xPercent: ((clientX - rect.left) / rect.width) * 100,
      };
    },
    [],
  );

  // 更新图层 clip-path（直接操作 DOM，零重渲染开销）
  const applyClip = useCallback((xPercent: number, mode: SplitMode) => {
    const bule = buleRef.current;
    const shy = shyRef.current;
    const pink = pinkRef.current;
    const pct = Math.max(0, Math.min(100, xPercent));

    if (mode === "left") {
      // 左模式：SHY 在光标左侧，BULE 在光标右侧
      if (shy)   shy.style.clipPath   = `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`;
      if (bule)  bule.style.clipPath  = `polygon(${pct}% 0, 100% 0, 100% 100%, ${pct}% 100%)`;
      if (pink)  pink.style.clipPath  = `polygon(0 0, 0 0, 0 0, 0 0)`;
    } else if (mode === "right") {
      // 右模式：BULE 在光标左侧，pink 在光标右侧
      if (bule)  bule.style.clipPath  = `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`;
      if (pink)  pink.style.clipPath  = `polygon(${pct}% 0, 100% 0, 100% 100%, ${pct}% 100%)`;
      if (shy)   shy.style.clipPath   = `polygon(0 0, 0 0, 0 0, 0 0)`;
    } else {
      // 无交互：仅显示 BULE
      if (bule)  bule.style.clipPath  = "";
      if (shy)   shy.style.clipPath   = `polygon(0 0, 0 0, 0 0, 0 0)`;
      if (pink)  pink.style.clipPath  = `polygon(0 0, 0 0, 0 0, 0 0)`;
    }
  }, []);

  // 退出动画：分割线平滑滑向边缘 → 恢复全屏 BULE
  const animateExit = useCallback(() => {
    if (animatingRef.current) return;
    const mode = modeRef.current;
    if (mode === "none") return;

    animatingRef.current = true;
    const startX = splitXRef.current;
    const targetX = mode === "left" ? 0 : 100; // 左模式滑向左边缘，右模式滑向右边缘
    const DURATION = 300;
    let startTime: number | null = null;

    const step = (now: number) => {
      if (startTime === null) startTime = now;
      const t = Math.min((now - startTime) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      const currentX = startX + (targetX - startX) * eased;
      splitXRef.current = currentX;
      applyClip(currentX, mode);

      if (t < 1) {
        rafIdRef.current = requestAnimationFrame(step);
      } else {
        // 动画完成：重置状态
        modeRef.current = "none";
        modeRef.current = "none";
        splitXRef.current = 0;
        animatingRef.current = false;
        rafIdRef.current = 0;
        applyClip(0, "none");
      }
    };
    rafIdRef.current = requestAnimationFrame(step);
  }, [applyClip]);

  // RAF 回调：读取缓存坐标，执行遮罩检测 + 分屏更新
  const tick = useCallback(() => {
    rafIdRef.current = 0;

    const { x: clientX, y: clientY } = coordsRef.current;
    const coords = getCoords(clientX, clientY);
    if (!coords) return;

    if (isInMask(coords.imgX, coords.imgY)) {
      // 在车身范围内
      if (modeRef.current === "none") {
        // 首次进入 → 锁定模式（基于遮罩图水平中线）
        modeRef.current = coords.imgX < MASK_W / 2 ? "left" : "right";
      }
      splitXRef.current = coords.xPercent;
      applyClip(coords.xPercent, modeRef.current);
    } else if (modeRef.current !== "none") {
      // 离开范围 → 平滑恢复
      animateExit();
    }
  }, [getCoords, isInMask, applyClip, animateExit]);

  // 指针移动：缓存坐标 + RAF 节流；同时触发被裁剪图层的按需加载
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    coordsRef.current = { x: e.clientX, y: e.clientY };
    // 首次指针移入：挂载 SHY/pink（它们的 applyClip 已给出零面积 clip-path，交互开始时才真正可见）
    if (!interactedRef.current) {
      interactedRef.current = true;
      setInteracted(true);
    }
    if (!rafIdRef.current && !animatingRef.current) {
      rafIdRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  // 触摸移动（移动端 PointerEvent 不总是可靠，加一层兜底）
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      coordsRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      // 触摸交互同样按需加载被裁剪图层
      if (!interactedRef.current) {
        interactedRef.current = true;
        setInteracted(true);
      }
      if (!rafIdRef.current && !animatingRef.current) {
        rafIdRef.current = requestAnimationFrame(tick);
      }
    }
  }, [tick]);

  // 指针离开容器
  const handlePointerLeave = useCallback(() => {
    if (modeRef.current !== "none" && !animatingRef.current) animateExit();
  }, [animateExit]);

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    if (modeRef.current !== "none" && !animatingRef.current) animateExit();
  }, [animateExit]);

  // 清理
  useEffect(() => () => { if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current); }, []);

  return (
    <section
      ref={sectionRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative h-full min-h-[640px] w-full overflow-hidden"
      style={{ touchAction: "pan-y" }} // 允许纵向滚动，横向拖拽留给交互
    >
      {/* 内联 keyframes 配合上方 HERO_CTA_BREATHE_S 常量一起调整时长。
          放在 globals.css 时被 Turbopack 漏掉打包；改成内联 <style> 后每次渲染随组件输出。
          未来 Turbopack 修复后可以移回 globals.css。 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes heroCtaBreathe {
          0%, 50%, 100% { transform: scale(1); }
          25%, 75%      { transform: scale(0.95); }
        }
      ` }} />
      {/* 隐藏 Canvas：遮罩像素查询 */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* ---- 三层背景（从底到顶） ---- */}

      {/* Layer 1: pink — 右侧进入时出现在光标右侧（首屏不加载，鼠标移入后按需下载） */}
      {interacted && (
        <img
          ref={pinkRef}
          src="/pink.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{ zIndex: 0, clipPath: "polygon(0 0, 0 0, 0 0, 0 0)" }}
          draggable={false}
        />
      )}

      {/* Layer 2: SHY — 左侧进入时出现在光标左侧（首屏不加载，鼠标移入后按需下载） */}
      {interacted && (
        <img
          ref={shyRef}
          src="/SHY.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{ zIndex: 1, clipPath: "polygon(0 0, 0 0, 0 0, 0 0)" }}
          draggable={false}
        />
      )}

      {/* Layer 3: BULE — 默认全屏显示（LCP，立即加载） */}
      <img
        ref={buleRef}
        src="/BULE.jpg"
        alt=""
        fetchPriority="high"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ zIndex: 2 }}
        draggable={false}
      />

      {/* ---- 内容层 (z-10) ---- */}
      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 text-white -translate-y-[220px] pointer-events-none">
        <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur-sm">
          <CheckCircle className="size-3.5" />
          {t.heroBadge}
        </span>
        <h1 className="font-heading mt-6 text-center font-extrabold leading-[1.05] tracking-tight text-[clamp(2.5rem,5vw,4rem)]">
          <ShinyText
            text={`${t.heroTitlePrefix} ${t.heroTitleHighlight}`}
            color="#ffffff"
            shineColor="#79a5ff"
            speed={2.5}
            spread={120}
          />
        </h1>
        <p className="mx-auto mt-5 max-w-[820px] text-center font-[family-name:var(--font-outfit)] text-[14px] font-light leading-relaxed text-white/85 md:mt-6 md:text-[16px]">
          {t.heroSubtitle}
        </p>
        <span
          className="pointer-events-auto inline-block mt-10"
          style={{
            animation: `heroCtaBreathe ${HERO_CTA_BREATHE_S}s ease-in-out infinite`,
          }}
        >
          <button
            onClick={onExplore}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            type="button"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-9 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-xl shadow-primary/30 ring-1 ring-white/20"
            style={{
              transform: isHovered ? "scale(0.91)" : "scale(1)",
              filter: (isHovered || isPressed) ? "saturate(1.5)" : "saturate(1)",
              transition: "transform 0.3s cubic-bezier(0,0,0.2,1), filter 0.3s cubic-bezier(0,0,0.2,1)",
            }}
          >
            {t.heroCta}
            <ArrowRight className="size-4" />
          </button>
        </span>
      </div>
    </section>
  );
}

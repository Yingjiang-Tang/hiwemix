"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LanguageContext";
import ShinyText from "@/components/ShinyText";
import { ArrowRight, ChevronDown } from "lucide-react";

interface HeroSectionProps {
  onExplore: () => void;
}

export default function HeroSection({ onExplore }: HeroSectionProps) {
  const { t } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [playFailed, setPlayFailed] = useState(false);

  // 仅当视频可播放后才淡入视频层，慢网下先显示渐变背景，不阻塞首屏
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleCanPlay = () => setVideoReady(true);
    const handleError = () => setPlayFailed(true);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);
    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
    };
  }, []);

  // 尊重系统"减少动态效果"偏好 + 切标签页时暂停解码节省 CPU
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) {
      video.pause();
      return;
    }

    const handleVisibility = () => {
      if (!videoRef.current) return;
      if (document.hidden) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const showVideo = videoReady && !playFailed;

  return (
    <section className="relative h-full min-h-[640px] w-full overflow-hidden bg-gradient-to-b from-white via-[#e8f4fc] to-[#2487ca] max-md:bg-background max-md:bg-none">
      {/* ---- 封面图：桌面端视频就绪前填充白屏；移动端因视频 hidden 始终显示 ---- */}
      <img
        src="/video/hero-poster.jpg"
        alt=""
        aria-hidden="true"
        className={`hidden md:block absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          showVideo ? "opacity-0" : "opacity-100"
        }`}
      />
      {/* ---- 背景视频层 ---- */}
      <video
        ref={videoRef}
        className={`hidden md:block absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          showVideo ? "opacity-100" : "opacity-0"
        }`}
        src="/video/hero.mp4"
        preload="metadata"
        muted
        loop
        autoPlay
        playsInline
        aria-hidden="true"
        tabIndex={-1}
      />
      {/* ---- 黑色滤镜叠加层 ---- */}
      <div
        className="pointer-events-none absolute inset-0 bg-black/30 max-md:hidden"
        aria-hidden="true"
      />
      {/* ---- 文字可读性叠加层 ---- */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700 max-md:hidden"
        style={{
          opacity: showVideo ? 0.35 : 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)",
        }}
        aria-hidden="true"
      />
      {/* ---- 内容层 ---- */}
      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 text-white max-md:text-foreground -translate-y-[130px] md:-translate-y-[50px]">
        <h1 className="font-heading mt-6 text-center font-medium leading-[1.1] tracking-tight text-[54px] md:leading-[1.05] md:text-[80px] flex flex-col items-center gap-1 whitespace-nowrap max-md:whitespace-normal">
          {/* 移动端：主蓝色 ShinyText（亮色背景下蓝字可读），白色光带高亮 */}
          <ShinyText
            className="hero-shiny-mobile"
            text={t.heroTitlePrefix}
            color="#79a5ff"
            shineColor="#ffffff"
            speed={2.5}
            spread={120}
          />
          <ShinyText
            className="hero-shiny-mobile"
            text={t.heroTitleHighlight}
            color="#79a5ff"
            shineColor="#ffffff"
            speed={2.5}
            spread={120}
          />
          {/* 桌面端：白字 + 蓝光带（暗色视频背景上原效果） */}
          <ShinyText
            className="hero-shiny-desktop"
            text={t.heroTitlePrefix}
            color="#ffffff"
            shineColor="#79a5ff"
            speed={2.5}
            spread={120}
          />
          <ShinyText
            className="hero-shiny-desktop"
            text={t.heroTitleHighlight}
            color="#ffffff"
            shineColor="#79a5ff"
            speed={2.5}
            spread={120}
          />
        </h1>
        <span className="pointer-events-auto inline-block mt-10 max-md:absolute max-md:bottom-20 max-md:left-1/2 max-md:-translate-x-1/2 max-md:mt-0">
          <button
            onClick={onExplore}
            type="button"
            style={{ fontWeight: 300 }}
            className="group inline-flex items-center gap-2 rounded-full bg-transparent px-9 py-4 capitalize tracking-[0.08em] text-[19px] max-md:text-[16px] text-white max-md:text-foreground max-md:px-0 transition-all duration-300 ease-out hover:bg-white/10 max-md:hover:bg-foreground/5 hover:scale-105 active:scale-95 font-[family-name:var(--font-sans)]"
          >
            {t.heroCta}
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 max-md:hidden" />
          </button>
        </span>
        {/* 向下滑动指示器 — 仅移动端，点击滚到搜索区域 */}
        <button
          onClick={onExplore}
          className="hidden max-md:block absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer text-foreground/40 hover:text-foreground/70 transition-colors"
          aria-label="Scroll down to formula search"
        >
          <ChevronDown className="size-8" strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
}

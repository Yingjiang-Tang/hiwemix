"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LanguageContext";
import ShinyText from "@/components/ShinyText";
import { ArrowRight } from "lucide-react";

interface HeroSectionProps {
  onExplore: () => void;
  animateEntrance?: boolean;
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
      return; // 用户不要动效，后续监听无需注册
    }

    // 页面切到后台时暂停视频解码，切回来恢复
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
    <section className="relative h-full min-h-[640px] w-full overflow-hidden bg-gradient-to-b from-white via-[#e8f4fc] to-[#2487ca]">
      {/* ---- 封面图：瞬间加载，视频就绪前填充白屏 ---- */}
      <img
        src="/video/hero-poster.jpg"
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          showVideo ? "opacity-0" : "opacity-100"
        }`}
      />
      {/* ---- 背景视频层 ---- */}
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
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
        className="pointer-events-none absolute inset-0 bg-black/30"
        aria-hidden="true"
      />
      {/* ---- 文字可读性叠加层 ---- */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: showVideo ? 0.35 : 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)",
        }}
        aria-hidden="true"
      />
      {/* ---- 内容层 ---- */}
      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 text-white -translate-y-[50px]">
        <h1
          className="font-heading mt-6 text-center font-medium leading-[1.05] tracking-tight whitespace-nowrap"
          style={{ fontSize: "80px" }}
        >
          <ShinyText
            text={`${t.heroTitlePrefix} ${t.heroTitleHighlight}`}
            color="#ffffff"
            shineColor="#79a5ff"
            speed={2.5}
            spread={120}
          />
        </h1>
        <span className="pointer-events-auto inline-block mt-10">
          <button
            onClick={onExplore}
            type="button"
          style={{ fontSize: "19px", fontWeight: 400 }}
          className="group inline-flex items-center gap-2 rounded-full bg-transparent px-9 py-4 capitalize tracking-[0.15em] text-white transition-all duration-300 ease-out hover:bg-white/10 hover:scale-105 active:scale-95 font-[family-name:var(--font-sans)]"
          >
            {t.heroCta}
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </span>
      </div>
    </section>
  );
}

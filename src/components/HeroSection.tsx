"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LanguageContext";
import ShinyText from "@/components/ShinyText";

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

  // 尊重系统"减少动态效果"偏好
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches && videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  const showVideo = videoReady && !playFailed;

  return (
    <section className="relative h-full min-h-[640px] w-full overflow-hidden bg-gradient-to-b from-white via-[#e8f4fc] to-[#2487ca]">
      {/* ---- 背景视频层 ---- */}
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          showVideo ? "opacity-100" : "opacity-0"
        }`}
        src="/video/hero.mp4"
        poster="/video/hero-poster.jpg"
        preload="metadata"
        muted
        loop
        autoPlay
        playsInline
        aria-hidden="true"
        tabIndex={-1}
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
      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 text-white">
        <h1
          className="font-heading mt-6 text-center font-light leading-[1.05] tracking-tight whitespace-nowrap"
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
        <p
          className="mx-auto mt-5 max-w-[1100px] text-center font-[family-name:var(--font-sans)] leading-relaxed text-white/85 md:mt-6 whitespace-pre-line"
          style={{ fontSize: "21px", fontWeight: 300 }}
        >
          {t.heroSubtitle}
        </p>
        <span className="pointer-events-auto inline-block mt-10">
          <button
            onClick={onExplore}
            type="button"
          style={{ fontSize: "16px", fontWeight: 400 }}
          className="group inline-flex items-center gap-2 rounded-full border-2 border-white bg-transparent px-9 py-4 capitalize tracking-[0.15em] text-white transition-all duration-300 ease-out hover:bg-white/10 hover:scale-105 active:scale-95 font-[family-name:var(--font-sans)]"
          >
            {t.heroCta}
          </button>
        </span>
      </div>
    </section>
  );
}

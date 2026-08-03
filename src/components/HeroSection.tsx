"use client";

import { useLang } from "@/components/LanguageContext";
import ShinyText from "@/components/ShinyText";

interface HeroSectionProps {
  onExplore: () => void;
  animateEntrance?: boolean;
}

export default function HeroSection({ onExplore }: HeroSectionProps) {
  const { t } = useLang();

  return (
    <section
      className="relative h-full min-h-[640px] w-full overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(180deg, #ffffff 0%, #e8f4fc calc(15% - 50px), #2487ca calc(65% - 50px), #1d6fb0 100%)",
      }}
    >
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
          className="mx-auto mt-5 max-w-[1100px] text-center font-[family-name:var(--font-outfit)] leading-relaxed text-white/85 md:mt-6 whitespace-pre-line"
          style={{ fontSize: "21px", fontWeight: 300 }}
        >
          {t.heroSubtitle}
        </p>
        <span className="pointer-events-auto inline-block mt-10">
          <button
            onClick={onExplore}
            type="button"
          style={{ fontSize: "16px", fontWeight: 400 }}
          className="group inline-flex items-center gap-2 rounded-full border-2 border-white bg-transparent px-9 py-4 capitalize tracking-[0.15em] text-white transition-all duration-300 ease-out hover:bg-white/10 hover:scale-105 active:scale-95 font-[family-name:var(--font-outfit)]"
          >
            {t.heroCta}
          </button>
        </span>
      </div>
    </section>
  );
}

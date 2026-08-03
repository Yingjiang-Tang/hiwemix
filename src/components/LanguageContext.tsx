"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { i18n, LANGS, type Lang } from "@/lib/i18n";

// 服务器端和客户端首次渲染统一用 "en"，避免 hydration mismatch
// 真实语言在 useEffect 中从 localStorage 读取

// ============================================================
// Language Context
// ============================================================
type Translations = (typeof i18n)["en"];

interface LanguageContextValue {
  lang: Lang;
  t: Translations;
  dir: "ltr" | "rtl";
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("site-language", l);
    } catch { /* noop */ }
  }, []);

  // 客户端挂载后从 localStorage 读取真实语言，避免 SSR/客户端不一致
  useEffect(() => {
    try {
      const stored = localStorage.getItem("site-language");
      if (stored && stored !== lang) {
        setLangState(stored as Lang);
      }
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 同步 <html lang>；布局方向固定 LTR（不做 RTL 镜像，避免界面翻转），阿语/希语字体由 globals.css 按 lang 应用
  const dir = LANGS.find((l) => l.code === lang)?.dir ?? "ltr";
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = "ltr";
    }
  }, [lang, dir]);

  // 不支持的语言回退到英文翻译
  const translations = (i18n as Record<string, unknown>)[lang] ?? i18n.en;

  const value: LanguageContextValue = {
    lang,
    t: translations as unknown as Translations,
    dir,
    setLang,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}

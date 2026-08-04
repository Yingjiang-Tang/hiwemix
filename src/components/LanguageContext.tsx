"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { ENGLISH_DEFAULTS, LANGS, type Lang, type I18nDict } from "@/lib/i18n";
import { loadDict } from "@/lib/i18n/loader";

// ============================================================
// Language Context
// 复刻 Kapci 翻译架构：翻译字典按需异步加载（切语言才下载 chunk），
// 缺键自动回退英文原文（ENGLISH_DEFAULTS）。语言只存 localStorage，不写 URL。
// 首帧同步用英文（en 可由 ENGLISH_DEFAULTS 同步构造，无 import 等待），
// 避免 SSR/客户端 hydration mismatch。
// ============================================================

interface LanguageContextValue {
  lang: Lang;
  t: I18nDict;
  dir: "ltr" | "rtl";
  loading: boolean;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [t, setT] = useState<I18nDict>(ENGLISH_DEFAULTS);
  const [loading, setLoading] = useState(false);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setLoading(true);
    try {
      localStorage.setItem("site-language", l);
    } catch { /* noop */ }
    loadDict(l)
      .then((d) => setT(d))
      .catch(() => {
        // 加载失败回退英文原文（Kapci fallbackLng: "en"）
        setT(ENGLISH_DEFAULTS);
      })
      .finally(() => setLoading(false));
  }, []);

  // 客户端挂载后从 localStorage 读取真实语言，避免 SSR/客户端不一致
  useEffect(() => {
    try {
      const stored = localStorage.getItem("site-language");
      if (stored && stored !== lang) {
        setLang(stored as Lang);
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

  const value: LanguageContextValue = {
    lang,
    t,
    dir,
    loading,
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

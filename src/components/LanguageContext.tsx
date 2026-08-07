"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { ENGLISH_DEFAULTS, LANGS, type Lang, type I18nDict } from "@/lib/i18n";
import { loadDict } from "@/lib/i18n/loader";
import { getClientCookie, setClientCookie, LANG_COOKIE } from "@/lib/cookies";

// ============================================================
// Language Context
// 复刻 Kapci 翻译架构：翻译字典按需异步加载（切语言才下载 chunk），
// 缺键自动回退英文原文（ENGLISH_DEFAULTS）。
// 语言存 cookie：服务端组件可用 cookies() 读到，实现首屏正确语言 SSR，
// 消除英文一闪再变目标语言的 flash。不写 URL。
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

export function LanguageProvider({ children, initialLang = "en" }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [t, setT] = useState<I18nDict>(ENGLISH_DEFAULTS);
  const [loading, setLoading] = useState(false);

  // SSR 已解析出 cookie 语言（layout 传入 initialLang）：挂载后立即加载对应字典，
  // 避免首屏固定英文后再翻折（客户端无 cookie 时由下方 effect 兜底）
  useEffect(() => {
    if (initialLang !== "en") {
      loadDict(initialLang).then((d) => setT(d)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setLoading(true);
    try {
      setClientCookie(LANG_COOKIE, l);
    } catch { /* noop */ }
    loadDict(l)
      .then((d) => setT(d))
      .catch(() => {
        // 加载失败回退英文原文（Kapci fallbackLng: "en"）
        setT(ENGLISH_DEFAULTS);
      })
      .finally(() => setLoading(false));
  }, []);

  // 客户端挂载后从 cookie 读取真实语言，避免 SSR/客户端不一致
  useEffect(() => {
    try {
      const stored = getClientCookie(LANG_COOKIE);
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

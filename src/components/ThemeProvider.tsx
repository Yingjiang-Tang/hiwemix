"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setClientCookie, getClientCookie } from "@/lib/cookies";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "hiwemix-theme";

function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  // 优先 localStorage（老逻辑兼容）；其次 cookie（SSR 写入）
  const v = window.localStorage.getItem(STORAGE_KEY) ?? getClientCookie(STORAGE_KEY);
  if (v === "light" || v === "dark") return v;
  return null;
}

function applyThemeClass(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) {
      setThemeState(stored);
      applyThemeClass(stored);
      // 把主题同步为 cookie：让后续 SSR 首屏直接输出正确主题，消除防闪烁脚本依赖
      try {
        if (getClientCookie(STORAGE_KEY) === null) setClientCookie(STORAGE_KEY, stored);
      } catch {
        /* 静默降级 */
      }
    } else {
      applyThemeClass("dark");
    }
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyThemeClass(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
      setClientCookie(STORAGE_KEY, t);
    } catch {
      /* localStorage 不可用时静默降级 */
    }
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
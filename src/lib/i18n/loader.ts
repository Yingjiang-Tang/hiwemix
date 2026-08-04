// ============================================================
// 翻译字典按需加载器 — 每种语言独立 chunk，切换时才下载
// （复刻 Kapci 翻译资源文件化 + 异步加载：不进主 bundle）
// 用字面量模块 map（import("./en")），不能用模板变量，否则 webpack/turbopack 无法静态分包
// ============================================================
"use client";

import type { I18nDict } from "./_helpers";
import type { Lang } from "./meta";

type DictLoader = () => Promise<{ default: I18nDict }>;

const MODULES: Record<Lang, DictLoader> = {
  en: () => import("./en"),
  zh: () => import("./zh"),
  fr: () => import("./fr"),
  de: () => import("./de"),
  es: () => import("./es"),
  pt: () => import("./pt"),
  it: () => import("./it"),
  ru: () => import("./ru"),
  sl: () => import("./sl"),
  tr: () => import("./tr"),
  he: () => import("./he"),
  ar: () => import("./ar"),
};

const cache = new Map<string, I18nDict>();

export async function loadDict(lang: Lang): Promise<I18nDict> {
  const cached = cache.get(lang);
  if (cached) return cached;
  const { default: d } = await MODULES[lang]();
  cache.set(lang, d);
  return d;
}

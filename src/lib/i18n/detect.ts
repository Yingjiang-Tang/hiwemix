// ============================================================
// 浏览器语言自动检测 — 无 site-language cookie 时按 Accept-Language 兜底
// 用户手动切换后写入 cookie，之后始终以 cookie 为准
// ============================================================
import { LANGS, type Lang } from "./meta";

// 旧式语言标签别名（希伯来语的旧标签是 iw，部分浏览器仍会发送）
const ALIASES: Record<string, Lang> = {
  iw: "he",
};

const SUPPORTED = new Set<string>(LANGS.map((l) => l.code));

/** 解析 Accept-Language 头，返回第一个受支持的语言；无匹配返回 null */
export function detectLangFromAcceptLanguage(header: string | null): Lang | null {
  if (!header) return null;

  // "de-DE,de;q=0.9,en;q=0.8" → 按 q 权重降序排列（缺省 q=1）
  const entries = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of entries) {
    // 只看主语言子标签：pt-BR → pt，zh-Hans → zh
    const primary = tag.split("-")[0];
    if (ALIASES[primary]) return ALIASES[primary];
    if (SUPPORTED.has(primary)) return primary as Lang;
  }
  return null;
}

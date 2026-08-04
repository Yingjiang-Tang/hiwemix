// ============================================================
// 国际化 Barrel — 语言元信息由 languages.json 驱动
// 翻译字典改为按需加载（见 loader.ts），不再集中打包全部语言
// ============================================================

export type { Lang, LangMeta } from "./meta";
export { LANGS } from "./meta";
export { ENGLISH_DEFAULTS, dict, plural, pickText } from "./_helpers";
export type { I18nDict } from "./_helpers";

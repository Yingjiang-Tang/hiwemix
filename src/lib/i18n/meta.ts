// ============================================================
// 语言元信息 — 由 languages.json 驱动，增删语言只改 JSON 不改代码
// （复刻 Kapci 从 AppSettings.json 动态加载语言列表的架构）
// ============================================================
import langs from "./languages.json";

export interface LangMeta {
  code: string;
  name: string;
  flag: string;
  dir: "ltr" | "rtl";
}

export type Lang = (typeof langs)[number]["code"];

// JSON 字面量把 dir 推断为 string，这里断言为 LangMeta[]（dir 收窄为 "ltr" | "rtl"）
export const LANGS: LangMeta[] = langs as LangMeta[];

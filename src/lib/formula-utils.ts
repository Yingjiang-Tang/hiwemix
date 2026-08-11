import type { YearEntry } from "@/types";

// 纯函数工具集：可被客户端组件安全引用（不含任何服务端依赖）。
// 涉及 YearEntry 的展示与匹配逻辑集中在此，避免导入 db-* 模块把服务端代码带进客户端 bundle。

// 判断 YearEntry 是否包含目标年份
export function yearEntryContains(entry: YearEntry, target: number): boolean {
  if (entry.year_end == null) return entry.year === target;
  return entry.year <= target && target <= entry.year_end;
}

// 格式化 YearEntry 为显示字符串："2020" 或 "2001-2009"
export function formatYearEntry(entry: YearEntry): string {
  if (entry.year_end == null) return String(entry.year);
  return `${entry.year}-${entry.year_end}`;
}

import type { Color, Formula, YearEntry } from "@/types";
import { formatYearEntry, yearEntryContains } from "./formula-utils";

// 合并重复、重叠及相邻区间；保留真实空档，不扩展适用范围。
export function normalizeYears(entries: YearEntry[]): YearEntry[] {
  const sorted = entries.map((e) => ({ year: e.year, year_end: e.year_end ?? e.year })).sort((a, b) => a.year - b.year);
  const merged: typeof sorted = [];
  for (const entry of sorted) {
    const last = merged.at(-1);
    if (last && entry.year <= last.year_end + 1) last.year_end = Math.max(last.year_end, entry.year_end);
    else merged.push({ ...entry });
  }
  return merged.map((e) => e.year === e.year_end ? { year: e.year } : e);
}

// 旧快照没有模式字段时，与历史数据库记录一致，沿用颜色年份。
export function formulaYearMode(formula: Pick<Formula, "year_mode">): "inherit" | "custom" {
  return formula.year_mode === "custom" ? "custom" : "inherit";
}

export function effectiveFormulaYears(formula: Pick<Formula, "year_mode" | "years">, color: Pick<Color, "years">): YearEntry[] {
  return normalizeYears(formulaYearMode(formula) === "custom" ? formula.years ?? [] : color.years ?? []);
}

export function formatYears(entries: YearEntry[]): string {
  return normalizeYears(entries).map(formatYearEntry).join(", ");
}

export function yearsContainedBy(entries: YearEntry[], container: YearEntry[]): boolean {
  return entries.every((entry) => {
    for (let year = entry.year; year <= (entry.year_end ?? entry.year); year++) {
      if (!container.some((range) => yearEntryContains(range, year))) return false;
    }
    return true;
  });
}

export function yearsOverlap(a: YearEntry[], b: YearEntry[]): boolean {
  return a.some((left) => b.some((right) => left.year <= (right.year_end ?? right.year) && right.year <= (left.year_end ?? left.year)));
}

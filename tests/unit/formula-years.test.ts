import { describe, expect, test } from "vitest";
import { effectiveFormulaYears, normalizeYears, yearsContainedBy, yearsOverlap, formatYears } from "@/lib/formula-years";
import { validateFormulaYears } from "@/lib/admin-validation";
import { searchFormulas } from "@/lib/search-formulas";
import type { Color, Formula } from "@/types";

const color: Color = { id: "c", make_id: "brand", color_code: "001", color_name: "White", color_type: ["solid"], hex_preview: "#fff", variants: [], years: [{ year: 2018, year_end: 2025 }] };
const base: Formula = { id: "legacy", color_id: "c", variant_id: "", version: "v1", paint_system: "2K", formula_type: "Single Stage", components: [], notes: "", updated_at: "" };
const a: Formula = { ...base, id: "A", year_mode: "custom", years: [{ year: 2018, year_end: 2021 }] };
const b: Formula = { ...base, id: "B", year_mode: "custom", years: [{ year: 2022, year_end: 2025 }] };
function search(year?: string, formulas = [a, b]) { return searchFormulas([color], formulas, [], { year }); }

describe("配方年份", () => {
  test.each([["2020", "A"], ["2024", "B"], ["2018", "A"], ["2021", "A"], ["2022", "B"], ["2025", "B"]])("%s 精确匹配 %s，切换列表同步过滤", (year, id) => {
    const result = search(year);
    expect(result.rows.map((row) => row.formula.id)).toEqual([id]);
    expect(result.results[0].formulas.map((f) => f.id)).toEqual([id]);
  });
  test("不使用相邻年份替代；不选年份时每个配方仅一次", () => {
    expect(search("2026").results).toEqual([]);
    expect(search("2020.5").results).toEqual([]);
    expect(search("2020invalid").results).toEqual([]);
    expect(search().rows.map((row) => row.formula.id)).toEqual(["A", "B"]);
  });
  test("明确匹配优先，历史继承与重叠备选均保留", () => {
    const alt = { ...a, id: "alternative", version: "v99" };
    expect(search("2020", [base, a, alt]).rows.map((r) => r.formula.id)).toEqual(["A", "alternative", "legacy"]);
    expect(effectiveFormulaYears(base, color)).toEqual(color.years);
  });
  test("多区间去重、合并相邻年份并保留空档", () => {
    const years = [{ year: 2024 }, { year: 2018, year_end: 2021 }, { year: 2020 }, { year: 2025 }];
    expect(normalizeYears(years)).toEqual([{ year: 2018, year_end: 2021 }, { year: 2024, year_end: 2025 }]);
    const multi = { ...a, years };
    expect(search("2023", [multi]).rows).toEqual([]);
    expect(search(undefined, [multi]).rows).toHaveLength(1);
    expect(formatYears(years)).toContain("2024");
  });
  test("覆盖校验不能越过颜色年份空档，相邻颜色区间可以覆盖", () => {
    expect(yearsContainedBy([{ year: 2020, year_end: 2024 }], [{ year: 2018, year_end: 2021 }, { year: 2023, year_end: 2025 }])).toBe(false);
    expect(yearsContainedBy([{ year: 2020, year_end: 2024 }], [{ year: 2018, year_end: 2021 }, { year: 2022, year_end: 2025 }])).toBe(true);
    expect(yearsOverlap(a.years!, b.years!)).toBe(false);
    expect(yearsOverlap(a.years!, [{ year: 2021 }])).toBe(true);
  });
  test("新建主动选择；旧编辑省略字段保留，部分字段不能省略", () => {
    expect(validateFormulaYears({}, true)).toBeTruthy();
    expect(validateFormulaYears({})).toBeNull();
    expect(validateFormulaYears({ year_mode: "inherit" })).toBeTruthy();
    expect(validateFormulaYears({ years: [] })).toBeTruthy();
    expect(validateFormulaYears({ year_mode: "custom", years: [] })).toBeTruthy();
    expect(validateFormulaYears({ year_mode: "inherit", years: [{ year: 2020 }] })).toBeTruthy();
    expect(validateFormulaYears({ year_mode: "custom", years: [{ year: 2020 }] }, true)).toBeNull();
    expect(validateFormulaYears({ year_mode: "custom", years: [{ year: 2020, year_end: 2019 }] }, true)).toBeTruthy();
  });
});

import { describe, expect, test } from "vitest";
import { searchFormulas } from "@/lib/search-formulas";
import type { CarMake, Color, Formula } from "@/types";

const brands: CarMake[] = [
  { id: "toyota", name: "Toyota", region: "JPN" },
  { id: "bmw", name: "BMW", region: "EUR" },
];

const colors: Color[] = [
  {
    id: "toyota_040",
    make_id: "toyota",
    color_code: "040",
    color_name: "Super White",
    color_type: ["solid"],
    hex_preview: "#f5f5f0",
    variants: [],
    years: [{ year: 2018, year_end: 2022 }, { year: 2024 }],
  },
  {
    id: "bmw_300",
    make_id: "bmw",
    color_code: "B39",
    color_name: "Mineral Grey",
    color_type: ["metallic"],
    hex_preview: "#777777",
    variants: [],
    years: [{ year: 2020 }],
  },
];

const formulas: Formula[] = [
  {
    id: "toyota_040_v1",
    color_id: "toyota_040",
    variant_id: "",
    version: "v1",
    paint_system: "2K",
    formula_type: "Single Stage",
    components: [],
    notes: "",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "bmw_300_v1",
    color_id: "bmw_300",
    variant_id: "",
    version: "v1",
    paint_system: "1K",
    formula_type: "Two Stages",
    components: [],
    notes: "",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("searchFormulas", () => {
  test("按地区、色号和年份组合筛选，并只展开匹配的年份", () => {
    const result = searchFormulas(colors, formulas, brands, {
      region: "JPN",
      color_code: "04",
      year: "2020",
    });

    expect(result.results.map((item) => item.color.id)).toEqual(["toyota_040"]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      makeName: "Toyota",
      yearEntry: { year: 2018, year_end: 2022 },
      formula: { id: "toyota_040_v1" },
    });
  });

  test("没有年份条件时为每个年份条目生成可打开的配方行", () => {
    const result = searchFormulas(colors, formulas, brands, { make_id: "toyota" });

    expect(result.rows.map((row) => row.yearEntry)).toEqual([
      { year: 2018, year_end: 2022 },
      { year: 2024 },
    ]);
    expect(result.makeNameById.get("toyota")).toBe("Toyota");
  });
});

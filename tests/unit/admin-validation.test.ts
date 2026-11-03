import { describe, expect, test } from "vitest";
import { validateColorYears, validateFormula } from "@/lib/admin-validation";

const formula = {
  id: "formula-a", color_id: "color-a", version: "v1", paint_system: "2K", formula_type: "Single Stage",
  components: [{ toner_code: "white", percentage: 100 }],
};

describe("管理员配方输入校验", () => {
  test("有效配方可以保存", () => expect(validateFormula(formula)).toBeNull());
  test.each([null, {}, { ...formula, components: undefined }, { ...formula, components: {} }, { ...formula, components: [null] }])("异常组件输入返回业务错误", (input) => {
    expect(validateFormula(input)).toBeTruthy();
  });
  test.each([-20, 120, NaN, Infinity, "100"])("拒绝非法百分比 %s", (percentage) => {
    expect(validateFormula({ ...formula, components: [{ toner_code: "white", percentage }, { toner_code: "black", percentage: typeof percentage === "number" ? 100 - percentage : 0 }] })).toBeTruthy();
  });
  test("各组总和与表单使用相同精度", () => {
    expect(validateFormula({ ...formula, components: [{ toner_code: "white", percentage: 99.5 }] })).toBeTruthy();
    expect(validateFormula({ ...formula, components: [{ toner_code: "white", percentage: 99.999 }] })).toBeNull();
  });
  test("三工序必须有两个有效分组，分别为 100%", () => {
    const pearl = { toner_code: "pearl", percentage: 100, component_group: "Pearl Paint" };
    const ground = { toner_code: "ground", percentage: 100, component_group: "Ground Paint" };
    const three = { ...formula, paint_system: "1K", formula_type: "Three Stages" };
    expect(validateFormula({ ...three, components: [pearl] })).toBeTruthy();
    expect(validateFormula({ ...three, components: [pearl, ground] })).toBeNull();
    expect(validateFormula({ ...three, components: [pearl, { ...ground, component_group: "unknown" }] })).toBeTruthy();
  });
  test("拒绝非法 RGB 和密度", () => {
    for (const component of [{ rgb_r: 256 }, { rgb_g: -1 }, { rgb_b: 1.5 }, { density: 0 }]) {
      expect(validateFormula({ ...formula, components: [{ ...formula.components[0], ...component }] })).toBeTruthy();
    }
  });
});

describe("颜色年份校验", () => {
  test("同一起始年份不能同时保存单年和区间", () => {
    expect(validateColorYears([{ year: 2020 }, { year: 2020, year_end: 2025 }])).toContain("2020");
  });
  test.each([undefined, null, [{ year: 1800 }], [{ year: 2025, year_end: 2020 }], [{ year: 2020.5 }]])("拒绝缺失或错误年份", (years) => {
    expect(validateColorYears(years)).toBeTruthy();
  });
  test("保留合法历史年份和显式清空操作", () => {
    expect(validateColorYears([{ year: 2020, year_end: 2025 }, { year: 2026 }])).toBeNull();
    expect(validateColorYears([])).toBeNull();
  });
});

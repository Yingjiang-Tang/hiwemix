import { describe, expect, test } from "vitest";
import {
  blendedDensity,
  componentDensity,
  gramsToVolume,
  roundTo,
  volumeToGrams,
} from "@/lib/units";
import type { FormulaComponent } from "@/types";

function component(
  grams: number,
  density?: number
): FormulaComponent {
  return {
    toner_code: "TEST",
    toner_name: "Test Toner",
    percentage: grams,
    grams_per_100g: grams,
    density,
  };
}

describe("配方单位换算", () => {
  test("优先使用组件提供的精确密度", () => {
    expect(componentDensity(component(50, 1.25))).toBe(1.25);
  });

  test("使用质量加权调和平均计算混合密度", () => {
    const density = blendedDensity([component(50, 1), component(50, 2)]);

    expect(roundTo(density, 3)).toBe(1.333);
  });

  test("克与毫升可以按照指定密度互相换算", () => {
    expect(gramsToVolume(125, 1.25, "ml")).toBe(100);
    expect(volumeToGrams(100, 1.25, "ml")).toBe(125);
  });

  test("升单位换算保持相同质量", () => {
    expect(gramsToVolume(1000, 1, "liter")).toBe(1);
    expect(volumeToGrams(1, 1, "liter")).toBe(1000);
  });
});

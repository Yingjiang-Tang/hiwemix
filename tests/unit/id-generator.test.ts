import { describe, expect, test } from "vitest";
import {
  generateFormulaId,
  generateUniqueColorId,
  generateUniqueFormulaId,
  slugify,
} from "@/lib/id-generator";

describe("业务 ID 生成", () => {
  test("把品牌和色号转换成稳定的 URL-safe 标识", () => {
    expect(slugify(" Toyota / 040 Pearl ")).toBe("toyota-040-pearl");
  });

  test("颜色 ID 冲突时选择第一个可用后缀", () => {
    const existing = ["toyota_040", "toyota_040-2"];

    expect(generateUniqueColorId("Toyota", "040", existing)).toBe("toyota_040-3");
  });

  test("配方 ID 包含颜色、变体和版本", () => {
    expect(generateFormulaId("toyota_040", "standard", "v1.2")).toBe(
      "toyota-040_standard_v12"
    );
  });

  test("配方 ID 冲突时不会覆盖已有记录", () => {
    const existing = ["toyota-040_standard_v1", "toyota-040_standard_v1-2"];

    expect(generateUniqueFormulaId("toyota_040", "standard", "v1", existing)).toBe(
      "toyota-040_standard_v1-3"
    );
  });
});

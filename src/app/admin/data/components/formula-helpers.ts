// FormulasPanel 工具函数 — 纯函数，无状态依赖

import type { Toner, Color, CarMake } from "@/types";

/** hex → RGB 转换 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

/** 按涂料体系过滤色母（接收动态 toners 而非静态数据） */
export function filterTonersBySystem(system: "1K" | "2K", toners: Toner[]): Toner[] {
  if (system === "2K") return toners.filter((t) => t.category === "2K_BASECOAT");
  return toners.filter((t) => t.category !== "2K_BASECOAT");
}

/** 模糊匹配色母（空查询返回全部） */
export function matchingToners(query: string, pool: Toner[]): Toner[] {
  const q = query.toLowerCase().trim();
  if (!q) return pool;
  return pool.filter(
    (t) =>
      t.code.toLowerCase().includes(q) ||
      t.tradeName.toLowerCase().includes(q) ||
      t.nameZh.includes(q)
  );
}

/** 模糊匹配颜色（按代码、名称、类型、品牌） */
export function matchingColors(query: string, colors: Color[], brands: CarMake[]): Color[] {
  const q = query.toLowerCase().trim();
  if (!q) return colors;
  const brandMap = new Map(brands.map((b) => [b.id, b.name]));
  return colors.filter((c) => {
    if (c.color_code.toLowerCase().includes(q)) return true;
    if (c.color_name.toLowerCase().includes(q)) return true;
    if (c.color_type.join(" ").toLowerCase().includes(q)) return true;
    const brandName = brandMap.get(c.make_id) ?? "";
    if (brandName.toLowerCase().includes(q)) return true;
    return false;
  });
}

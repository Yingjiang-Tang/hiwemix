// 密度换算纯函数 — 重量/体积换算、混合密度计算
// 精度策略（按数据可得性从准到粗）：
//   L1 色母级精确 density（components 自带或 toners 表提供）
//   L2 分类典型密度（按 TonerCategory）
//   L3 兜底 1.0 g/ml
import type { FormulaComponent, TonerCategory } from "@/types";

// 分类典型密度（g/ml）——汽车修补漆色母经验值
// 溶剂型底漆/银粉偏轻，珠光/辅料（如慢干水、固化剂助剂）偏重
const CATEGORY_DENSITY: Record<TonerCategory, number> = {
  "2K_BASECOAT": 1.02,
  "1K_BASECOAT": 0.99,
  "1K_SILVER_BASECOAT": 0.98,
  "1K_PEARL_BASECOAT": 1.12,
  "SUPPLEMENTARY": 1.05,
};

const FALLBACK_DENSITY = 1.0;

/** 色母分类 → 典型密度（L2） */
export function densityForCategory(category: TonerCategory | undefined): number {
  if (category && category in CATEGORY_DENSITY) return CATEGORY_DENSITY[category];
  return FALLBACK_DENSITY;
}

/** 单个组件的有效密度：自带 density 优先（L1），否则按分类典型值（L2→L3） */
export function componentDensity(comp: FormulaComponent, categoryOf?: (code: string) => TonerCategory | undefined): number {
  if (comp.density != null && comp.density > 0) return comp.density;
  return densityForCategory(categoryOf?.(comp.toner_code));
}

/**
 * 混合密度（按质量加权调和平均）：整桶漆的密度不是各组分密度的算术平均，
 * 而是 d = Σmᵢ / Σ(mᵢ/dᵢ)。组件缺 density 时回退到分类典型值。
 */
export function blendedDensity(
  components: FormulaComponent[],
  categoryOf?: (code: string) => TonerCategory | undefined
): number {
  const usable = components.filter((c) => c.grams_per_100g > 0);
  if (usable.length === 0) return FALLBACK_DENSITY;
  let totalMass = 0;
  let massOverDensity = 0;
  for (const c of usable) {
    const mass = c.grams_per_100g;
    const d = componentDensity(c, categoryOf);
    totalMass += mass;
    massOverDensity += mass / d;
  }
  if (massOverDensity <= 0) return FALLBACK_DENSITY;
  return totalMass / massOverDensity;
}

/** 克 → 体积（指定单位）：体积 = 质量 / 密度 */
export function gramsToVolume(grams: number, density: number, unit: "ml" | "liter"): number {
  const ml = grams / density;
  return unit === "liter" ? ml / 1000 : ml;
}

/** 体积（指定单位）→ 克：质量 = 体积 × 密度 */
export function volumeToGrams(volume: number, density: number, unit: "ml" | "liter"): number {
  const ml = unit === "liter" ? volume * 1000 : volume;
  return ml * density;
}

/** 四舍五入到指定小数位 */
export function roundTo(n: number, decimals = 1): number {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}

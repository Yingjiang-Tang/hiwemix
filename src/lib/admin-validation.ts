import type { YearEntry } from "@/types";

export function validateFormula(value: unknown): string | null {
  if (!value || typeof value !== "object") return "请求格式错误";
  const body = value as Record<string, unknown>;
  for (const key of ["id", "color_id", "version"]) {
    if (typeof body[key] !== "string" || !body[key].trim()) return `缺少必填字段（${key}）`;
  }
  if (body.paint_system !== "1K" && body.paint_system !== "2K") return "无效的配方体系";
  if (body.paint_system === "2K" && body.formula_type !== "Single Stage") return "2K 体系只能使用 Single Stage";
  if (body.paint_system === "1K" && !["Two Stages", "Three Stages"].includes(String(body.formula_type))) return "1K 体系只能选择 Two Stages 或 Three Stages";
  if (!Array.isArray(body.components) || body.components.length === 0) return "配方至少需要一个色母组件";
  const sums = new Map<string, number>();
  for (const component of body.components) {
    if (!component || typeof component !== "object") return "色母组件格式错误";
    const c = component as Record<string, unknown>;
    if (typeof c.toner_code !== "string" || !c.toner_code.trim()) return "色母编号不能为空";
    if (typeof c.percentage !== "number" || !Number.isFinite(c.percentage) || c.percentage < 0 || c.percentage > 100) return "色母百分比必须为 0 到 100 之间的数字";
    for (const key of ["rgb_r", "rgb_g", "rgb_b"]) {
      if (c[key] != null && (typeof c[key] !== "number" || !Number.isInteger(c[key]) || c[key] < 0 || c[key] > 255)) return "RGB 必须为 0 到 255 之间的整数";
    }
    if (c.density != null && (typeof c.density !== "number" || !Number.isFinite(c.density) || c.density <= 0)) return "色母密度必须大于 0";
    if (body.formula_type === "Three Stages") {
      if (c.component_group !== "Pearl Paint" && c.component_group !== "Ground Paint") return "Three Stages 配方的每个色母都必须选择有效分组";
    } else if (c.component_group != null) return "非 Three Stages 配方不能设置 component_group";
    const group = body.formula_type === "Three Stages" ? String(c.component_group) : "色母";
    sums.set(group, (sums.get(group) ?? 0) + c.percentage);
  }
  const groups = body.formula_type === "Three Stages" ? ["Pearl Paint", "Ground Paint"] : ["色母"];
  for (const group of groups) {
    // 与表单一致：每组总和与 100 的误差必须小于 0.01。
    if (Math.abs((sums.get(group) ?? 0) - 100) >= 0.01) return `${group}组分百分比总和应为 100%`;
  }
  return null;
}

export function validateColorYears(value: unknown): string | null {
  if (!Array.isArray(value)) return "年份必须为数组";
  const starts = new Set<number>();
  for (const entry of value as YearEntry[]) {
    if (!entry || !Number.isInteger(entry.year) || entry.year < 1900 || entry.year > 2100) return "年份必须为 1900 到 2100 之间的整数";
    if (entry.year_end != null && (!Number.isInteger(entry.year_end) || entry.year_end < entry.year || entry.year_end > 2100)) return "结束年份必须大于等于起始年份且不超过 2100";
    if (starts.has(entry.year)) return `起始年份 ${entry.year} 已存在，请合并年份设置`;
    starts.add(entry.year);
  }
  return null;
}

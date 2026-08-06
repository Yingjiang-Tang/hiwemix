import type { Color } from "@/types";

/**
 * 需要「照片差异化」的颜色行 id 白名单。
 *
 * 背景：同一 color_code 可能对应多条 colors 记录（不同车型/年份/颜色名），
 * 但照片文件默认只按色码命名（{code}.jpg），导致它们共用同一张照片。
 * 该名单中的行会优先匹配专属照片 {color_id}.jpg（如 toyota_209_pearl-3.jpg），
 * 找不到再回退到 {code}.jpg。
 *
 * 只有视觉确有差异的行才需要加入名单；其他颜色完全不受影响。
 * 命名示例：id 为 toyota_209_pearl-3 → 图片放 public/images/colors/toyota_209_pearl-3.jpg
 */
const DIFFERENTIATED_COLOR_IDS = new Set([
  // Toyota 209 三行：Black Mica(RAV4/Camry) vs Black Sand Pearl(Highlander) 视觉不同
  "toyota_209_pearl",
  "toyota_209_pearl-2",
  "toyota_209_pearl-3",
  // EWP 两行：Peugeot Blanc Banquise vs Citroën Blanc Banquise（不同品牌）
  "peugeot_ewp_solid",
  "citron_ewp",
]);

/** 该颜色行是否需要差异化照片（位于白名单内） */
export function isDifferentiatedColor(color: Color): boolean {
  return DIFFERENTIATED_COLOR_IDS.has(color.id);
}

/**
 * 计算颜色照片路径：
 * 1. 白名单内的行 → 优先用 {color_id}.jpg（专属图）
 * 2. 否则 / 或专属图不存在时 → 回退 {color_code}.jpg（去掉 "/" 后大写）
 */
export function getColorPhotoSrc(color: Color): string {
  const code = color.color_code.replace(/\//g, "").toUpperCase();
  if (DIFFERENTIATED_COLOR_IDS.has(color.id)) {
    return `/images/colors/${color.id}.jpg`;
  }
  return `/images/colors/${code}.jpg`;
}

/**
 * 与 getColorPhotoSrc 一致的「多候选回退」版本，供 <img> onError 逐级尝试：
 * 返回候选列表，第一候选不存在时依次回退到下一候选。
 */
export function getColorPhotoCandidates(color: Color): string[] {
  const code = color.color_code.replace(/\//g, "").toUpperCase();
  if (DIFFERENTIATED_COLOR_IDS.has(color.id)) {
    return [`/images/colors/${color.id}.jpg`, `/images/colors/${code}.jpg`];
  }
  return [`/images/colors/${code}.jpg`];
}

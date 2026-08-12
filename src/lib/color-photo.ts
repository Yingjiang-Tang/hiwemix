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

/**
 * 颜色照片多候选回退列表，供 <img> onError 逐级尝试：
 * 白名单内的行优先用 {color_id}.jpg（专属图），第一候选不存在时依次回退到 {color_code}.jpg。
 */
export function getColorPhotoCandidates(color: Color): string[] {
  const code = color.color_code.replace(/\//g, "").toUpperCase();
  if (DIFFERENTIATED_COLOR_IDS.has(color.id)) {
    return [`/images/colors/${color.id}.jpg`, `/images/colors/${code}.jpg`];
  }
  return [`/images/colors/${code}.jpg`];
}

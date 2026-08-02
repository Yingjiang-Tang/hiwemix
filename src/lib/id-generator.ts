/**
 * ID 自动生成工具
 * 根据实体关键字段生成有意义的、可追溯的 ID
 */

/**
 * 将字符串转为 URL-safe slug
 * 例: "Toyota Crown" → "toyota-crown"
 * 例: "标准型" → ""  (中文直接剔除，调用方需处理空值)
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s\-_/]/g, "") // 只保留小写字母、数字、空格、短横、下划线、斜杠
    .replace(/[\s_/]+/g, "-")          // 空格/下划线/斜杠 → 短横
    .replace(/-+/g, "-")               // 合并连续短横
    .replace(/^-|-$/g, "");            // 去首尾短横
}

/** 品牌 ID：名称 slug */
export function generateBrandId(name: string): string {
  return slugify(name);
}

/** 变体 ID：名称 slug */
export function generateVariantId(name: string): string {
  return slugify(name);
}

/**
 * 颜色 ID 基名：{品牌ID}_{颜色代码}
 * 注意：品牌+代码不足以唯一标识一条颜色（同代码可有不同名称/车型/年份的多条），
 * 最终唯一性由 generateUniqueColorId 追加 -2 / -3 ... 后缀保证。
 */
export function generateColorId(makeId: string, colorCode: string): string {
  const a = slugify(makeId);
  const b = slugify(colorCode);
  if (!a || !b) return "";
  return `${a}_${b}`;
}

/**
 * 生成不与现有记录碰撞的颜色 ID。
 * 基名已存在时追加 -2 / -3 ... 后缀，保证"任意字段不同 → 独立记录"。
 * 这样 品牌/代码 相同但 类型/名称/车型/年份 不同的两条数据也能各自独立保存。
 */
export function generateUniqueColorId(
  makeId: string,
  colorCode: string,
  existingIds: Iterable<string>
): string {
  const base = generateColorId(makeId, colorCode);
  if (!base) return "";
  const taken = existingIds instanceof Set ? existingIds : new Set(existingIds);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** 配方 ID：{颜色ID}_{变体ID}_{版本}，无变体时省略变体部分 */
export function generateFormulaId(
  colorId: string,
  variantId: string,
  version: string
): string {
  const parts = [colorId];
  if (variantId) parts.push(variantId);
  parts.push(version);
  return parts.map((p) => slugify(p)).filter(Boolean).join("_");
}

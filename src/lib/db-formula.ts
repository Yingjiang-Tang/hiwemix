import { getSupabase } from "./supabase-client";
import { getSupabaseAdmin } from "./supabase-server";
import { getToners } from "./db-toner";
import type {
  CarMake,
  Color,
  ColorType,
  ColorVariant,
  Formula,
  FormulaComponent,
  AppSettings,
  Toner,
  YearEntry,
} from "@/types";

const DEFAULT_SETTINGS: AppSettings = {
  finishes: ["Solid", "Metallic", "Pearl", "Matte", "Candy"],
  types: ["Single Stage", "Two Stages", "Three Stages"],
  yearMin: 1990,
  yearMax: 2026,
};

// ====== Brands ======

export async function getBrands(): Promise<CarMake[]> {
  const { data, error } = await getSupabase()
    .from("brands")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CarMake[];
}

// ====== Formula Types ======

export async function getFormulaTypes(): Promise<ColorVariant[]> {
  const { data, error } = await getSupabase()
    .from("formula_types")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ColorVariant[];
}

// ====== Color Years ======

// 判断 YearEntry 是否包含目标年份
export function yearEntryContains(entry: YearEntry, target: number): boolean {
  if (entry.year_end == null) return entry.year === target;
  return entry.year <= target && target <= entry.year_end;
}

// 格式化 YearEntry 为显示字符串："2020" 或 "2001-2009"
export function formatYearEntry(entry: YearEntry): string {
  if (entry.year_end == null) return String(entry.year);
  return `${entry.year}-${entry.year_end}`;
}

export async function getColorYears(colorId: string): Promise<YearEntry[]> {
  const { data, error } = await getSupabase()
    .from("color_years")
    .select("year, year_end")
    .eq("color_id", colorId)
    .order("year", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    year: r.year as number,
    year_end: (r.year_end as number | null) ?? undefined,
  }));
}

export async function getAllColorYears(): Promise<Record<string, YearEntry[]>> {
  const { data, error } = await getSupabase()
    .from("color_years")
    .select("color_id, year, year_end")
    .order("year", { ascending: true });
  if (error) throw error;
  const map: Record<string, YearEntry[]> = {};
  for (const row of data ?? []) {
    const colorId = row.color_id as string;
    const entry: YearEntry = {
      year: row.year as number,
      year_end: (row.year_end as number | null) ?? undefined,
    };
    if (!map[colorId]) map[colorId] = [];
    map[colorId].push(entry);
  }
  return map;
}

export async function saveColorYears(colorId: string, entries: YearEntry[]): Promise<void> {
  // 删除现有的年份
  const { error: delErr } = await getSupabaseAdmin()
    .from("color_years")
    .delete()
    .eq("color_id", colorId);
  if (delErr) throw delErr;

  // 插入新的年份（含 year_end）
  if (entries.length > 0) {
    const rows = entries.map((e) => ({
      color_id: colorId,
      year: e.year,
      year_end: e.year_end ?? null,
    }));
    const { error: insErr } = await getSupabaseAdmin().from("color_years").insert(rows);
    if (insErr) throw insErr;
  }
}

// ====== Colors ======

export async function getColors(): Promise<Color[]> {
  const { data, error } = await getSupabase()
    .from("colors")
    .select("*, color_variant_map(color_variants(*))")
    .order("color_code", { ascending: true });
  if (error) throw error;

  // 批量获取所有颜色的年份
  const yearsMap = await getAllColorYears();

  return (data ?? []).map((row) => {
    const color = mapColorRow(row);
    color.years = yearsMap[color.id] || [];
    return color;
  });
}

// ====== Formulas ======

export async function getFormulas(): Promise<Formula[]> {
  const { data, error } = await getSupabase()
    .from("formulas")
    .select("*, formula_components(*)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const tonerMap = await getTonerMap();
  return (data ?? []).map((row) => mapFormulaRow(row, tonerMap));
}

// ====== Settings ======

export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await getSupabase()
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_SETTINGS;
  return {
    finishes: data.finishes ?? DEFAULT_SETTINGS.finishes,
    types: data.types ?? DEFAULT_SETTINGS.types,
    yearMin: data.year_min ?? DEFAULT_SETTINGS.yearMin,
    yearMax: data.year_max ?? DEFAULT_SETTINGS.yearMax,
  };
}

// ====== 内部辅助 ======

// 色母目录缓存：缺失 rgb 时按 toner_code 从 toners 表回退派生 Mass Tone 颜色
let _tonerMapPromise: Promise<Map<string, Toner>> | null = null;
function getTonerMap(): Promise<Map<string, Toner>> {
  if (!_tonerMapPromise) {
    _tonerMapPromise = getToners()
      .then((ts) => new Map(ts.map((t) => [t.code, t])))
      .catch(() => new Map());
  }
  return _tonerMapPromise;
}

// 按 code 查色母：先精确匹配；再回退到后缀匹配（容忍漏写前缀，如 "3015" → "1K-3015"）
function findToner(tonerMap: Map<string, Toner>, code: string): Toner | undefined {
  if (tonerMap.size === 0 || !code) return undefined;
  const exact = tonerMap.get(code);
  if (exact) return exact;
  for (const t of tonerMap.values()) {
    if (t.code.endsWith(code)) return t;
  }
  return undefined;
}

// hex (#RRGGBB) → 组件 rgb 字段；无效 hex 返回 undefined
function hexToCompRgb(hex: string): { rgb_r: number; rgb_g: number; rgb_b: number } | undefined {
  const m = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  if (!m) return undefined;
  return { rgb_r: parseInt(m[1], 16), rgb_g: parseInt(m[2], 16), rgb_b: parseInt(m[3], 16) };
}

// 颜色类型白名单（与 DB CHECK 约束一致）
const COLOR_TYPE_VALUES: ColorType[] = ["solid", "metallic", "pearl", "matte", "candy", "special"];

// 将 DB 读回的 color_type 规整为 ColorType[]：数组去重；兼容旧的单值/逗号分隔串
export function typeColorType(value: unknown): ColorType[] {
  let list: string[];
  if (Array.isArray(value)) {
    list = value.map((v) => String(v));
  } else if (value != null && value !== "") {
    list = String(value).split(",");
  } else {
    list = [];
  }
  return list
    .map((v) => v.trim())
    .filter((v) => (COLOR_TYPE_VALUES as string[]).includes(v))
    .filter((v, i, arr) => arr.indexOf(v) === i) as ColorType[];
}

function mapColorRow(row: Record<string, unknown>): Color {
  const map =
    (row.color_variant_map as Array<{ color_variants: ColorVariant } | null> | null) ?? [];
  const variants: ColorVariant[] = map
    .map((m) => m?.color_variants)
    .filter((v): v is ColorVariant => v != null);
  return {
    id: String(row.id ?? ""),
    make_id: String(row.make_id ?? ""),
    color_code: String(row.color_code ?? ""),
    color_name: String(row.color_name ?? ""),
    color_type: typeColorType(row.color_type),
    hex_preview: String(row.hex_preview ?? "#000000"),
    car_model: row.car_model ? String(row.car_model) : undefined,
    variants,
  };
}

function mapFormulaRow(row: Record<string, unknown>, tonerMap?: Map<string, Toner>): Formula {
  const comps =
    (row.formula_components as Array<Record<string, unknown>> | null) ?? [];
  const components: FormulaComponent[] = comps.map((c) => {
    const comp: FormulaComponent = {
      uid: crypto.randomUUID(),
      toner_code: String(c.toner_code ?? ""),
      toner_name: String(c.toner_name ?? ""),
      percentage: Number(c.percentage) || 0,
      grams_per_100g: Number(c.percentage) || 0,  // 始终从 percentage 派生
    };
    if (c.density != null) comp.density = Number(c.density);
    // 组件自带 rgb 优先；缺失时回退到色母目录中对应 toner 的 hex（若存在）
    const toner = tonerMap ? findToner(tonerMap, String(c.toner_code ?? "")) : undefined;
    const ownRgb =
      c.rgb_r != null && c.rgb_g != null && c.rgb_b != null
        ? { rgb_r: Number(c.rgb_r) || 0, rgb_g: Number(c.rgb_g) || 0, rgb_b: Number(c.rgb_b) || 0 }
        : undefined;
    let fallbackRgb = ownRgb;
    if (!fallbackRgb && toner?.hex) fallbackRgb = hexToCompRgb(toner.hex);
    if (fallbackRgb) {
      comp.rgb_r = fallbackRgb.rgb_r;
      comp.rgb_g = fallbackRgb.rgb_g;
      comp.rgb_b = fallbackRgb.rgb_b;
    }
    // Toner Name 显示英文商品名：组件名含中文或为空时，从色母目录回退到 trade_name
    if (toner?.tradeName && (comp.toner_name === "" || /[一-鿿]/.test(comp.toner_name))) {
      comp.toner_name = toner.tradeName;
    }
    if (c.component_group != null) {
      comp.component_group = c.component_group as FormulaComponent["component_group"];
    }
    return comp;
  });
  return {
    id: String(row.id ?? ""),
    color_id: String(row.color_id ?? ""),
    variant_id: String(row.variant_id ?? ""),
    version: String(row.version ?? ""),
    paint_system: (row.paint_system as Formula["paint_system"]) ?? "1K",
    formula_type: (row.formula_type as Formula["formula_type"]) ?? "Single Stage",
    components,
    notes: String(row.notes ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

// ====== 写操作（仅服务端，用 getSupabaseAdmin()，BYPASSRLS）======

// --- Brands ---

export async function saveBrand(brand: CarMake): Promise<CarMake> {
  const { data, error } = await getSupabaseAdmin()
    .from("brands")
    .upsert({ id: brand.id, name: brand.name, region: brand.region })
    .select()
    .single();
  if (error) throw error;
  return data as CarMake;
}

export async function deleteBrand(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("brands").delete().eq("id", id);
  if (error) throw error;
}

// --- Formula Types ---

export async function saveFormulaType(variant: ColorVariant, originalId?: string): Promise<ColorVariant> {
  // 如果 ID 发生了变更，先删除旧记录再插入新记录
  if (originalId && originalId !== variant.id) {
    const { error: delErr } = await getSupabaseAdmin()
      .from("formula_types")
      .delete()
      .eq("id", originalId);
    if (delErr) throw delErr;
  }
  const { data, error } = await getSupabaseAdmin()
    .from("formula_types")
    .upsert({ id: variant.id, name: variant.name, year_range: variant.year_range })
    .select()
    .single();
  if (error) throw error;
  return data as ColorVariant;
}

export async function deleteFormulaType(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("formula_types").delete().eq("id", id);
  if (error) throw error;
}

// --- Colors（含变体多对多同步）---

export async function saveColor(
  color: Omit<Color, "variants">,
  variantIds: string[],
  isNew = false
): Promise<Color> {
  // 1. 写入颜色主行
  //    - 新增（isNew）：走 insert；若主键冲突（同 ID 已存在）直接报错，
  //      绝不静默覆盖已有记录 —— 这是"任意字段不同必须独立保存"的最终防线。
  //    - 编辑：按 id update 现有行。
  let data: unknown;
  let error: { code?: string; message?: string; details?: string } | null;
  // 空选兜底为 ["solid"]，不依赖 DB 默认值；先归一化为数组，
  // 防止旧数据/异常传入字符串（如 "solid"）被 PostgREST 当作数组字面量解析报错
  const types = typeColorType(color.color_type).length
    ? typeColorType(color.color_type)
    : (["solid"] as ColorType[]);
  if (isNew) {
    const row = {
      id: color.id,
      make_id: color.make_id,
      color_code: color.color_code,
      color_name: color.color_name,
      color_type: types,
      hex_preview: color.hex_preview,
      car_model: color.car_model || null,
    };
    const res = await getSupabaseAdmin().from("colors").insert(row).select().single();
    data = res.data; error = res.error;
    // 23505 = unique_violation（主键冲突）：给出可读的重复提示
    if (error?.code === "23505") {
      throw new Error(`颜色 ID「${color.id}」已存在，无法重复新增。请修改颜色代码/类型，或使用编辑功能。`);
    }
  } else {
    const res = await getSupabaseAdmin()
      .from("colors")
      .update({
        make_id: color.make_id,
        color_code: color.color_code,
        color_name: color.color_name,
        color_type: types,
        hex_preview: color.hex_preview,
        car_model: color.car_model || null,
      })
      .eq("id", color.id)
      .select()
      .single();
    data = res.data; error = res.error;
  }
  if (error) throw new Error(error.message || JSON.stringify(error));

  // 2. 同步 color_variant_map：始终保持双向同步
  //    color_variant_map 的外键指向 color_variants，但
  //    saveFormulaType 写入 formula_types 表（同一个变体概念）
  //    所以要先确保 formula_types 中的 ID 也存在于 color_variants 中
  if (variantIds.length > 0) {
    // 将 formula_types 中新增的 ID 同步到 color_variants（幂等 upsert）
    for (const vid of variantIds) {
      const { error: syncErr } = await getSupabaseAdmin()
        .from("color_variants")
        .upsert({ id: vid, name: vid, year_range: "" });
      if (syncErr) throw new Error("sync color_variants failed: " + syncErr.message);
    }
  }

  // 清理旧映射
  const { error: delErr } = await getSupabaseAdmin()
    .from("color_variant_map")
    .delete()
    .eq("color_id", color.id);
  if (delErr) throw new Error(delErr.message || JSON.stringify(delErr));

  // 写入新映射
  if (variantIds.length > 0) {
    const rows = variantIds.map((variant_id) => ({ color_id: color.id, variant_id }));
    const { error: insErr } = await getSupabaseAdmin().from("color_variant_map").insert(rows);
    if (insErr) throw new Error(insErr.message || JSON.stringify(insErr));
  }

  return data as Color;
}

export async function deleteColor(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("colors").delete().eq("id", id);
  if (error) throw error;
}

// --- Formulas（含色母组件全量同步）---

export async function saveFormula(formula: Formula): Promise<Formula> {
  // 1. upsert 配方主行（variant_id 空字符串转 null）
  const { data, error } = await getSupabaseAdmin()
    .from("formulas")
    .upsert({
      id: formula.id,
      color_id: formula.color_id,
      variant_id: formula.variant_id || null,
      version: formula.version,
      paint_system: formula.paint_system,
      formula_type: formula.formula_type,
      notes: formula.notes ?? "",
    })
    .select()
    .single();
  if (error) throw error;

  // 2. 全量同步 components：先删后插（id 是 SERIAL 自增，无稳定客户端 id）
  const { error: delErr } = await getSupabaseAdmin()
    .from("formula_components")
    .delete()
    .eq("formula_id", formula.id);
  if (delErr) throw delErr;

  if (formula.components.length > 0) {
    const rows = formula.components.map((c) => {
      const row: Record<string, unknown> = {
        formula_id: formula.id,
        toner_code: c.toner_code,
        toner_name: c.toner_name,
        percentage: c.percentage,
        grams_per_100g: c.percentage,  // 始终从 percentage 派生
        density: c.density ?? null,
        rgb_r: c.rgb_r ?? null,
        rgb_g: c.rgb_g ?? null,
        rgb_b: c.rgb_b ?? null,
      };
      if (c.component_group != null) {
        row.component_group = c.component_group;
      }
      return row;
    });
    const { error: insErr } = await getSupabaseAdmin().from("formula_components").insert(rows);
    if (insErr) throw insErr;
  }

  return data as Formula;
}

export async function deleteFormula(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("formulas").delete().eq("id", id);
  if (error) throw error;
}

// --- Settings ---

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const { data, error } = await getSupabaseAdmin()
    .from("settings")
    .upsert({
      id: 1,
      finishes: settings.finishes,
      types: settings.types,
      year_min: settings.yearMin,
      year_max: settings.yearMax,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    finishes: data.finishes ?? [],
    types: data.types ?? [],
    yearMin: data.year_min,
    yearMax: data.year_max,
  };
}

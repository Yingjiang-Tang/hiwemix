import { createClient } from "./supabase/server";
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CarMake[];
}

// ====== Formula Types ======

export async function getFormulaTypes(): Promise<ColorVariant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("formula_types")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ColorVariant[];
}

// ====== Color Years ======
// 纯函数 yearEntryContains / formatYearEntry 已移至 ./formula-utils（客户端可安全引用）

export async function getColorYears(colorId: string): Promise<YearEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
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
  const supabase = await createClient();
  const { data, error } = await supabase
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

// ====== Colors ======

export async function getColors(): Promise<Color[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("formulas")
    .select("*, formula_components(*)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  // toner 目录拉取失败：本次回退空 map（不阻塞公式返回），缓存已清空、下次调用会重试
  let tonerMap: Map<string, Toner>;
  try {
    tonerMap = await getTonerMap();
  } catch {
    tonerMap = new Map();
  }
  return (data ?? []).map((row) => mapFormulaRow(row, tonerMap));
}

// ====== Settings ======

export async function getSettings(): Promise<AppSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
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

// 色母目录缓存：缺失 rgb 时按 toner_code 从 toners 表回退派生 Mass Tone 颜色。
// 缓存带版本号：db-toner.ts 的 saveToner/deleteToner 会递增版本，
// 使本模块在新增/删除色母后自动重取，避免长期进程（dev/本地）读到过期目录。
let _tonerMapPromise: Promise<Map<string, Toner>> | null = null;
let _tonerMapVersion = -1;
function getTonerMap(): Promise<Map<string, Toner>> {
  const version =
    typeof (globalThis as Record<string, unknown>).__TONER_CACHE_VERSION === "number"
      ? ((globalThis as Record<string, unknown>).__TONER_CACHE_VERSION as number)
      : 0;
  if (!_tonerMapPromise || version !== _tonerMapVersion) {
    _tonerMapVersion = version;
    _tonerMapPromise = getToners()
      .then((ts) => new Map(ts.map((t) => [t.code, t])))
      .catch((err) => {
        // 失败不缓存：清空缓存，下次调用重新拉取，避免瞬时错误把目录毒化成永久空 Map
        _tonerMapPromise = null;
        throw err;
      });
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
    // 色母目录 hex 优先（改 toner 颜色后所有配方实时同步）；组件自带 rgb 仅兜底
    const toner = tonerMap ? findToner(tonerMap, String(c.toner_code ?? "")) : undefined;
    // 附带色母分类：供 density 换算按分类典型密度（L2）取值
    if (toner?.category) comp.tonerCategory = toner.category;
    const ownRgb =
      c.rgb_r != null && c.rgb_g != null && c.rgb_b != null
        ? { rgb_r: Number(c.rgb_r) || 0, rgb_g: Number(c.rgb_g) || 0, rgb_b: Number(c.rgb_b) || 0 }
        : undefined;
    let fallbackRgb = toner?.hex ? hexToCompRgb(toner.hex) : undefined;
    if (!fallbackRgb) fallbackRgb = ownRgb;
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
  // 通过 RPC 在单个 Postgres 事务内完成变体重命名/保存：
  // 改 ID 时依次 建新 color_variants → 迁 color_variant_map → 迁 formulas.variant_id → 删旧行，
  // 任一失败整体回滚，不留半迁移状态；无 ID 变更时仅 upsert formula_types + 同步变体真名。
  const { data, error } = await getSupabaseAdmin().rpc("save_variant_with_relink", {
    p_id: variant.id,
    p_name: variant.name,
    p_year_range: variant.year_range ?? "",
    p_original_id: originalId ?? null,
  });
  if (error) throw error;
  // RPC 返回 SETOF → data 为行数组，取首行（与旧实现的单行返回契约一致）
  const row = Array.isArray(data) ? (data[0] as ColorVariant) : (data as ColorVariant);
  return row;
}

export async function deleteFormulaType(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("formula_types").delete().eq("id", id);
  if (error) throw error;
}

// --- Colors（含变体多对多同步 + 年份全量同步）---

/**
 * 保存颜色（主行 + 变体映射 + 年份，全量同步）。
 * 通过 RPC 在单个 Postgres 事务内完成全部步骤，
 * 避免中途失败留下"主行已存、变体/年份关联被删光"的半成品。
 * @param years 年份列表（空数组 = 清空该颜色的所有年份）
 * @param isNew true = 创建语义（ID 已存在时报 23505 冲突，不覆盖）；false = 更新语义（upsert）
 */
export async function saveColor(
  color: Omit<Color, "variants">,
  variantIds: string[],
  years: YearEntry[] = [],
  isNew = false
): Promise<Color> {
  // 空选兜底为 ["solid"]，不依赖 DB 默认值；先归一化为数组，
  // 防止旧数据/异常传入字符串（如 "solid"）被 PostgREST 当作数组字面量解析报错
  const types = typeColorType(color.color_type).length
    ? typeColorType(color.color_type)
    : (["solid"] as ColorType[]);

  const { data, error } = await getSupabaseAdmin().rpc("save_color_with_components", {
    p_id: color.id,
    p_make_id: color.make_id,
    p_color_code: color.color_code,
    p_color_name: color.color_name,
    p_color_type: types,
    p_hex_preview: color.hex_preview,
    p_car_model: color.car_model || null,
    p_variant_ids: variantIds,
    p_years: years.map((e) => ({ year: e.year, year_end: e.year_end ?? null })),
    p_is_new: isNew,
  });
  if (error) {
    // 23505 = unique_violation（主键冲突）：给出可读的重复提示
    if (error.code === "23505") {
      throw new Error(`颜色 ID「${color.id}」已存在，无法重复新增。请修改颜色代码/类型，或使用编辑功能。`);
    }
    throw new Error(error.message || JSON.stringify(error));
  }
  // RPC 返回 SETOF → data 为行数组，取首行（与旧实现的单行返回契约一致）
  const row = Array.isArray(data) ? (data[0] as Color) : (data as Color);
  return row;
}

export async function deleteColor(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("colors").delete().eq("id", id);
  if (error) throw error;
}

// --- Formulas（含色母组件全量同步）---

/**
 * 保存配方（主行 + 色母组件全量同步）。
 * 通过 RPC 在单个 Postgres 事务内完成三步（写主行 → 删旧组件 → 插新组件），
 * 避免中途失败留下"主行已存、组件被删光"的空壳配方。
 * @param isNew true = 创建语义（ID 已存在时报 23505 冲突，不覆盖）；false = 更新语义（upsert）
 */
export async function saveFormula(formula: Formula, isNew = false): Promise<Formula> {
  // 组件映射为 RPC 入参 JSON 数组；grams_per_100g 由 DB 层从 percentage 派生
  const components = formula.components.map((c) => {
    const row: Record<string, unknown> = {
      toner_code: c.toner_code,
      toner_name: c.toner_name,
      percentage: c.percentage,
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

  const { data, error } = await getSupabaseAdmin().rpc("save_formula_with_components", {
    p_id: formula.id,
    p_color_id: formula.color_id,
    p_variant_id: formula.variant_id || null,
    p_version: formula.version,
    p_paint_system: formula.paint_system,
    p_formula_type: formula.formula_type,
    p_notes: formula.notes ?? "",
    p_components: components,
    p_is_new: isNew,
  });
  if (error) {
    // 并发创建撞 ID：DB 抛 23505 → 转成可读中文错误，避免静默覆盖
    if (error.code === "23505") {
      throw new Error(`配方 ID ${formula.id} 已存在，请刷新列表后重试`);
    }
    throw error;
  }
  // RPC 返回 SETOF → data 为行数组，取首行（与旧实现的单行返回契约一致）
  const row = Array.isArray(data) ? (data[0] as Formula) : (data as Formula);
  return row;
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

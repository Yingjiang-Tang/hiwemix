import { yearEntryContains } from "@/lib/formula-utils";
import type {
  CarMake,
  Color,
  ColorType,
  Formula,
  FormulaTableRow,
  SearchParams,
  SearchResult,
} from "@/types";

/**
 * 纯函数搜索边界：根据页面已加载的数据筛选颜色，并生成配方结果行。
 * 不访问网络，便于在不依赖 Supabase 的情况下验证搜索行为。
 */
export function searchFormulas(
  colors: Color[],
  formulas: Formula[],
  brands: CarMake[],
  params: SearchParams
): {
  results: SearchResult[];
  rows: FormulaTableRow[];
  makeNameById: Map<string, string>;
} {
  let filtered = colors;

  if (params.region) {
    const regionBrandIds = brands
      .filter((brand) => brand.region === params.region)
      .map((brand) => brand.id);
    filtered = filtered.filter((color) => regionBrandIds.includes(color.make_id));
  }

  if (params.make_id) {
    filtered = filtered.filter((color) => color.make_id === params.make_id);
  }

  if (params.color_code) {
    const code = params.color_code.toUpperCase();
    filtered = filtered.filter((color) => color.color_code.toUpperCase().includes(code));
  }

  if (params.color_name) {
    const name = params.color_name.toLowerCase();
    filtered = filtered.filter((color) => color.color_name.toLowerCase().includes(name));
  }

  if (params.color_type) {
    filtered = filtered.filter((color) => color.color_type.includes(params.color_type as ColorType));
  }

  if (params.year) {
    const searchYear = Number.parseInt(params.year, 10);
    if (!Number.isNaN(searchYear)) {
      filtered = filtered.filter((color) =>
        color.years?.some((entry) => yearEntryContains(entry, searchYear))
      );
    }
  }

  const results = filtered.map((color) => ({
    color,
    formulas: formulas.filter((formula) => formula.color_id === color.id),
  }));
  const makeNameById = new Map(brands.map((brand) => [brand.id, brand.name]));
  const searchYear = params.year ? Number.parseInt(params.year, 10) : undefined;
  const rows: FormulaTableRow[] = [];

  for (const result of results) {
    const matchedEntries = searchYear !== undefined && !Number.isNaN(searchYear)
      ? result.color.years?.filter((entry) => yearEntryContains(entry, searchYear)) ?? []
      : result.color.years?.length
        ? result.color.years
        : [undefined];

    for (const formula of result.formulas) {
      for (const entry of matchedEntries) {
        rows.push({
          color: result.color,
          formula,
          variant: result.color.variants.find((variant) => variant.id === formula.variant_id),
          makeName: makeNameById.get(result.color.make_id) ?? result.color.make_id,
          yearEntry: entry,
        });
      }
    }
  }

  return { results, rows, makeNameById };
}

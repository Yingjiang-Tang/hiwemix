import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Guide } from "@/types";

const mock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ getSupabaseAdmin: () => mock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { deleteBrand, saveBrand, saveColor, saveFormula } from "@/lib/db-formula";
import { deleteGuideCategory, saveGuide, saveGuideCategory } from "@/lib/db-tds";
import { getAnalyticsSummary } from "@/lib/db-analytics";

function builder(result: Record<string, unknown>) {
  const query = {
    insert: vi.fn(), update: vi.fn(), delete: vi.fn(), select: vi.fn(), eq: vi.fn(), single: vi.fn(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  for (const method of [query.insert, query.update, query.delete, query.select, query.eq]) method.mockReturnValue(query);
  query.single.mockResolvedValue(result);
  return query;
}

beforeEach(() => vi.clearAllMocks());

describe("数据写入保护", () => {
  test("编辑颜色继续完整传递已有年份和变体关联", async () => {
    mock.rpc.mockResolvedValue({ data: [{}], error: null });
    const years = [{ year: 2020, year_end: 2025 }];
    await saveColor({ id: "c", make_id: "toyota", color_code: "A", color_name: "White", color_type: ["solid"], hex_preview: "#ffffff", years }, ["legacy-variant"], years);
    expect(mock.rpc).toHaveBeenCalledWith("save_color_with_components", expect.objectContaining({ p_variant_ids: ["legacy-variant"], p_years: [{ year: 2020, year_end: 2025 }], p_is_new: false }));
  });
  test("编辑配方保留历史变体和图片关联", async () => {
    mock.rpc.mockResolvedValue({ data: [{}], error: null });
    await saveFormula({ id: "f", color_id: "c", variant_id: "legacy-variant", version: "v1", paint_system: "2K", formula_type: "Single Stage", notes: "", updated_at: "", image_url: "https://example.invalid/shared.jpg", components: [{ toner_code: "white", toner_name: "White", percentage: 100, grams_per_100g: 100 }] });
    expect(mock.rpc).toHaveBeenCalledWith("save_formula_with_components", expect.objectContaining({ p_variant_id: "legacy-variant", p_image_url: "https://example.invalid/shared.jpg", p_is_new: false }));
  });
  test("颜色重复 ID 的事务异常仍返回清楚的业务错误", async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { code: "23505", message: "color id c already exists" } });
    await expect(saveColor({ id: "c", make_id: "toyota", color_code: "A", color_name: "White", color_type: ["solid"], hex_preview: "#ffffff" }, [], [], true)).rejects.toThrow("已存在");
  });
  test("新增品牌使用 insert，重复 ID 不覆盖现有行", async () => {
    const conflict = { code: "23505", message: "duplicate" };
    const query = builder({ error: conflict }); mock.from.mockReturnValue(query);
    await expect(saveBrand({ id: "toyota", name: "changed", region: "JPN" }, true)).rejects.toEqual(conflict);
    expect(query.insert).toHaveBeenCalled(); expect(query.update).not.toHaveBeenCalled();
  });
  test("编辑品牌只更新指定 ID", async () => {
    const row = { id: "toyota", name: "Toyota", region: "JPN" };
    const query = builder({ data: row, error: null }); mock.from.mockReturnValue(query);
    await saveBrand(row);
    expect(query.update).toHaveBeenCalledWith(row); expect(query.eq).toHaveBeenCalledWith("id", "toyota"); expect(query.insert).not.toHaveBeenCalled();
  });
  test.each([deleteBrand, deleteGuideCategory])("有关联记录时禁止删除父项", async (remove) => {
    const query = builder({ count: 2, error: null }); mock.from.mockReturnValue(query);
    await expect(remove("parent")).rejects.toThrow("仍关联"); expect(query.delete).not.toHaveBeenCalled();
  });
  test("查询关联失败时不继续删除", async () => {
    const query = builder({ count: null, error: { message: "offline" } }); mock.from.mockReturnValue(query);
    await expect(deleteBrand("toyota")).rejects.toEqual({ message: "offline" }); expect(query.delete).not.toHaveBeenCalled();
  });
  test("新增文档分类不进行 upsert", async () => {
    const query = builder({ data: { id: "cat", name: "Category", name_zh: "分类", sort_order: 0 }, error: null }); mock.from.mockReturnValue(query);
    await saveGuideCategory({ id: "cat", name: "Category", nameZh: "分类", sortOrder: 0 }); expect(query.insert).toHaveBeenCalled();
  });
  test("编辑文档保留排序，未传排序时也不写零", async () => {
    const guide: Guide = { id: "guide", categoryId: "cat", version: "v1", docType: "tds", title: "Guide", titleZh: "文档", content: "text", contentZh: "文本", sortOrder: 7, isPublished: true, updatedAt: "2026-11-03T00:00:00Z" };
    const query = builder({ data: {}, error: null }); mock.from.mockReturnValue(query);
    await saveGuide(guide); expect(query.update).toHaveBeenLastCalledWith(expect.objectContaining({ sort_order: 7 }));
    const { sortOrder: _, ...withoutOrder } = guide;
    await saveGuide(withoutOrder as Guide); expect(query.update.mock.calls.at(-1)?.[0]).not.toHaveProperty("sort_order"); expect(query.insert).not.toHaveBeenCalled();
    await saveGuide(guide, true); expect(query.insert).toHaveBeenCalled();
  });
});

describe("完整统计读取", () => {
  test("即使服务器每页限制 300 条，也统计全部 1205 条事件", async () => {
    const rows = Array.from({ length: 1205 }, (_, index) => ({ id: index + 1, visitor_id: `visitor-${index}`, event_type: "page_view", event_data: {}, created_at: "2026-11-03T01:00:00Z" }));
    const cursors: number[] = [];
    mock.from.mockImplementation(() => {
      let cursor = 0;
      const query = { select: vi.fn(), gte: vi.fn(), lte: vi.fn(), order: vi.fn(), limit: vi.fn(), gt: vi.fn(), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows.filter((row) => row.id > cursor).slice(0, 300), error: null }).then(resolve) };
      for (const method of [query.select, query.gte, query.lte, query.order, query.limit]) method.mockReturnValue(query);
      query.gt.mockImplementation((_key, id) => { cursor = id; cursors.push(id); return query; });
      return query;
    });
    const summary = await getAnalyticsSummary(7, new Date("2026-11-03T02:00:00Z"));
    expect(summary.eventTypeCounts.page_view).toBe(1205); expect(summary.uniqueVisitors).toBe(1205);
    expect(summary.dailyViews.reduce((sum, item) => sum + item.count, 0)).toBe(1205); expect(summary.dailyViews).toHaveLength(7);
    expect(cursors).toEqual([300, 600, 900, 1200, 1205]);
  });
  test("读取失败抛错，避免展示假的零统计", async () => {
    const query = { select: vi.fn(), gte: vi.fn(), lte: vi.fn(), order: vi.fn(), limit: vi.fn(), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error: { message: "offline" } }).then(resolve) };
    for (const method of [query.select, query.gte, query.lte, query.order, query.limit]) method.mockReturnValue(query);
    mock.from.mockReturnValue(query);
    await expect(getAnalyticsSummary(7)).rejects.toEqual({ message: "offline" });
  });
});

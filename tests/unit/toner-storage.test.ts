import { beforeEach, expect, test, vi } from "vitest";
import type { Toner } from "@/types";

const mock = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ getSupabaseAdmin: () => mock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mock }));
import { getToners, saveToner } from "@/lib/db-toner";

const toner: Toner = { code: "2K-2001", tradeName: "White", nameZh: "白色", category: "2K_BASECOAT", hex: "#FFFFFF" };
const row = { code: toner.code, trade_name: toner.tradeName, name_zh: toner.nameZh, category: toner.category, hex: toner.hex };
beforeEach(() => vi.clearAllMocks());

test.each([null, "https://hiwe.com/a"])("读取数据库链接 %j", async (website_url) => {
  mock.from.mockReturnValue({ select: () => ({ order: async () => ({ data: [{ ...row, website_url }], error: null }) }) });
  expect((await getToners())[0].websiteUrl).toBe(website_url);
});

test.each([undefined, null, "", "  ", " https://hiwe.com/a "])("保存 %j 时区分省略与解除关联", async (websiteUrl) => {
  const upsert = vi.fn((_row: Record<string, unknown>) => ({ select: () => ({ single: async () => ({ data: { ...row, website_url: websiteUrl?.trim() || null }, error: null }) }) }));
  mock.from.mockReturnValue({ upsert });
  await saveToner({ ...toner, ...(websiteUrl !== undefined ? { websiteUrl } : {}) });
  const saved = upsert.mock.calls[0];
  if (websiteUrl === undefined) expect(saved[0]).not.toHaveProperty("website_url");
  else expect(saved[0]).toEqual({ ...row, website_url: websiteUrl?.trim() || null });
});

import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mock = vi.hoisted(() => ({ auth: vi.fn(), save: vi.fn(), get: vi.fn() }));
vi.mock("@/lib/auth", () => ({ checkSupabaseAdmin: mock.auth }));
vi.mock("@/lib/rate-limit", () => ({ applyRateLimit: () => null, ADMIN_LIMIT: {} }));
vi.mock("@/lib/db-toner", () => ({ saveToner: mock.save, getToners: mock.get, deleteToner: vi.fn() }));
import { GET, POST, PUT } from "@/app/api/admin/toners/route";

const toner = { code: "2K-2001", tradeName: "White", nameZh: "白色", category: "2K_BASECOAT", hex: "#FFFFFF" };
function request(body: unknown) {
  return new NextRequest("http://localhost/api/admin/toners", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.auth.mockResolvedValue({ error: null });
  mock.save.mockImplementation(async (value) => value);
});

describe.each([["新增", POST], ["编辑", PUT]] as const)("色母链接写入：%s", (_label, handler) => {
  test("规范化后写入并返回链接", async () => {
    const response = await handler(request({ ...toner, websiteUrl: "  https://www.hiwe.com/product  " }));
    expect(response.ok).toBe(true);
    expect((await response.json()).websiteUrl).toBe("https://www.hiwe.com/product");
    expect(mock.save).toHaveBeenCalledWith({ ...toner, websiteUrl: "https://www.hiwe.com/product" });
  });
  test.each([null, "", "  "])("显式 %j 解除关联", async (websiteUrl) => {
    expect((await handler(request({ ...toner, websiteUrl }))).ok).toBe(true);
    expect(mock.save).toHaveBeenCalledWith({ ...toner, websiteUrl: null });
  });
  test("旧客户端省略链接时仍省略写入字段", async () => {
    expect((await handler(request(toner))).ok).toBe(true);
    expect(mock.save.mock.calls[0][0]).not.toHaveProperty("websiteUrl");
  });
  test.each([42, false, {}, [], "https://hiwe.com.evil.com/a", "http://hiwe.com/a", "javascript:alert(1)"])("无效链接 %j 返回字段错误而不写入", async (websiteUrl) => {
    const response = await handler(request({ ...toner, websiteUrl }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String), field: "websiteUrl" });
    expect(mock.save).not.toHaveBeenCalled();
  });
  test.each([null, [], "bad body"])("非法请求 %j 返回 400", async (body) => {
    expect((await handler(request(body))).status).toBe(400);
    expect(mock.save).not.toHaveBeenCalled();
  });
  test.each([401, 403])("没有管理员权限时返回 %s", async (status) => {
    mock.auth.mockResolvedValue({ error: NextResponse.json({ error: "forbidden" }, { status }) });
    expect((await handler(request({ ...toner, websiteUrl: "https://hiwe.com/a" }))).status).toBe(status);
    expect(mock.save).not.toHaveBeenCalled();
  });
  test("数据库失败返回可重试错误", async () => {
    mock.save.mockRejectedValue({ message: "internal database error" });
    const response = await handler(request({ ...toner, websiteUrl: "https://hiwe.com/a" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "保存失败，请稍后重试" });
  });
});

test("读取接口返回数据库中的链接", async () => {
  mock.get.mockResolvedValue([{ ...toner, websiteUrl: "https://hiwe.com/a" }]);
  const response = await GET(new NextRequest("http://localhost/api/admin/toners"));
  expect((await response.json())[0].websiteUrl).toBe("https://hiwe.com/a");
});

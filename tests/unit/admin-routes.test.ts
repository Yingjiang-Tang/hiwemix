import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mock = vi.hoisted(() => ({
  auth: vi.fn(), saveFormula: vi.fn(), deleteFormula: vi.fn(), saveColor: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ checkSupabaseAdmin: mock.auth }));
vi.mock("@/lib/rate-limit", () => ({ applyRateLimit: () => null, ADMIN_LIMIT: {} }));
vi.mock("@/lib/db-formula", () => ({ saveFormula: mock.saveFormula, deleteFormula: mock.deleteFormula, saveColor: mock.saveColor, getFormulas: vi.fn(), getColors: vi.fn(), getFormulaTypes: vi.fn() }));
import { POST as createFormula, DELETE as removeFormula } from "@/app/api/admin/formulas/route";
import { PUT as editColor } from "@/app/api/admin/colors/route";
import { POST as createType, PUT as editType, DELETE as removeType } from "@/app/api/admin/variants/route";
import { DELETE as cleanImage } from "@/app/api/admin/formula-image-delete/route";

function request(body: unknown, method = "POST") {
  return new NextRequest("http://localhost/api/admin/formulas", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

beforeEach(() => { vi.clearAllMocks(); mock.auth.mockResolvedValue({ error: null }); });

describe("管理员写入接口回归", () => {
  test.each([null, { id: "f", color_id: "c", version: "v1", paint_system: "2K", formula_type: "Single Stage" }])("不完整配方返回 400 且不调用写入 RPC", async (body) => {
    expect((await createFormula(request(body))).status).toBe(400); expect(mock.saveFormula).not.toHaveBeenCalled();
  });
  test("漏传颜色关联数组不能清空已有年份和关联", async () => {
    expect((await editColor(request({ id: "c", variantIds: [] }, "PUT"))).status).toBe(400);
    expect((await editColor(request({ id: "c", years: [] }, "PUT"))).status).toBe(400);
    expect(mock.saveColor).not.toHaveBeenCalled();
  });
  test.each([createType, editType, removeType])("施工类型接口禁止修改历史关联", async (handler) => {
    expect((await handler(request({ id: "2", name: "changed" }))).status).toBe(409);
  });
  test("删除配方和旧客户端清理请求都保留共享图片", async () => {
    mock.deleteFormula.mockResolvedValue(undefined);
    expect((await removeFormula(request({ id: "f" }, "DELETE"))).status).toBe(200);
    expect(mock.deleteFormula).toHaveBeenCalledWith("f");
    expect(await (await cleanImage(request({ path: "shared.jpg" }, "DELETE"))).json()).toEqual({ success: true, retained: true });
  });
  test.each([createFormula, removeFormula, editColor, createType, editType, removeType, cleanImage])("未登录请求仍被拦截", async (handler) => {
    mock.auth.mockResolvedValue({ error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) });
    expect((await handler(request({}))).status).toBe(401);
  });
});

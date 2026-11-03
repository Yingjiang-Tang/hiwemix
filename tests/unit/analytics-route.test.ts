import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mock = vi.hoisted(() => ({ auth: vi.fn(), insert: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireSupabaseAuth: mock.auth }));
vi.mock("@/lib/db-analytics", () => ({ insertAnalyticsEvent: mock.insert }));
vi.mock("@/lib/rate-limit", () => ({ applyRateLimit: () => null }));
import { POST } from "@/app/api/analytics/route";

const eventTypes = ["page_view", "search", "formula_view", "color_view", "formula_action"];

function request(event_type = "page_view", cookie = "hiwe_visitor_id=visitor-12345678", event_data = {}) {
  return new NextRequest("http://localhost/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ event_type, event_data }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.auth.mockResolvedValue({ user: { id: "user", role: "user" }, error: null });
  mock.insert.mockResolvedValue(true);
});

describe("分析采集排除管理员", () => {
  test.each(eventTypes)("管理员的 %s 不写入，也不生成访客 cookie", async (eventType) => {
    mock.auth.mockResolvedValue({ user: { id: "admin", role: "admin" }, error: null });
    const response = await POST(request(eventType, "", { role: "user", action: "copy" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mock.auth).toHaveBeenCalledOnce();
    expect(mock.insert).not.toHaveBeenCalled();
    expect(response.cookies.get("hiwe_visitor_id")).toBeUndefined();
  });

  test.each(eventTypes)("普通用户的 %s 正常写入", async (eventType) => {
    const response = await POST(request(eventType, undefined, { action: "copy" }));
    expect(response.status).toBe(200);
    expect(mock.insert).toHaveBeenCalledWith({ visitor_id: "visitor-12345678", event_type: eventType, event_data: { action: "copy" }, lang: "en" });
  });

  test("普通新访客继续分配访客 ID；客户端角色字段不参与排除", async () => {
    const response = await POST(request("search", "site-language=zh", { role: "admin", make: "Toyota", result_count: 2 }));
    const visitorId = response.cookies.get("hiwe_visitor_id")?.value;
    expect(visitorId).toMatch(/^[a-f0-9-]{36}$/);
    expect(mock.insert).toHaveBeenCalledWith({ visitor_id: visitorId, event_type: "search", event_data: { make: "Toyota", result_count: 2 }, lang: "zh" });
  });

  test("未登录不能绕过路由层写入事件", async () => {
    mock.auth.mockResolvedValue({ user: null, error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) });
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mock.insert).not.toHaveBeenCalled();
  });

  test("角色查询失败时跳过采集，不能把管理员降级成普通访客", async () => {
    mock.auth.mockRejectedValue(new Error("load profile failed"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(mock.insert).not.toHaveBeenCalled();
    expect(response.cookies.get("hiwe_visitor_id")).toBeUndefined();
  });

  test("账号变更角色后，下一条事件立即按当前角色判断", async () => {
    await POST(request());
    mock.auth.mockResolvedValue({ user: { id: "user", role: "admin" }, error: null });
    await POST(request());
    expect(mock.auth).toHaveBeenCalledTimes(2);
    expect(mock.insert).toHaveBeenCalledOnce();
  });
});

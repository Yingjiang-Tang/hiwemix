import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ updateSession: vi.fn() }));
vi.mock("@/lib/supabase/middleware", () => mocks);
import { proxy } from "@/proxy";

beforeEach(() => { vi.clearAllMocks(); });

test.each(["GET", "HEAD"])("首页静态视频 %s 请求不等待会话校验", async (method) => {
  const response = await proxy(new NextRequest("https://hiwemix.com/video/hero.mp4", {
    method, headers: { Range: "bytes=0-65535" },
  }));
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(mocks.updateSession).not.toHaveBeenCalled();
});

test.each(["/favorites", "/api/favorites", "/api/formulas/hero.mp4", "/admin/hero.mp4"]) ("未登录响应 %s 也保留会话清理及禁止缓存标头", async (path) => {
  const refreshed = NextResponse.next();
  refreshed.cookies.set("sb-audit-auth-token", "", { maxAge: 0 });
  refreshed.headers.set("Cache-Control", "private, no-store");
  mocks.updateSession.mockResolvedValue({ supabaseResponse: refreshed, user: null });
  const response = await proxy(new NextRequest(`https://hiwemix.com${path}`));
  expect(response.status).toBe(path.startsWith("/api/") ? 401 : 307);
  expect(response.cookies.get("sb-audit-auth-token")?.maxAge).toBe(0);
  expect(response.headers.get("cache-control")).toContain("no-store");
});

test("登录状态的刷新凭据和禁止缓存标头一起传递", async () => {
  const refreshed = NextResponse.next();
  refreshed.cookies.set("sb-audit-auth-token", "refreshed-session");
  refreshed.headers.set("Cache-Control", "private, no-store");
  refreshed.headers.set("Pragma", "no-cache");
  mocks.updateSession.mockResolvedValue({ supabaseResponse: refreshed, user: { id: "account-a", email: "a@example.invalid" } });
  const response = await proxy(new NextRequest("https://hiwemix.com/favorites"));
  expect(response.cookies.get("sb-audit-auth-token")?.value).toBe("refreshed-session");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(response.headers.get("x-middleware-request-x-user-id")).toBe("account-a");
});

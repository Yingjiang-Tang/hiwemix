import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { isLocalPreviewRequest, LOCAL_PREVIEW_HEADER } from "@/lib/local-preview";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(), createServerClient: vi.fn(), getSupabaseAdmin: vi.fn(), updateSession: vi.fn(),
  sessionClient: { auth: { getUser: vi.fn() } },
  previewClient: { auth: { getUser: vi.fn() } },
}));
vi.mock("next/headers", () => ({ headers: mocks.headers, cookies: async () => ({ getAll: () => [] }) }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("@/lib/supabase-server", () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }));
vi.mock("@/lib/supabase/middleware", () => ({ updateSession: mocks.updateSession }));

import { proxy } from "@/proxy";
import { createClient } from "@/lib/supabase/server";
import { requireLogin, requireSupabaseAuth } from "@/lib/auth";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  mocks.headers.mockResolvedValue(new Headers({ host: "127.0.0.1:3000", [LOCAL_PREVIEW_HEADER]: "1" }));
  mocks.createServerClient.mockReturnValue(mocks.sessionClient);
  mocks.getSupabaseAdmin.mockReturnValue(mocks.previewClient);
  mocks.sessionClient.auth.getUser.mockResolvedValue({ data: { user: null } });
  mocks.previewClient.auth.getUser.mockResolvedValue({ data: { user: null } });
  mocks.updateSession.mockResolvedValue({ supabaseResponse: NextResponse.next(), user: null });
});
afterEach(() => vi.unstubAllEnvs());

test.each(["localhost:3000", "127.0.0.1:3000", "[::1]:3000"])("本机开发 %s 可直接预览和读取配方", async (host) => {
  const request = new NextRequest(`http://${host}/api/formulas`);
  expect(isLocalPreviewRequest(request)).toBe(true);
  const response = await proxy(request);
  expect(response.headers.get(`x-middleware-request-${LOCAL_PREVIEW_HEADER}`)).toBe("1");
  expect(mocks.updateSession).not.toHaveBeenCalled();
});

test("标记只读请求可访问真实数据，但不获得账号身份", async () => {
  expect(await requireLogin()).toBeNull();
  expect(await createClient()).toBe(mocks.previewClient);
  expect((await requireSupabaseAuth()).error?.status).toBe(401);
});

test.each(["/api/admin/colors", "/api/favorites", "/api/auth/me", "/admin"])("本机预览不放行私有路径 %s", async (path) => {
  const request = new NextRequest(`http://127.0.0.1:3000${path}`, { headers: { [LOCAL_PREVIEW_HEADER]: "1" } });
  expect(isLocalPreviewRequest(request)).toBe(false);
  const response = await proxy(request);
  expect(response.status).toBe(path.startsWith("/api/") ? 401 : 307);
  expect(request.headers.has(LOCAL_PREVIEW_HEADER)).toBe(false);
});

test.each(["POST", "PUT", "DELETE"])("本机预览不放行 %s 写入", async (method) => {
  const response = await proxy(new NextRequest("http://127.0.0.1:3000/api/formulas", { method }));
  expect(response.status).toBe(401);
});

test.each(["production", "test"])("%s 模式即使伪造预览标记仍需登录", async (mode) => {
  vi.stubEnv("NODE_ENV", mode);
  const response = await proxy(new NextRequest("http://127.0.0.1:3000/api/formulas", { headers: { [LOCAL_PREVIEW_HEADER]: "1" } }));
  expect(response.status).toBe(401);
  expect((await requireLogin())?.status).toBe(401);
  expect(await createClient()).toBe(mocks.sessionClient);
  expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled();
});

test.each(["hiwemix.com", "192.168.1.10:3000", "localhost.evil.example"])("其他主机 %s 不启用免登录", async (host) => {
  mocks.headers.mockResolvedValue(new Headers({ host, [LOCAL_PREVIEW_HEADER]: "1" }));
  expect(isLocalPreviewRequest(new Request(`http://${host}/api/formulas`))).toBe(false);
  expect((await requireLogin())?.status).toBe(401);
  expect(await createClient()).toBe(mocks.sessionClient);
});

test("未经过 proxy 标记的本机请求仍按正常会话访问", async () => {
  mocks.headers.mockResolvedValue(new Headers({ host: "127.0.0.1:3000" }));
  expect((await requireLogin())?.status).toBe(401);
  expect(await createClient()).toBe(mocks.sessionClient);
});

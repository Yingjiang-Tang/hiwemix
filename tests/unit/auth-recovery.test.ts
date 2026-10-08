import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { createRecoveryToken } from "@/lib/password-recovery";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(),
  cookieGet: vi.fn(), cookieGetAll: vi.fn(), cookieDelete: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookieGet, getAll: mocks.cookieGetAll, delete: mocks.cookieDelete }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: mocks }) }));

import { GET, POST } from "@/app/auth/recovery/route";

function request(body: object, origin = "https://hiwemix.com") {
  return new NextRequest("https://hiwemix.com/auth/recovery", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_SECRET_KEY", "audit-signing-key");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://audit.supabase.co");
  mocks.cookieGet.mockReturnValue({ value: createRecoveryToken("account-a") });
  mocks.cookieGetAll.mockReturnValue([{ name: "sb-audit-auth-token", value: "audit-session" }]);
  mocks.getUser.mockResolvedValue({ data: { user: { id: "account-a", email: "a@example.invalid" } }, error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
});

test("只在签名和当前账号都有效时显示已验证邮箱", async () => {
  const response = await GET();
  expect(await response.json()).toEqual({ user: { id: "account-a", email: "a@example.invalid" } });
  mocks.cookieGet.mockReturnValue({ value: "1" });
  expect((await GET()).status).toBe(401);
});

test("另一标签页切换账号后，拒绝修改新账号的密码", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "account-b" } }, error: null });
  const response = await POST(request({ userId: "account-a", password: "safe-password" }));
  expect(response.status).toBe(409);
  expect(mocks.updateUser).not.toHaveBeenCalled();
});

test("另一标签页验证新账号后，旧表单也不能更新密码", async () => {
  mocks.cookieGet.mockReturnValue({ value: createRecoveryToken("account-b") });
  expect((await POST(request({ userId: "account-a", password: "safe-password" }))).status).toBe(409);
  expect(mocks.updateUser).not.toHaveBeenCalled();
});

test("密码更新成功后清除浏览器会话和恢复标记，退出故障不影响清理", async () => {
  mocks.signOut.mockRejectedValue(new Error("Temporary auth outage"));
  const response = await POST(request({ userId: "account-a", password: "safe-password" }));
  expect(response.status).toBe(200);
  expect(mocks.updateUser).toHaveBeenCalledWith({ password: "safe-password" });
  expect(mocks.cookieDelete).toHaveBeenCalledWith("sb-audit-auth-token");
  expect(mocks.cookieDelete).toHaveBeenCalledWith("pw_recovery");
});

test("拒绝跨站请求和不符合要求的密码", async () => {
  expect((await POST(request({ userId: "account-a", password: "safe-password" }, "https://evil.example"))).status).toBe(403);
  expect((await POST(request({ userId: "account-a", password: "short" }))).status).toBe(400);
  expect(mocks.updateUser).not.toHaveBeenCalled();
});

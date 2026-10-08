import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth }) }));

import { GET } from "@/app/auth/callback/route";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://audit.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "audit-anon-key");
  vi.stubEnv("SUPABASE_SECRET_KEY", "audit-signing-key");
  vi.clearAllMocks();
  auth.exchangeCodeForSession.mockResolvedValue({
    data: { user: { id: "account-a" }, session: {}, redirectType: "recovery" },
    error: null,
  });
});

describe("邮件认证回调", () => {
  test("没有 type 参数的旧重置链接也能进入新密码步骤", async () => {
    const response = await GET(new NextRequest("https://hiwemix.com/auth/callback?code=valid&next=%2Freset-password"));
    expect(response.headers.get("location")).toBe("https://hiwemix.com/reset-password?from=email");
    expect(response.cookies.get("pw_recovery")?.value).not.toBe("1");
    expect(response.cookies.get("pw_recovery")?.httpOnly).toBe(true);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  test("旧重置链接失效后回找回密码页重新申请", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ data: { user: null, session: null }, error: { code: "otp_expired" } });
    const response = await GET(new NextRequest("https://hiwemix.com/auth/callback?code=expired&next=%2Freset-password"));
    expect(response.headers.get("location")).toBe("https://hiwemix.com/reset-password?error=expired");
  });

  test("跨设备邮件令牌通过 verifyOtp 验证，无需原浏览器的 PKCE cookie", async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user: { id: "account-a" }, session: {} }, error: null });
    const response = await GET(new NextRequest("https://hiwemix.com/auth/callback?token_hash=valid-hash&type=recovery"));
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "valid-hash", type: "recovery" });
    expect(response.headers.get("location")).toBe("https://hiwemix.com/reset-password?from=email");
  });

  test.each(["//evil.example", "/\\evil.example", "https://evil.example", "/%5cevil.example"]) (
    "拒绝站外跳转 %s", async (next) => {
      auth.exchangeCodeForSession.mockResolvedValue({ data: { user: { id: "account-a" }, session: {} }, error: null });
      const response = await GET(new NextRequest(`https://hiwemix.com/auth/callback?code=valid&next=${encodeURIComponent(next)}`));
      expect(response.headers.get("location")).toBe("https://hiwemix.com/");
    }
  );
});

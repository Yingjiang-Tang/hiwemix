import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSafeAuthNext } from "@/lib/auth-redirect";
import { createRecoveryToken, RECOVERY_COOKIE, RECOVERY_MAX_AGE } from "@/lib/password-recovery";
import { fetchWithAuthTimeout } from "@/lib/auth-fetch";

// 同时支持原浏览器的 PKCE code 和邮件模板中的 token_hash（可跨设备）。
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = getSafeAuthNext(searchParams.get("next"));
  const isRecoveryRequest = type === "recovery" || new URL(next, origin).pathname === "/reset-password";
  const failurePath = isRecoveryRequest ? "/reset-password?error=expired" : "/login?error=link_invalid";
  const response = NextResponse.redirect(new URL(failurePath, origin));
  response.headers.set("Cache-Control", "private, no-store");
  if (searchParams.get("error")) return response;
  if (!code && !tokenHash) {
    response.headers.set("location", new URL("/login", origin).toString());
    return response;
  }

  try {
    // 所有 cookie 都写到最终响应上，失败时也保留 SDK 的清理操作。
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { fetch: fetchWithAuthTimeout },
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      }
    );
    if (tokenHash && type !== "recovery" && type !== "signup" && type !== "email") return response;
    const { data, error } = tokenHash && (type === "recovery" || type === "signup" || type === "email")
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : await supabase.auth.exchangeCodeForSession(code!);
    if (error || !data.user || !data.session) return response;

    // SDK 从 PKCE verifier 中恢复流程类型，兼容没有 type 参数的旧邮件。
    const isRecovery = type === "recovery" || ("redirectType" in data && data.redirectType === "recovery");
    let destination = next;
    if (isRecovery) {
      destination = "/reset-password?from=email";
      response.cookies.set(RECOVERY_COOKIE, createRecoveryToken(data.user.id), {
        maxAge: RECOVERY_MAX_AGE, path: "/", sameSite: "lax", httpOnly: true, secure: origin.startsWith("https://"),
      });
    } else {
      // 普通登录后清除先前账号的恢复标记，防止旧表单误用新会话。
      response.cookies.set(RECOVERY_COOKIE, "", { maxAge: 0, path: "/" });
    }
    response.headers.set("location", new URL(destination, origin).toString());
  } catch {
    // 只返回本地错误标识，邮件令牌和上游错误不进入页面或日志。
    response.headers.set("location", new URL(failurePath, origin).toString());
  }
  return response;
}

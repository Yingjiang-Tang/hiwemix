import { NextResponse } from "next/server";
// The client sends the user to this route from the browser so our supabase client
// must be the server one (cookies).
import { createClient } from "@/lib/supabase/server";

// 统一的 Auth 回调路由
// - Google OAuth 完成后 Supabase 跳转：/auth/callback?code=xxx
// - 邮箱注册确认链接：/auth/callback?code=xxx&type=signup
// - 密码重置链接：/auth/callback?code=xxx&type=recovery
// 此路由用 code 交换 session，设置 cookie，然后根据 type/next 重定向到目标页面
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const type = searchParams.get("type"); // signup | recovery | implicit | null
  const next = searchParams.get("next") ?? "/";

  if (error) {
    const errorPath = next.startsWith("/login")
      ? `/login?error=${encodeURIComponent(error)}`
      : `/login?error=${encodeURIComponent(error)}`;
    return NextResponse.redirect(`${origin}${errorPath}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // 根据 type 决定下一步：注册确认 / 密码重置 走专门页面，其他走 next
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password?from=email`);
      }
      if (type === "signup" || type === "email") {
        return NextResponse.redirect(`${origin}/login?confirmed=1`);
      }
      // OAuth 或未指定 type：跳到 next（默认 /）
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Auth callback error:", exchangeError.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
    );
  }

  // 没有 code 也没有 error，回登录页
  return NextResponse.redirect(`${origin}/login`);
}
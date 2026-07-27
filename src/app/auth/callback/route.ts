import { NextResponse } from "next/server";
// The client send the user to this route from the browser so our supabase client
// must be the server one (cookies).
import { createClient } from "@/lib/supabase/server";

// Google OAuth 回调路由
// Supabase 在 OAuth 完成后将用户重定向到此地址，URL 中带有 ?code=xxx
// 此路由用 code 交换 session，然后重定向回首页
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // 如果 OAuth 提供者传回 error（例如用户取消授权），重定向到登录页
  const error = searchParams.get("error");

  // 如果有 next 参数，登录成功后跳转到该地址
  const next = searchParams.get("next") ?? "/";

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // 登录成功，跳转到目标页面
      return NextResponse.redirect(`${origin}${next}`);
    }

    // code 交换失败
    console.error("OAuth callback error:", exchangeError.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
    );
  }

  // 没有 code 也没有 error，直接回登录页
  return NextResponse.redirect(`${origin}/login`);
}

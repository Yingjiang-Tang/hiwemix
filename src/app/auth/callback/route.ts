import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// 统一的 Auth 回调路由
// - Google OAuth 完成后 Supabase 跳转：/auth/callback?code=xxx
// - 邮箱注册确认链接：/auth/callback?code=xxx&type=signup
// - 密码重置链接：/auth/callback?code=xxx&type=recovery
//
// 用 code 交换 session，把 session cookie 直接写到「将返回的 redirect 响应」上，
// 确保随 302 落到浏览器（不依赖 next/headers cookies() 存储与独立 NextResponse 的隐式合并）。
// signup 确认后已建立 session，自动登录跳首页并带 ?verified=1 提示。
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const type = searchParams.get("type"); // signup | recovery | implicit | null
  const next = searchParams.get("next") ?? "/";

  // Supabase 返回错误（如链接过期）。
  // 密码重置链接（next 指向 /reset-password）出错 → 回重置页提示重新申请；
  // 其他 → 回登录页带 error。
  if (error) {
    if (next.startsWith("/reset-password")) {
      return NextResponse.redirect(`${origin}/reset-password?error=expired`);
    }
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  if (code) {
    // 先决定成功目的地
    let destination: string;
    if (type === "recovery") {
      destination = `${origin}/reset-password?from=email`;
    } else if (type === "signup" || type === "email") {
      // 邮箱确认后已建立 session，自动登录跳首页
      destination = `${origin}/?verified=1`;
    } else {
      // OAuth 或未指定 type：跳 next（默认 /）
      destination = `${origin}${next}`;
    }

    // 先构造响应，再把 supabase client 绑定到它上面：
    // getAll 读入站 cookie（含 PKCE verifier），setAll 直接写到该响应的 Set-Cookie
    const response = NextResponse.redirect(destination);
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Auth callback error:", exchangeError.message);
      // 密码重置流程交换失败（链接过期/已用）→ 回重置页提示重新申请
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password?error=expired`);
      }
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    // session cookie 已写在 response 上，随 302 落到浏览器
    return response;
  }

  // 没有 code 也没有 error，回登录页
  return NextResponse.redirect(`${origin}/login`);
}

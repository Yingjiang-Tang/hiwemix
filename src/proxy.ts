import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 起 Middleware 更名为 Proxy（文件约定 proxy.ts），功能不变。
// 全站登录门禁：未登录访问任意页面/接口一律拦截，仅认证页 + 回调 + 静态资源放行。

const NEW_DOMAIN = "hiwemix.com";
const REDIRECT_HOSTS = ["hiwe-formula-search.vercel.app", "www.hiwemix.com"];

export async function proxy(req: NextRequest) {
  const { pathname, host } = req.nextUrl;

  // 旧域名 / www 统一 301 永久重定向到主域名
  if (REDIRECT_HOSTS.includes(host)) {
    const newUrl = new URL(pathname + req.nextUrl.search, `https://${NEW_DOMAIN}`);
    return NextResponse.redirect(newUrl, 301);
  }

  // 静态资源文件（图片、字体等）直接放行——仅限非 API/管理路径，
  // 防止未来动态路由（如 /api/formulas/[id]）用 .jpg 后缀伪装绕过认证
  if (
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/admin/") &&
    /\.(jpg|jpeg|png|gif|svg|ico|webp|avif|woff2?|ttf|eot)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 公开路由，不需要认证（全站内容已锁定：仅认证页 + auth 回调 + 静态资源）
  // 精确匹配的路由（页面）
  const exactPublic = ["/login", "/register", "/reset-password"];
  // 前缀匹配的路由（API + 静态资源）
  // 注意：/api/auth/login、/api/auth/register 路由并不存在，不列入白名单（避免未来误开放）
  const prefixPublic = [
    "/auth/callback",
    "/_next",
    "/favicon.ico",
  ];
  if (
    exactPublic.includes(pathname) ||
    prefixPublic.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // 使用 Supabase SSR 刷新 session 并获取用户
  const { supabaseResponse, user } = await updateSession(req);

  // 未登录 → 返回 401（API）或重定向到登录页（页面，带上原目标便于登录后跳回）
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const next = encodeURIComponent(pathname + req.nextUrl.search);
    return NextResponse.redirect(new URL(`/login?next=${next}`, req.url));
  }

  // 将用户信息附加到 request header，供下游 API 路由使用
  // admin 角色的具体授权检查在各 API 路由中独立完成
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", user.id);
  requestHeaders.set("x-user-email", user.email ?? "");

  // 复制 supabase 写入的 session cookie 到最终响应
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  supabaseResponse.cookies.getAll().forEach((c) => {
    response.cookies.set(c.name, c.value, c);
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

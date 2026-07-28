// 邮件链接 redirectTo 辅助函数
// 邮件链接（注册确认、密码重置）必须使用 Supabase Site URL 同源的 redirectTo，
// 否则 Supabase 会把路径吞掉，导致用户点击链接后跳到首页而非目标页面。
//
// 优先级：
// 1. NEXT_PUBLIC_SITE_URL（生产域名） — 必须与 Supabase Dashboard 的 Site URL 一致
// 2. window.location.origin（当前域名） — 仅用于本地开发（需要在 Supabase 添加 Redirect URL 白名单）
export function getEmailRedirectTo(path: string, searchParams?: Record<string, string>): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const origin =
    siteUrl ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", path);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}
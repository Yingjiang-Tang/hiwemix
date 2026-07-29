// 邮件链接 redirectTo 辅助函数
//
// PKCE 流程下，signUp/resetPasswordForEmail 会把 code-verifier 写在「当前 origin」的 cookie 里。
// 因此邮件确认链接的 redirect_to 必须与用户当前所在的 origin 同源，否则回调路由
// exchangeCodeForSession 读不到 verifier 会失败。
//
// 始终使用 window.location.origin（本函数仅被客户端组件调用，window 必然可用）：
// - 本地开发：http://localhost:3000/auth/callback
// - 生产环境：https://hiwemix.com/auth/callback
//
// Supabase 行为：redirect_to 必须在 Dashboard 的 Redirect URLs 白名单里；
// 不在白名单时 Supabase 会回退到 Site URL 并丢弃路径（而非「必须等于 Site URL」）。
// 所以 localhost 与 hiwemix.com 两个 origin 都需要加进白名单。
export function getEmailRedirectTo(path: string, searchParams?: Record<string, string>): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", path);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

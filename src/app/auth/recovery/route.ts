import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRecoveryUserId, RECOVERY_COOKIE } from "@/lib/password-recovery";

function json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

// 恢复会话只由服务端确认，URL 参数不能证明邮箱已验证。
export async function GET() {
  try {
    const store = await cookies();
    const recoveredId = getRecoveryUserId(store.get(RECOVERY_COOKIE)?.value);
    if (!recoveredId) return json({ error: "session_expired" }, 401);
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: "session_expired" }, 401);
    if (user.id !== recoveredId) return json({ error: "account_changed" }, 409);
    return json({ user: { id: user.id, email: user.email ?? "" } });
  } catch { return json({ error: "temporarily_unavailable" }, 503); }
}

export async function POST(request: NextRequest) {
  // Cookie 认证的写请求必须同源，避免跨站表单误触发改密。
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "forbidden" }, 403);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "invalid_password" }, 400); }
  if (!body || typeof body !== "object" || !("password" in body) || !("userId" in body)) return json({ error: "invalid_password" }, 400);
  if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128 || typeof body.userId !== "string") return json({ error: "invalid_password" }, 400);

  try {
    const store = await cookies();
    const recoveredId = getRecoveryUserId(store.get(RECOVERY_COOKIE)?.value);
    if (!recoveredId) return json({ error: "session_expired" }, 401);
    if (body.userId !== recoveredId) return json({ error: "account_changed" }, 409);
    // 此客户端读取本次请求的 cookie 快照，不受另一标签页后续切换账号影响。
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "session_expired" }, 401);
    if (user.id !== recoveredId) return json({ error: "account_changed" }, 409);
    const { error } = await supabase.auth.updateUser({ password: body.password });
    if (error) {
      const code = ["same_password", "weak_password"].includes(error.code ?? "") ? error.code : error.status === 429 ? "rate_limit" : "update_failed";
      return json({ error: code }, 400);
    }

    // 改密后撤销旧会话；即使上游退出失败，也清除当前浏览器的会话 cookie。
    try { await supabase.auth.signOut(); } catch { /* 当前会话在下方清理 */ }
    const authCookie = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;
    for (const cookie of store.getAll()) {
      if (cookie.name === authCookie || cookie.name.startsWith(`${authCookie}.`)) store.delete(cookie.name);
    }
    store.delete(RECOVERY_COOKIE);
    return json({ success: true });
  } catch { return json({ error: "temporarily_unavailable" }, 503); }
}

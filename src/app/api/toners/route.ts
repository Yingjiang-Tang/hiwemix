import { getToners } from "@/lib/db-toner";
import { safeJson } from "@/lib/api-error";
import { requireLogin } from "@/lib/auth";

// 动态接口：每次请求直接从 Supabase 获取最新数据（登录用户，此处为路由级纵深防御）
// 注意：/api/admin/toners 的 POST/PUT/DELETE 操作后，客户端应重新 fetch 此接口
export async function GET() {
  const authError = await requireLogin();
  if (authError) return authError;
  return safeJson(() => getToners());
}

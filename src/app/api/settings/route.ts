import { getSettings } from "@/lib/db-formula";
import { safeJson } from "@/lib/api-error";
import { requireLogin } from "@/lib/auth";

// 公开读（登录用户），供 SearchPanel 加载自定义参数（全站已登录门禁，此处为路由级纵深防御）
export async function GET() {
  const authError = await requireLogin();
  if (authError) return authError;
  return safeJson(() => getSettings());
}

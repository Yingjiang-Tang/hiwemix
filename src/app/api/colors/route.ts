import { getColors } from "@/lib/db-formula";
import { safeJson } from "@/lib/api-error";
import { requireLogin } from "@/lib/auth";

// 公开读取接口：搜索页、颜色库等登录用户访问（全站已登录门禁，此处为路由级纵深防御）
export async function GET() {
  const authError = await requireLogin();
  if (authError) return authError;
  return safeJson(() => getColors());
}

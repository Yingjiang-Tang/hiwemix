import { NextRequest } from "next/server";
import { requireSupabaseAuth, requireSupabaseAdmin } from "@/lib/auth";
import { applyRateLimit, ADMIN_LIMIT } from "@/lib/rate-limit";
import { getAnalyticsSummary } from "@/lib/db-analytics";
import { safeJson } from "@/lib/api-error";

// 管理员面板：聚合行为统计数据（不含个人身份）

export async function GET(req: NextRequest) {
  const limitRes = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes) return limitRes;

  const { user, error } = await requireSupabaseAuth();
  if (error) return error;
  const adminErr = requireSupabaseAdmin(user);
  if (adminErr) return adminErr;

  // 默认统计近 14 天；支持 ?days=N 覆盖
  const daysParam = Number(req.nextUrl.searchParams.get("days"));
  const days = Number.isInteger(daysParam) && daysParam > 0 && daysParam <= 90 ? daysParam : 14;

  return safeJson(() => getAnalyticsSummary(days));
}

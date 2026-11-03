import { safeJson } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { checkSupabaseAdmin } from "@/lib/auth";
import { applyRateLimit, ADMIN_LIMIT } from "@/lib/rate-limit";
import { getFormulaTypes } from "@/lib/db-formula";

export async function GET(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_GET = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_GET) return limitRes_GET;
  const { error: authError } = await checkSupabaseAdmin();
  if (authError) return authError;
  return safeJson(() => getFormulaTypes());
}

// 施工类型是配方校验使用的内置值，禁止改名或删除导致历史配方失效。
export async function POST(req: NextRequest) {
  const limitRes = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes) return limitRes;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;
  return NextResponse.json({ error: "配方类型为内置只读数据，不能新增、修改或删除" }, { status: 409 });
}

export const PUT = POST;
export const DELETE = POST;

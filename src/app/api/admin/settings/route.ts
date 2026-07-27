import { NextRequest, NextResponse } from "next/server";
import { checkSupabaseAdmin } from "@/lib/auth";
import { applyRateLimit, ADMIN_LIMIT } from "@/lib/rate-limit";
import { getSettings, saveSettings } from "@/lib/db-formula";

export async function GET(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_GET = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_GET) return limitRes_GET;
  const { error: authError } = await checkSupabaseAdmin();
  if (authError) return authError;
  return NextResponse.json(await getSettings());
}

export async function PUT(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_PUT = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_PUT) return limitRes_PUT;
  const { error: authError } = await checkSupabaseAdmin();
  if (authError) return authError;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.finishes) || !Array.isArray(b.types) ||
      typeof b.yearMin !== "number" || typeof b.yearMax !== "number" ||
      b.yearMin > b.yearMax || b.yearMin < 0 || b.yearMax > 9999) {
    return NextResponse.json({ error: "设置参数无效" }, { status: 400 });
  }

  const saved = await saveSettings({
    finishes: b.finishes.filter((f): f is string => typeof f === "string"),
    types: b.types.filter((t): t is string => typeof t === "string"),
    yearMin: Math.floor(b.yearMin),
    yearMax: Math.floor(b.yearMax),
  });
  return NextResponse.json(saved);
}

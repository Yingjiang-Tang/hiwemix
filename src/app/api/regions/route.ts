import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, PUBLIC_LIMIT } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { requireLogin } from "@/lib/auth";
import type { Region } from "@/types";

// GET /api/regions - Get all regions (登录后可用)
export async function GET(req: NextRequest) {
  // 公开 API 限流：每分钟 120 次
  const limitRes_GET = applyRateLimit(req, PUBLIC_LIMIT);
  if (limitRes_GET) return limitRes_GET;
  // 路由级纵深防御：proxy 门禁之外的第二道防线
  const authError = await requireLogin();
  if (authError) return authError;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("regions")
      .select("code")
      .order("code", { ascending: true });

    if (error) {
      // 内部错误脱敏：不把 DB 错误细节返回给客户端
      console.error("[GET /api/regions]", error.message);
      return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
    }

    const regions: Region[] = (data ?? []).map((r) => ({ code: r.code }));
    return NextResponse.json(regions);
  } catch (err) {
    console.error("[GET /api/regions]", err);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

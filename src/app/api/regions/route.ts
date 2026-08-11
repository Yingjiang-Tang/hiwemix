import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, PUBLIC_LIMIT } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api-error";
import type { Region } from "@/types";

// GET /api/regions - Get all regions (登录后可用)
export async function GET(req: NextRequest) {
  // 公开 API 限流：每分钟 120 次
  const limitRes_GET = applyRateLimit(req, PUBLIC_LIMIT);
  if (limitRes_GET) return limitRes_GET;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("regions")
      .select("code")
      .order("code", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const regions: Region[] = (data ?? []).map((r) => ({ code: r.code }));
    return NextResponse.json(regions);
  } catch (err) {
    return jsonError(err);
  }
}

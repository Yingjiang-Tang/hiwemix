import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { applyRateLimit } from "@/lib/rate-limit";
import { insertAnalyticsEvent, type AnalyticsEventType } from "@/lib/db-analytics";
import { LANG_COOKIE, VISITOR_COOKIE } from "@/lib/cookies";

// 埋点限流：公开端点，防刷，每 IP 每分钟 120 次
const LIMIT = { prefix: "analytics", maxRequests: 120, windowMs: 60_000 };

const ALLOWED_TYPES: AnalyticsEventType[] = ["page_view", "search", "formula_view", "color_view"];

const VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1 年

/** POST /api/analytics — 写入一条行为事件；首次访问时生成并下发 visitor_id cookie */
export async function POST(req: NextRequest) {
  const limitRes = applyRateLimit(req, LIMIT);
  if (limitRes) return limitRes;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { event_type, event_data } = (body ?? {}) as {
    event_type?: string;
    event_data?: Record<string, string | number | undefined>;
  };
  if (!event_type || !ALLOWED_TYPES.includes(event_type as AnalyticsEventType)) {
    return NextResponse.json({ error: "invalid event_type" }, { status: 400 });
  }

  // visitor_id 优先读客户端已有 cookie；没有则用 crypto 随机 UUID 生成并下发
  let visitorId = req.cookies.get(VISITOR_COOKIE)?.value ?? "";
  const res = NextResponse.json({ ok: true });
  if (!visitorId) {
    visitorId = randomUUID();
    res.cookies.set(VISITOR_COOKIE, visitorId, {
      path: "/",
      maxAge: VISITOR_MAX_AGE,
      sameSite: "lax",
    });
  }

  const lang = req.cookies.get(LANG_COOKIE)?.value ?? "en";

  await insertAnalyticsEvent({ visitor_id: visitorId, event_type: event_type as AnalyticsEventType, event_data: event_data ?? {}, lang });

  return res;
}

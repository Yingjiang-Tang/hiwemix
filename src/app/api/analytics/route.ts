import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { applyRateLimit } from "@/lib/rate-limit";
import { insertAnalyticsEvent, type AnalyticsEventType } from "@/lib/db-analytics";
import { LANG_COOKIE, VISITOR_COOKIE } from "@/lib/cookies";

// 埋点限流：公开端点，防刷，每 IP 每分钟 120 次
const LIMIT = { prefix: "analytics", maxRequests: 120, windowMs: 60_000 };

const ALLOWED_TYPES: AnalyticsEventType[] = ["page_view", "search", "formula_view", "color_view"];

// event_data 白名单：只收埋点 SDK 会发的键，拒绝任意键注入（防污染聚合统计）
const ALLOWED_DATA_KEYS = new Set(["make", "code", "name", "year", "page", "formula_id", "variant", "version"]);
const MAX_VALUE_LEN = 200;

const VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1 年
const VISITOR_ID_RE = /^[A-Za-z0-9-]{8,64}$/; // 合法 UUID / cookie 值

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
    event_data?: Record<string, unknown>;
  };
  if (!event_type || !ALLOWED_TYPES.includes(event_type as AnalyticsEventType)) {
    return NextResponse.json({ error: "invalid event_type" }, { status: 400 });
  }

  // 过滤 event_data：只保留白名单键、值仅允许 string/number 且限制长度
  const cleanData: Record<string, string | number> = {};
  if (event_data && typeof event_data === "object" && !Array.isArray(event_data)) {
    for (const [k, v] of Object.entries(event_data)) {
      if (!ALLOWED_DATA_KEYS.has(k)) continue;
      if (typeof v === "string") {
        const s = v.slice(0, MAX_VALUE_LEN);
        if (s !== "") cleanData[k] = s;
      } else if (typeof v === "number" && Number.isFinite(v)) {
        cleanData[k] = v;
      }
    }
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
  } else if (!VISITOR_ID_RE.test(visitorId)) {
    // cookie 被客户端污染（格式非法）：重新生成，避免伪造 ID 合并统计
    visitorId = randomUUID();
    res.cookies.set(VISITOR_COOKIE, visitorId, {
      path: "/",
      maxAge: VISITOR_MAX_AGE,
      sameSite: "lax",
    });
  }

  const lang = req.cookies.get(LANG_COOKIE)?.value ?? "en";

  await insertAnalyticsEvent({ visitor_id: visitorId, event_type: event_type as AnalyticsEventType, event_data: cleanData, lang });

  return res;
}

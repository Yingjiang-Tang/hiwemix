import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuth } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { getUserFavorites, addUserFavorite, removeUserFavorite } from "@/lib/db-favorites";
import type { FavoriteSnapshot } from "@/lib/db-favorites";

// 登录用户限流：每分钟 120 次
const USER_LIMIT = { prefix: "user", maxRequests: 120, windowMs: 60_000 };

function extractError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

/** GET /api/favorites — 获取当前用户收藏列表 */
export async function GET(req: NextRequest) {
  const limitRes = applyRateLimit(req, USER_LIMIT);
  if (limitRes) return limitRes;
  const { user, error: authError } = await requireSupabaseAuth();
  if (authError) return authError;

  try {
    const favorites = await getUserFavorites(user.id);
    return NextResponse.json(favorites);
  } catch (e: unknown) {
    const msg = extractError(e);
    console.error("[GET /api/favorites]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/favorites — 收藏一个配方（body: FavoriteSnapshot） */
export async function POST(req: NextRequest) {
  try {
    const limitRes = applyRateLimit(req, USER_LIMIT);
    if (limitRes) return limitRes;
    const { user, error: authError } = await requireSupabaseAuth();
    if (authError) return authError;

    let body: FavoriteSnapshot;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    if (!body?.formula_id) {
      return NextResponse.json({ error: "缺少 formula_id" }, { status: 400 });
    }

    const saved = await addUserFavorite(user.id, {
      formula_id: body.formula_id,
      color_code: body.color_code ?? "",
      color_name: body.color_name ?? "",
      make_name: body.make_name ?? "",
      formula_type: body.formula_type ?? "",
      paint_system: body.paint_system ?? "",
      version: body.version ?? "",
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (e: unknown) {
    const msg = extractError(e);
    console.error("[POST /api/favorites]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/favorites?formula_id=xxx — 取消收藏 */
export async function DELETE(req: NextRequest) {
  try {
    const limitRes = applyRateLimit(req, USER_LIMIT);
    if (limitRes) return limitRes;
    const { user, error: authError } = await requireSupabaseAuth();
    if (authError) return authError;

    const formulaId = req.nextUrl.searchParams.get("formula_id");
    if (!formulaId) return NextResponse.json({ error: "缺少 formula_id" }, { status: 400 });

    await removeUserFavorite(user.id, formulaId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = extractError(e);
    console.error("[DELETE /api/favorites]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

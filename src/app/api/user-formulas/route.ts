import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuth } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rate-limit";
import {
  getUserSavedFormulas,
  addUserSavedFormula,
  removeUserSavedFormula,
  type SaveFormulaInput,
} from "@/lib/db-user-formulas";

// 登录用户限流：每分钟 120 次
const USER_LIMIT = { prefix: "user", maxRequests: 120, windowMs: 60_000 };

function extractError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

/** GET /api/user-formulas — 获取当前用户保存的配方列表 */
export async function GET(req: NextRequest) {
  const limitRes = applyRateLimit(req, USER_LIMIT);
  if (limitRes) return limitRes;
  const { user, error: authError } = await requireSupabaseAuth();
  if (authError) return authError;

  try {
    const list = await getUserSavedFormulas(user.id);
    return NextResponse.json(list);
  } catch (e: unknown) {
    const msg = extractError(e);
    console.error("[GET /api/user-formulas]", msg);
    return NextResponse.json({ error: "获取已保存配方失败，请稍后重试" }, { status: 500 });
  }
}

/** POST /api/user-formulas — 保存一个配方（body: SaveFormulaInput） */
export async function POST(req: NextRequest) {
  try {
    const limitRes = applyRateLimit(req, USER_LIMIT);
    if (limitRes) return limitRes;
    const { user, error: authError } = await requireSupabaseAuth();
    if (authError) return authError;

    let body: SaveFormulaInput;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    if (!body?.formula_id || !body?.name || !body?.formula_json) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    try {
      const saved = await addUserSavedFormula(user.id, {
        name: String(body.name).slice(0, 200),
        formula_id: String(body.formula_id),
        formula_json: body.formula_json,
      });
      return NextResponse.json(saved, { status: 201 });
    } catch (e: unknown) {
      const msg = extractError(e);
      if (msg.includes("formula not found")) {
        return NextResponse.json({ error: "配方不存在" }, { status: 400 });
      }
      throw e;
    }
  } catch (e: unknown) {
    const msg = extractError(e);
    console.error("[POST /api/user-formulas]", msg);
    return NextResponse.json({ error: "保存失败，请稍后重试" }, { status: 500 });
  }
}

/** DELETE /api/user-formulas?id=xxx — 删除保存的配方 */
export async function DELETE(req: NextRequest) {
  try {
    const limitRes = applyRateLimit(req, USER_LIMIT);
    if (limitRes) return limitRes;
    const { user, error: authError } = await requireSupabaseAuth();
    if (authError) return authError;

    const idParam = req.nextUrl.searchParams.get("id");
    const id = Number(idParam);
    if (!idParam || !Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    await removeUserSavedFormula(user.id, id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = extractError(e);
    console.error("[DELETE /api/user-formulas]", msg);
    return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 500 });
  }
}

import { safeJson, adminWriteError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { checkSupabaseAdmin } from "@/lib/auth";
import { applyRateLimit, ADMIN_LIMIT } from "@/lib/rate-limit";
import { getFormulas, saveFormula, deleteFormula } from "@/lib/db-formula";
import { validateFormula } from "@/lib/admin-validation";
import type { Formula } from "@/types";

export async function GET(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_GET = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_GET) return limitRes_GET;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;
  return safeJson(() => getFormulas());
}

export async function POST(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_POST = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_POST) return limitRes_POST;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;
  let body: Formula;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const validationError = validateFormula(body, true);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  // 规范化：确保 grams_per_100g 始终从 percentage 派生
  body.components = body.components.map((c: Formula['components'][0]) => ({
    ...c,
    grams_per_100g: c.percentage,
  }));
  try {
    // isNew=true：ID 已存在时 DB 抛 23505 → 409 冲突，绝不静默覆盖
    const saved = await saveFormula(body, true);
    return NextResponse.json(saved, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("已存在")) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    return adminWriteError(e);
  }
}

export async function PUT(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_PUT = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_PUT) return limitRes_PUT;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;
  let body: Formula;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const validationError = validateFormula(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  // 规范化：确保 grams_per_100g 始终从 percentage 派生
  body.components = body.components.map((c: Formula['components'][0]) => ({
    ...c,
    grams_per_100g: c.percentage,
  }));
  try {
    // isNew=false：更新语义（upsert），复用同一个事务 RPC
    const saved = await saveFormula(body, false);
    return NextResponse.json(saved);
  } catch (e: unknown) {
    return adminWriteError(e);
  }
}

export async function DELETE(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_DELETE = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_DELETE) return limitRes_DELETE;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;
  let body: { id?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const id = body?.id;
  if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
  try {
    // 图片可能被其他配方引用；删除记录时保留存储文件。
    await deleteFormula(id);
    return NextResponse.json({ success: true });
  } catch (e) { return adminWriteError(e); }
}

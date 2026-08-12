import { NextRequest, NextResponse } from "next/server";
import { checkSupabaseAdmin } from "@/lib/auth";
import { applyRateLimit, ADMIN_LIMIT } from "@/lib/rate-limit";
import { getGuideCategories, saveGuideCategory, deleteGuideCategory } from "@/lib/db-tds";
import type { GuideCategory } from "@/types";

export async function GET(req: NextRequest) {
  const limitRes = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes) return limitRes;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;
  return NextResponse.json(await getGuideCategories());
}

export async function POST(req: NextRequest) {
  const limitRes = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes) return limitRes;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const cat = body as unknown as GuideCategory;
  if (!cat.id || !cat.name || !cat.nameZh) {
    return NextResponse.json({ error: "缺少必填字段（id/name/nameZh）" }, { status: 400 });
  }
  try {
    const saved = await saveGuideCategory({ ...cat, sortOrder: cat.sortOrder ?? 0 });
    return NextResponse.json(saved, { status: 201 });
  } catch (e) {
    // 内部错误脱敏：真实错误只进服务端日志
    console.error("[POST /api/admin/tds-categories]", e);
    return NextResponse.json({ error: "保存失败，请稍后重试" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const limitRes = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes) return limitRes;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const id = body.id as string;
  if (!id) {
    return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
  }
  try {
    await deleteGuideCategory(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    // 内部错误脱敏：真实错误只进服务端日志
    console.error("[DELETE /api/admin/tds-categories]", e);
    return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 500 });
  }
}
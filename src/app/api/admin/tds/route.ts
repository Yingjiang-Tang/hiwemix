import { NextRequest, NextResponse } from "next/server";
import { checkSupabaseAdmin } from "@/lib/auth";
import { applyRateLimit, ADMIN_LIMIT } from "@/lib/rate-limit";
import { getGuides, saveGuide, deleteGuide } from "@/lib/db-tds";
import type { Guide, DocType } from "@/types";

// 管理端：列出所有文档（含草稿）
export async function GET(req: NextRequest) {
  const limitRes = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes) return limitRes;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;
  return NextResponse.json(await getGuides());
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
  const guide = body as unknown as Guide;
  if (!guide.id || !guide.categoryId || !guide.title || !guide.titleZh) {
    return NextResponse.json({ error: "缺少必填字段（id/categoryId/title/titleZh）" }, { status: 400 });
  }
  try {
    const saved = await saveGuide({ ...guide, sortOrder: guide.sortOrder ?? 0 });
    return NextResponse.json(saved, { status: 201 });
  } catch (e) {
    // 内部错误脱敏：真实错误只进服务端日志
    console.error("[POST /api/admin/tds]", e);
    return NextResponse.json({ error: "保存失败，请稍后重试" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
  const guide = body as unknown as Guide;
  if (!guide.id) {
    return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
  }
  try {
    const saved = await saveGuide(guide);
    return NextResponse.json(saved);
  } catch (e) {
    // 内部错误脱敏：真实错误只进服务端日志
    console.error("[PUT /api/admin/tds]", e);
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
    await deleteGuide(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    // 内部错误脱敏：真实错误只进服务端日志
    console.error("[DELETE /api/admin/tds]", e);
    return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 500 });
  }
}
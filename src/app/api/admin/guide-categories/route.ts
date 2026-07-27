import { NextRequest, NextResponse } from "next/server";
import { checkSupabaseAdmin } from "@/lib/auth";
import { applyRateLimit, ADMIN_LIMIT } from "@/lib/rate-limit";
import { getGuideCategories, saveGuideCategory, deleteGuideCategory } from "@/lib/db-guide";
import type { GuideCategory } from "@/types";

export async function GET(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_GET = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_GET) return limitRes_GET;
  const { error: authError } = await checkSupabaseAdmin();
  if (authError) return authError;
  return NextResponse.json(await getGuideCategories());
}

export async function POST(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_POST = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_POST) return limitRes_POST;
  const { error: authError } = await checkSupabaseAdmin();
  if (authError) return authError;
  const body = (await req.json()) as GuideCategory;
  if (!body.id || !body.name || !body.nameZh) {
    return NextResponse.json({ error: "缺少必填字段（id/name/nameZh）" }, { status: 400 });
  }
  const saved = await saveGuideCategory(body);
  return NextResponse.json(saved, { status: 201 });
}

export async function PUT(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_PUT = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_PUT) return limitRes_PUT;
  const { error: authError } = await checkSupabaseAdmin();
  if (authError) return authError;
  const body = (await req.json()) as GuideCategory;
  if (!body.id) {
    return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
  }
  const saved = await saveGuideCategory(body);
  return NextResponse.json(saved);
}

export async function DELETE(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_DELETE = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_DELETE) return limitRes_DELETE;
  const { error: authError } = await checkSupabaseAdmin();
  if (authError) return authError;
  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
  await deleteGuideCategory(id);
  return NextResponse.json({ success: true });
}

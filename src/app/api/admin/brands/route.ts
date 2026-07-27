import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuth, requireSupabaseAdmin } from "@/lib/auth";
import { applyRateLimit, ADMIN_LIMIT } from "@/lib/rate-limit";
import { getBrands, saveBrand, deleteBrand } from "@/lib/db-formula";
import type { CarMake } from "@/types";

/** 检查管理员权限，不通过则返回 401/403 响应 */
async function checkAdmin() {
  const { user, error } = await requireSupabaseAuth();
  if (error) return { user: null, error };
  const adminErr = requireSupabaseAdmin(user);
  if (adminErr) return { user: null, error: adminErr };
  return { user, error: null };
}

export async function GET(req: NextRequest) {
  const limitRes_GET = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_GET) return limitRes_GET;
  const { error } = await checkAdmin();
  if (error) return error;
  return NextResponse.json(await getBrands());
}

export async function POST(req: NextRequest) {
  const limitRes_POST = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_POST) return limitRes_POST;
  const { error } = await checkAdmin();
  if (error) return error;
  let body: CarMake;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "请求格式错误" }, { status: 400 }); }
  if (!body.id || !body.name || !body.region) {
    return NextResponse.json({ error: "缺少必填字段（id/name/region）" }, { status: 400 });
  }
  const saved = await saveBrand(body);
  return NextResponse.json(saved, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const limitRes_PUT = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_PUT) return limitRes_PUT;
  const { error } = await checkAdmin();
  if (error) return error;
  let body: CarMake;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "请求格式错误" }, { status: 400 }); }
  if (!body.id) {
    return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
  }
  const saved = await saveBrand(body);
  return NextResponse.json(saved);
}

export async function DELETE(req: NextRequest) {
  const limitRes_DELETE = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_DELETE) return limitRes_DELETE;
  const { error } = await checkAdmin();
  if (error) return error;
  let body: { id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "请求格式错误" }, { status: 400 }); }
  const { id } = body;
  if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
  await deleteBrand(id);
  return NextResponse.json({ success: true });
}

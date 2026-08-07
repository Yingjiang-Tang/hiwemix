import { NextRequest, NextResponse } from "next/server";
import { checkSupabaseAdmin } from "@/lib/auth";
import { applyRateLimit, ADMIN_LIMIT } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { Region } from "@/types";

// GET /api/admin/regions - Get all regions (requires admin)
export async function GET(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_GET = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_GET) return limitRes_GET;
  const { error: authError } = await checkSupabaseAdmin();
  if (authError) return authError;

  const { data, error } = await getSupabaseAdmin()
    .from("regions")
    .select("code")
    .order("code", { ascending: true });

  if (error) {
    console.error("DB error in GET /api/admin/regions:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }

  const regions: Region[] = (data ?? []).map((r) => ({ code: r.code }));
  return NextResponse.json(regions);
}

// POST /api/admin/regions - Create new region (requires admin)
export async function POST(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_POST = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_POST) return limitRes_POST;
  const { error: authError } = await checkSupabaseAdmin();
  if (authError) return authError;

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  if (!body.code || !body.code.trim()) {
    return NextResponse.json({ error: "缺少产地代码" }, { status: 400 });
  }

  const code = body.code.trim().toUpperCase();
  if (code.length > 10) {
    return NextResponse.json({ error: "产地代码不能超过 10 个字符" }, { status: 400 });
  }

  // Check if region already exists
  const { data: existing } = await getSupabaseAdmin()
    .from("regions")
    .select("code")
    .eq("code", code)
    .single();

  if (existing) {
    return NextResponse.json({ error: "产地代码已存在" }, { status: 400 });
  }

  // Insert new region
  const { data, error } = await getSupabaseAdmin()
    .from("regions")
    .insert({ code })
    .select("code")
    .single();

  if (error) {
    console.error("DB error in POST /api/admin/regions:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }

  const region: Region = { code: data.code };
  return NextResponse.json(region, { status: 201 });
}

// DELETE /api/admin/regions - Delete region (requires admin)
export async function DELETE(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_DELETE = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_DELETE) return limitRes_DELETE;
  const { error: authError } = await checkSupabaseAdmin();
  if (authError) return authError;

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  if (!body.code) {
    return NextResponse.json({ error: "缺少产地代码" }, { status: 400 });
  }

  const code = body.code;

  // Check if any brands are using this region
  const { data: brandsWithRegion, error: checkError } = await getSupabaseAdmin()
    .from("brands")
    .select("id")
    .eq("region", code)
    .limit(1);

  if (checkError) {
    console.error("DB error in DELETE /api/admin/regions (check):", checkError);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }

  if (brandsWithRegion && brandsWithRegion.length > 0) {
    return NextResponse.json(
      { error: "该产地下还有关联的品牌，无法删除" },
      { status: 400 }
    );
  }

  // Delete region
  const { error } = await getSupabaseAdmin()
    .from("regions")
    .delete()
    .eq("code", code);

  if (error) {
    console.error("DB error in DELETE /api/admin/regions:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

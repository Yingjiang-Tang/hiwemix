import { NextRequest, NextResponse } from "next/server";
import { checkSupabaseAdmin } from "@/lib/auth";
import { applyRateLimit, ADMIN_LIMIT } from "@/lib/rate-limit";
import { getToners, saveToner, deleteToner } from "@/lib/db-toner";
import type { Toner } from "@/types";

/** 从任意错误中提取可读消息（兼容 Supabase PostgrestError 对象） */
function extractError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

export async function GET(req: NextRequest) {
  const limitRes = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes) return limitRes;
  const { error: authError } = await checkSupabaseAdmin();
  if (authError) return authError;
  return NextResponse.json(await getToners());
}

export async function POST(req: NextRequest) {
  try {
    const limitRes = applyRateLimit(req, ADMIN_LIMIT);
    if (limitRes) return limitRes;
    const { error: authError } = await checkSupabaseAdmin();
    if (authError) return authError;

    let body: Toner;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    if (!body.code || !body.tradeName || !body.nameZh || !body.category) {
      return NextResponse.json({ error: "缺少必填字段（code/tradeName/nameZh/category）" }, { status: 400 });
    }

    const saved = await saveToner(body);
    return NextResponse.json(saved, { status: 201 });
  } catch (e: unknown) {
    const msg = extractError(e);
    console.error("[POST /api/admin/toners]", msg);
    // 内部错误脱敏：真实错误只进服务端日志
    return NextResponse.json({ error: "保存失败，请稍后重试" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const limitRes = applyRateLimit(req, ADMIN_LIMIT);
    if (limitRes) return limitRes;
    const { error: authError } = await checkSupabaseAdmin();
    if (authError) return authError;

    let body: Toner;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    if (!body.code) {
      return NextResponse.json({ error: "缺少 code" }, { status: 400 });
    }

    const saved = await saveToner(body);
    return NextResponse.json(saved);
  } catch (e: unknown) {
    const msg = extractError(e);
    console.error("[PUT /api/admin/toners]", msg);
    // 内部错误脱敏：真实错误只进服务端日志
    return NextResponse.json({ error: "保存失败，请稍后重试" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const limitRes = applyRateLimit(req, ADMIN_LIMIT);
    if (limitRes) return limitRes;
    const { error: authError } = await checkSupabaseAdmin();
    if (authError) return authError;

    let body: { code?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    const { code } = body;
    if (!code) return NextResponse.json({ error: "缺少 code" }, { status: 400 });

    await deleteToner(code);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = extractError(e);
    console.error("[DELETE /api/admin/toners]", msg);
    // 内部错误脱敏：真实错误只进服务端日志
    return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 500 });
  }
}

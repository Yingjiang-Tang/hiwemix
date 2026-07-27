import { NextRequest, NextResponse } from "next/server";
import { checkSupabaseAdmin } from "@/lib/auth";
import { applyRateLimit, ADMIN_LIMIT } from "@/lib/rate-limit";
import { getFormulas, saveFormula, deleteFormula } from "@/lib/db-formula";
import type { Formula } from "@/types";

function validateFormula(body: Formula): string | null {
  if (body.paint_system === "2K" && body.formula_type !== "Single Stage") {
    return "2K 体系只能使用 Single Stage";
  }
  if (body.paint_system === "1K" && !["Two Stages", "Three Stages"].includes(body.formula_type)) {
    return "1K 体系只能选择 Two Stages 或 Three Stages";
  }
  if (body.formula_type !== "Three Stages") {
    const hasGroup = body.components.some((c) => c.component_group != null);
    if (hasGroup) return "非 Three Stages 配方不能设置 component_group";
  }
  if (body.formula_type === "Three Stages") {
    const missing = body.components.filter((c) => c.component_group == null).map(c => c.toner_code || "(空)");
    if (missing.length > 0) return `Three Stages 配方的每个色母都必须选择分组（缺失分组：${missing.join(", ")}）`;
    const pearlComps = body.components.filter(c => c.component_group === "Pearl Paint");
    const groundComps = body.components.filter(c => c.component_group === "Ground Paint");
    const pearlSum = pearlComps.reduce((sum, c) => sum + c.percentage, 0);
    const groundSum = groundComps.reduce((sum, c) => sum + c.percentage, 0);
    if (pearlComps.length > 0 && Math.abs(pearlSum - 100) > 1) {
      return `Pearl Paint 组分百分比总和为 ${pearlSum.toFixed(1)}%，应接近 100%`;
    }
    if (groundComps.length > 0 && Math.abs(groundSum - 100) > 1) {
      return `Ground Paint 组分百分比总和为 ${groundSum.toFixed(1)}%，应接近 100%`;
    }
  } else {
    const totalPct = body.components.reduce((sum, c) => sum + c.percentage, 0);
    if (body.components.length > 0 && Math.abs(totalPct - 100) > 1) {
      return `色母百分比总和为 ${totalPct.toFixed(1)}%，应接近 100%`;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_GET = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_GET) return limitRes_GET;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;
  return NextResponse.json(await getFormulas());
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
  if (!body.id || !body.color_id) {
    return NextResponse.json({ error: "缺少必填字段（id/color_id）" }, { status: 400 });
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
  const saved = await saveFormula(body);
  return NextResponse.json(saved, { status: 201 });
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
  if (!body.id) {
    return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
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
  const saved = await saveFormula(body);
  return NextResponse.json(saved);
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
  const { id } = body;
  if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
  await deleteFormula(id);
  return NextResponse.json({ success: true });
}

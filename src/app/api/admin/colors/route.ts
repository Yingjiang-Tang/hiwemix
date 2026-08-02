import { NextRequest, NextResponse } from "next/server";
import { checkSupabaseAdmin } from "@/lib/auth";
import { applyRateLimit, ADMIN_LIMIT } from "@/lib/rate-limit";
import { getColors, saveColor, deleteColor, saveColorYears } from "@/lib/db-formula";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { Color, YearEntry } from "@/types";

export async function GET(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_GET = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_GET) return limitRes_GET;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;
  return NextResponse.json(await getColors());
}

export async function POST(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_POST = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_POST) return limitRes_POST;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "请求格式错误" }, { status: 400 }); }
  const { variantIds, years, ...rest } = body;
  const color = rest as unknown as Omit<Color, "variants">;
  if (!color.id || !color.make_id || !color.color_code) {
    return NextResponse.json({ error: "缺少必填字段（id/make_id/color_code）" }, { status: 400 });
  }
  try {
    const saved = await saveColor(color, (variantIds as string[]) ?? [], true);

    // 保存年份
    if (years && Array.isArray(years)) {
      await saveColorYears(color.id, years as YearEntry[]);
    }

    return NextResponse.json(saved, { status: 201 });
  } catch (e) {
    const detail = (e as { code?: string; message?: string; details?: string })?.details
                || (e as { code?: string; message?: string; details?: string })?.message
                || (e instanceof Error ? e.message : "")
                || (typeof e === "object" ? JSON.stringify(e) : String(e));
    return NextResponse.json({ error: "保存失败: " + detail }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_PUT = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_PUT) return limitRes_PUT;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "请求格式错误" }, { status: 400 }); }
  const { variantIds, years, ...rest } = body;
  const color = rest as unknown as Omit<Color, "variants">;
  if (!color.id) {
    return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
  }
  try {
    const saved = await saveColor(color, (variantIds as string[]) ?? []);

    // 保存年份
    if (years && Array.isArray(years)) {
      await saveColorYears(color.id, years as YearEntry[]);
    }

    return NextResponse.json(saved);
  } catch (e) {
    const detail = (e as { code?: string; message?: string; details?: string })?.details
                || (e as { code?: string; message?: string; details?: string })?.message
                || (e instanceof Error ? e.message : "")
                || (typeof e === "object" ? JSON.stringify(e) : String(e));
    return NextResponse.json({ error: "保存失败: " + detail }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // 管理后台限流：每分钟 60 次
  const limitRes_DELETE = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes_DELETE) return limitRes_DELETE;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;
  let body: { id?: string; force?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "请求格式错误" }, { status: 400 }); }
  const { id, force } = body;
  if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });

  // 删除颜色会通过 ON DELETE CASCADE 级联删除其下所有配方和色母组件。
  // 删除前先查配方清单，返回给前端弹窗提醒（见 ColorsPanel handleDelete）。
  const { data: formulaRows, error: countErr } = await getSupabaseAdmin()
    .from("formulas")
    .select("id, version, updated_at")
    .eq("color_id", id);
  if (countErr) return NextResponse.json({ error: "查询配方失败: " + countErr.message }, { status: 500 });

  const formulas = (formulaRows ?? []).map((r) => ({
    id: String(r.id),
    version: String(r.version ?? ""),
    updated_at: String(r.updated_at ?? ""),
  }));

  // 前端已确认（带 force=true）才真正删除；否则返回 409 Conflict 供弹窗展示
  if (!force) {
    return NextResponse.json({
      success: false,
      needsConfirm: true,
      formulaCount: formulas.length,
      formulas,
    }, { status: 409 });
  }

  await deleteColor(id);
  return NextResponse.json({ success: true, deletedFormulas: formulas.length });
}

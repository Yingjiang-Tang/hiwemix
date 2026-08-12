import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuth } from "@/lib/auth";

// GET /api/auth/me — 获取当前登录用户
// 使用 Supabase Auth session（非旧版 JWT）
export async function GET(_req: NextRequest) {
  const { user, error } = await requireSupabaseAuth();
  if (error) return error;

  return NextResponse.json({
    authenticated: true,
    user: { id: user.id, email: user.email, role: user.role },
  });
}

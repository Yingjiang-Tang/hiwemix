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

// DELETE /api/auth/me — 登出
export async function DELETE(_req: NextRequest) {
  // 登出由客户端 AuthContext 中 supabase.auth.signOut() 处理
  // 此路由保留兼容旧版调用
  return NextResponse.json({ success: true });
}

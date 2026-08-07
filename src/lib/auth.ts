import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// Supabase Auth 用户信息
export interface SupabaseAuthUser {
  id: string;     // Supabase auth.users 的 UUID
  email: string;
  role: string;   // 从 public.profiles 查询，默认 "user"
}

/**
 * API 路由 / 服务端组件中获取当前登录用户。
 * 调用 supabase.auth.getUser() 验证 session，
 * 再用 service-role key 查询 profiles.role。
 * 未登录返回 null。
 */
export async function getUserFromSupabase(): Promise<SupabaseAuthUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return null;

  const { data: profile, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // 查询失败（网络/RLS 等）抛错而非静默当普通用户，避免把管理员瞬时降级成 user
  if (error) {
    throw new Error("load profile failed: " + error.message);
  }

  return {
    id: user.id,
    email: user.email ?? "",
    role: profile?.role ?? "user",
  };
}

/** 要求 Supabase Auth 认证，否则返回 401 */
export async function requireSupabaseAuth(): Promise<
  { user: SupabaseAuthUser; error: null } | { user: null; error: NextResponse }
> {
  const user = await getUserFromSupabase();
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }
  return { user, error: null };
}

/** 要求管理员权限，否则返回 403（需先通过 requireSupabaseAuth） */
export function requireSupabaseAdmin(user: SupabaseAuthUser): NextResponse | null {
  if (user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

/** 一行检查认证 + 管理员权限，用于 admin API 路由 */
export async function checkSupabaseAdmin(): Promise<
  { user: SupabaseAuthUser; error: null } | { user: null; error: NextResponse }
> {
  let user: SupabaseAuthUser | null;
  try {
    const authRes = await requireSupabaseAuth();
    if (authRes.error) return { user: null, error: authRes.error };
    user = authRes.user;
  } catch (e) {
    // profile 查询失败（网络/瞬时）不可降级为普通用户：返回结构化 500，管理端可重试
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[checkSupabaseAdmin] load profile failed:", msg);
    return { user: null, error: NextResponse.json({ error: "服务器内部错误" }, { status: 500 }) };
  }
  const adminErr = requireSupabaseAdmin(user);
  if (adminErr) return { user: null, error: adminErr };
  return { user, error: null };
}

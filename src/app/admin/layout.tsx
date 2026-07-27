import { redirect } from "next/navigation";
import { getUserFromSupabase } from "@/lib/auth";

// 服务端权限校验（纵深防御）：即使 middleware 被绕过，layout 层仍会拦截
// 使用 Supabase Auth + profiles.role === "admin" 校验（替代旧的 JWT 方案）
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserFromSupabase();

  if (!user) {
    // 未登录 → 跳登录
    redirect("/login");
  }
  if (user.role !== "admin") {
    // 已登录但不是管理员 → 跳首页
    redirect("/");
  }

  return <>{children}</>;
}

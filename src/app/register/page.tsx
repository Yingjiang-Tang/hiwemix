import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { createClient } from "@/lib/supabase/server";

// 注册页：套用 shadcn login-04 双栏模板外壳（与登录页一致）
export default async function RegisterPage() {
  // 已登录用户访问注册页 → 跳首页，避免重复注册 / 覆盖当前 session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <AuthPageLayout>
      <RegisterForm />
    </AuthPageLayout>
  );
}

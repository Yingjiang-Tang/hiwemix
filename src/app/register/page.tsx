import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { createClient } from "@/lib/supabase/server";
import { getSafeAuthNext } from "@/lib/auth-redirect";

// 注册页：套用 shadcn login-04 双栏模板外壳（与登录页一致）
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  // 已登录用户直接回原目标，避免重复注册 / 覆盖当前 session。
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(getSafeAuthNext(params.next));

  return (
    <AuthPageLayout>
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </AuthPageLayout>
  );
}

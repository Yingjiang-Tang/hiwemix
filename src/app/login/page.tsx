import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { createClient } from "@/lib/supabase/server";
import { getSafeAuthNext } from "@/lib/auth-redirect";

// 外层 page：已登录重定向 + Suspense 包裹（LoginForm 用 useSearchParams 需边界）
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  // 已登录用户直接回原目标，避免覆盖当前 session / 重复登录。
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(getSafeAuthNext(params.next));

  return (
    <Suspense fallback={null}>
      <AuthPageLayout>
        <LoginForm />
      </AuthPageLayout>
    </Suspense>
  );
}

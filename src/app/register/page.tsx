"use client";

import { RegisterForm } from "@/components/auth/register-form";
import { AuthPageLayout } from "@/components/auth/AuthPageLayout";

// 注册页：套用 shadcn login-04 双栏模板外壳（与登录页一致）
export default function RegisterPage() {
  return (
    <AuthPageLayout>
      <RegisterForm />
    </AuthPageLayout>
  );
}

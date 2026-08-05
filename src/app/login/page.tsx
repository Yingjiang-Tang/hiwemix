"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthPageLayout } from "@/components/auth/AuthPageLayout";

// 外层 page：只负责 Suspense 包裹，保证 prerender 正常
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageLayout>
        <LoginForm />
      </AuthPageLayout>
    </Suspense>
  );
}

"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { X } from "lucide-react";

// 首页的 Auth 消息处理：
// 1. ?verified=1 —— 邮箱确认成功（来自 /auth/callback），显示成功提示条，可关闭 + ~6s 自动消失
// 2. ?error=... —— Supabase 邮件链接出错（过期/无效）会落到 Site URL 根（首页）带 ?error=...，
//    首页本身不展示错误，这里客户端跳转到登录页展示错误信息（登录页有"忘记密码"入口可重新申请）
// useSearchParams 必须在 Suspense boundary 内，避免构建报 Missing Suspense boundary。
function Notice() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const verified = searchParams.get("verified") === "1";
  const error = searchParams.get("error");

  // 链接出错 → 跳登录页展示错误。
  // 只透传一个标识符，不透传 Supabase 原始 error/error_description（防信息泄露——AUTH-3），
  // 由登录页把标识符映射到本地化文案。
  useEffect(() => {
    if (!error) return;
    router.replace("/login?error=link_invalid");
  }, [error, router]);

  // 成功提示 ~6s 自动消失
  useEffect(() => {
    if (!verified) return;
    const timer = setTimeout(() => setDismissed(true), 6000);
    return () => clearTimeout(timer);
  }, [verified]);

  if (error) return null; // 正在跳转，不渲染内容
  if (!verified || dismissed) return null;

  return (
    <div
      role="status"
      className="mx-auto mb-4 flex max-w-2xl items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-2xs text-primary"
    >
      <span>Email confirmed. You&apos;re now signed in.</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 opacity-70 hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export default function VerifiedBanner() {
  return (
    <Suspense fallback={null}>
      <Notice />
    </Suspense>
  );
}

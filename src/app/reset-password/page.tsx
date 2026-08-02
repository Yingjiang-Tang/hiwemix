"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import TwoPanelLayout from "@/components/auth/TwoPanelLayout";
import { createClient } from "@/lib/supabase/client";
import { getEmailRedirectTo } from "@/lib/auth-redirect";
import Link from "next/link";

type Step = "email" | "check-email" | "new-password";

const COOLDOWN_KEY = "reset_cooldown_at";
const COOLDOWN_SECONDS = 60;

export default function ResetPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // 重发冷却持久化到 localStorage：刷新页面后仍生效，避免绕过 60s 冷却（AUTH-10）
  const [cooldown, setCooldown] = useState(() => {
    if (typeof window === "undefined") return 0;
    const at = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
    if (!at) return 0;
    return Math.max(0, Math.ceil((at - Date.now()) / 1000));
  });

  // 只有从重置邮件回调（?from=email，recovery 流程）才进入「设新密码」步骤。
  // 已登录用户直接访问本页不应进入第3步，否则会误改当前登录账号的密码（AUTH-2）。
  useEffect(() => {
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);
    const fromEmail = params.get("from") === "email";

    if (fromEmail) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setEmail(session.user.email ?? "");
          setStep("new-password");
        }
      });
    }

    // PKCE 回调在服务端已建立 recovery session；若在本页打开期间才建立会话，
    // 仅对 PASSWORD_RECOVERY 事件进入第3步——普通登录 session 不进入。
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        setEmail(session.user.email ?? "");
        setStep("new-password");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 读取 URL 参数：?from=email（回调成功跳来）/ ?error=expired（链接过期/已用）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "expired") {
      setError("This password reset link has expired or has already been used. Please request a new link below.");
    } else if (params.get("from") === "email") {
      setSuccess("Email verified. Set your new password.");
    }
  }, []);

  // 重发倒计时（每秒递减，归零后清理 localStorage）
  useEffect(() => {
    if (cooldown <= 0) {
      localStorage.removeItem(COOLDOWN_KEY);
      return;
    }
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function startCooldown(seconds: number) {
    setCooldown(seconds);
    localStorage.setItem(COOLDOWN_KEY, String(Date.now() + seconds * 1000));
  }

  // Step 1: 发送重置邮件
  async function handleSendResetEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getEmailRedirectTo("/reset-password"),
      });
      if (resetError) {
        // 不向用户透传 Supabase 原始错误（防信息泄露/枚举）；统一中性提示（AUTH-3/AUTH-4）
        console.error("[reset-password] resetPasswordForEmail failed:", resetError.message);
        setError("Failed to send reset email. Please try again later.");
        setLoading(false);
        return;
      }
      setStep("check-email");
      startCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      console.error("[reset-password] resetPasswordForEmail threw:", err);
      setError("Failed to send reset email. Please try again later.");
    }
    setLoading(false);
  }

  // 重发重置邮件
  async function handleResend() {
    if (cooldown > 0) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getEmailRedirectTo("/reset-password"),
      });
      if (resetError) {
        console.error("[reset-password] resend failed:", resetError.message);
        setError("Failed to send reset email. Please try again later.");
      } else {
        startCooldown(COOLDOWN_SECONDS);
      }
    } catch (err) {
      console.error("[reset-password] resend threw:", err);
      setError("Failed to send reset email. Please try again later.");
    }
    setLoading(false);
  }

  // Step 3: 设置新密码
  async function handleSetNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    // 先确认 session 存在（跨标签页认证时 cookie 可能在其他标签页）
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Session expired. Please try resetting your password again.");
      setLoading(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      // 不透传原始错误（AUTH-3），仅服务端日志
      console.error("[reset-password] updateUser failed:", updateError.message);
      setError("Failed to update password. Please try again.");
      setLoading(false);
      return;
    }
    // 密码更新成功，登出并跳转到登录页
    await supabase.auth.signOut();
    router.push("/login?reset=success");
  }

  return (
    <TwoPanelLayout>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex flex-col gap-5 pt-6">
          {/* Step 1: 输入邮箱 */}
          {step === "email" && (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">Reset your password</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter the email associated with your account
                </p>
              </div>
              <form onSubmit={handleSendResetEmail} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-xl text-sm font-medium"
                >
                  {loading ? <Spinner className="size-4" /> : "Send reset link"}
                </Button>
              </form>
            </>
          )}

          {/* Step 2: 检查邮箱 */}
          {step === "check-email" && (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">Check your email</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  If an account exists for{" "}
                  <span className="font-medium text-foreground">{email}</span>, we&apos;ve sent a
                  password reset link.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                <p>Click the link in the email to reset your password.</p>
                <Separator className="my-1" />
                <p>
                  Didn&apos;t receive the email?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || loading}
                    className="font-medium text-primary hover:underline disabled:opacity-50 disabled:hover:no-underline"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError("");
                  }}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  Change email
                </button>
              </div>
            </>
          )}

          {/* Step 3: 设置新密码 */}
          {step === "new-password" && (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">Set new password</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your new password below
                </p>
              </div>
              <form onSubmit={handleSetNewPassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-xl text-sm font-medium"
                >
                  {loading ? <Spinner className="size-4" /> : "Reset password"}
                </Button>
              </form>
            </>
          )}

          {/* 成功提示 */}
          {success && (
            <div
              role="status"
              className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-2xs text-primary"
            >
              {success}
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-2xs text-destructive"
            >
              {error}
            </div>
          )}

          {/* 底部链接 */}
          {step === "email" && (
            <p className="text-center text-xs text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </TwoPanelLayout>
  );
}

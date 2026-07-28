"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import TwoPanelLayout from "@/components/auth/TwoPanelLayout";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Step = "email" | "check-email" | "new-password";

const RESET_KEY = "reset_pending";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // 监听 session 变化：用户点击邮件链接后会话建立，自动弹出设置密码
  useEffect(() => {
    const pending = localStorage.getItem(RESET_KEY);
    const supabase = createClient();
    // 先检查当前是否已有 session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && pending) {
        setEmail(user.email ?? "");
        setStep("new-password");
      }
    });
    // 实时监听 session 变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user && localStorage.getItem(RESET_KEY)) {
        setEmail(session.user.email ?? "");
        setStep("new-password");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 页面可见性检测 + 轮询（处理跨标签页认证）
  useEffect(() => {
    function checkSession() {
      if (step !== "check-email") return;
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && localStorage.getItem(RESET_KEY)) {
          setEmail(session.user.email ?? "");
          setStep("new-password");
        }
      });
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkSession();
    });
    const interval = setInterval(checkSession, 2000);
    return () => {
      document.removeEventListener("visibilitychange", () => {});
      clearInterval(interval);
    };
  }, [step]);

  // 重发倒计时
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function getErrorMessage(err: unknown, fallback: string): string {
    if (!err) return fallback;
    if (err instanceof Error) return err.message || fallback;
    if (typeof err === "string") {
      if (!err || err === "{}") return fallback;
      return err;
    }
    if (typeof err === "object" && err !== null) {
      const obj = err as Record<string, unknown>;
      if (typeof obj.message === "string" && obj.message && obj.message !== "{}") return obj.message;
      if (typeof obj.error_description === "string") return obj.error_description;
    }
    return fallback;
  }

  // Step 1: 发送重置邮件
  async function handleSendResetEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    localStorage.setItem(RESET_KEY, email.trim());
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (resetError) {
        localStorage.removeItem(RESET_KEY);
        setError(getErrorMessage(resetError, "Failed to send reset email"));
        setLoading(false);
        return;
      }
      setStep("check-email");
      setCooldown(60);
    } catch (err) {
      localStorage.removeItem(RESET_KEY);
      setError(getErrorMessage(err, "Failed to send reset email"));
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
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (resetError) {
        setError(getErrorMessage(resetError, "Failed to send reset email"));
      } else {
        setCooldown(60);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to send reset email"));
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
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    // 密码更新成功，登出并跳转到登录页
    localStorage.removeItem(RESET_KEY);
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
                  {loading ? "Sending..." : "Send reset link"}
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
                  We sent a password reset link to{" "}
                  <span className="font-medium text-foreground">{email}</span>
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
                    localStorage.removeItem(RESET_KEY);
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
                  {loading ? "Updating..." : "Reset password"}
                </Button>
              </form>
            </>
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

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

type Step = "email" | "check-email" | "password";

const REGISTER_KEY = "register_pending";

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(() => {
    // 如果从 Magic Link 回调刚回来且有待注册标记，直接显示密码框
    if (typeof window !== "undefined" && localStorage.getItem(REGISTER_KEY)) {
      return "password";
    }
    return "email";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // 监听 session 变化：用户在其他标签页点击 Magic Link 后，本页自动检测到并弹出密码框
  useEffect(() => {
    const supabase = createClient();
    // 先检查当前是否已有 session（从回调页面跳回来的情况）
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && localStorage.getItem(REGISTER_KEY)) {
        setEmail(user.email ?? "");
        setStep("password");
      }
    });
    // 再注册实时监听：用户在邮箱点了链接后，session 会建立
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user && localStorage.getItem(REGISTER_KEY)) {
        setEmail(session.user.email ?? "");
        setStep("password");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 当用户从邮箱切回本页面时，主动检查 session（处理跨标签页认证）
  useEffect(() => {
    function checkSession() {
      if (step !== "check-email") return;
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && localStorage.getItem(REGISTER_KEY)) {
          setEmail(session.user.email ?? "");
          setStep("password");
        }
      });
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkSession();
    });
    // 轮询检查 session（每 2 秒，处理跨标签页认证）
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

  // 提取错误信息（Supabase 错误对象可能没有 message 属性）
  function getErrorMessage(err: unknown, fallback: string): string {
    if (!err) return fallback;
    if (err instanceof Error) return err.message || fallback;
    if (typeof err === "string") {
      // Supabase 有时返回 message 为字符串 "{}"（服务端内部错误）
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

  // Step 1: 发送 Magic Link
  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    localStorage.setItem(REGISTER_KEY, email.trim());
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/register")}`,
        },
      });
      if (otpError) {
        localStorage.removeItem(REGISTER_KEY);
        setError(getErrorMessage(otpError, "Failed to send verification email"));
        setLoading(false);
        return;
      }
      setStep("check-email");
      setCooldown(60);
    } catch (err) {
      localStorage.removeItem(REGISTER_KEY);
      setError(getErrorMessage(err, "Failed to send verification email"));
    }
    setLoading(false);
  }

  // 重发 Magic Link
  async function handleResend() {
    if (cooldown > 0) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/register")}`,
        },
      });
      if (otpError) {
        setError(getErrorMessage(otpError, "Failed to send verification email"));
      } else {
        setCooldown(60);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to send verification email"));
    }
    setLoading(false);
  }

  // Step 3: 设置密码
  async function handleSetPassword(e: React.FormEvent) {
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
    localStorage.removeItem(REGISTER_KEY);
    router.push("/");
  }

  return (
    <TwoPanelLayout>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex flex-col gap-5 pt-6">
          {/* Step 1: 输入邮箱 */}
          {step === "email" && (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">Create your account</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your email to get started
                </p>
              </div>
              <form onSubmit={handleSendMagicLink} className="flex flex-col gap-4">
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
                  {loading ? "Sending..." : "Continue with email"}
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
                  We sent a verification link to{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                <p>Click the link in the email, then come back to this page &mdash; it will automatically continue.</p>
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
                    localStorage.removeItem(REGISTER_KEY);
                  }}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  Change email
                </button>
              </div>
            </>
          )}

          {/* Step 3: 设置密码 */}
          {step === "password" && (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">Set your password</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a password to secure your account
                </p>
              </div>
              <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Password</Label>
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
                  {loading ? "Creating account..." : "Create account"}
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
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </TwoPanelLayout>
  );
}

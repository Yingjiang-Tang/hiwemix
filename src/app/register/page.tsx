"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TwoPanelLayout from "@/components/auth/TwoPanelLayout";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/error-utils";
import { getEmailRedirectTo } from "@/lib/auth-redirect";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // 邮箱+密码直接注册：signUp 同时创建用户并发送验证邮件
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password || !confirmPassword) return;
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
    setInfo("");
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: getEmailRedirectTo("/login"),
        },
      });

      if (signUpError) {
        setError(getErrorMessage(signUpError, "Sign up failed"));
        setLoading(false);
        return;
      }

      // signUp 返回 session=null 时，说明 Supabase 开启了邮箱确认，需要用户点邮件链接
      if (!data.session) {
        setInfo(
          "Account created. Please check your email to confirm your account, then sign in."
        );
        setLoading(false);
        return;
      }

      // Supabase 关闭了邮箱确认（或已在 SSR 端自动登录），直接跳转首页
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Sign up failed"));
      setLoading(false);
    }
  }

  return (
    <TwoPanelLayout>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex flex-col gap-5 pt-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">Create your account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your email and password to get started
            </p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
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

          {/* 信息提示（如需邮箱确认） */}
          {info && (
            <div
              role="status"
              className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-2xs text-primary"
            >
              {info}
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

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </TwoPanelLayout>
  );
}
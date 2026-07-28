"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import TwoPanelLayout from "@/components/auth/TwoPanelLayout";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/error-utils";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 显示密码重置成功的消息
  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      setSuccess("Password updated. Please sign in with your new password.");
    }
  }, [searchParams]);


  // 邮箱+密码登录
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (loginError) {
        const msg = getErrorMessage(loginError, "Login failed");
        if (msg.toLowerCase().includes("credentials")) {
          setError("Invalid email or password. If you signed up with Google, use the Google button below.");
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }
      // 登录成功，跳转首页
      router.push("/");
    } catch (err) {
      setError(getErrorMessage(err, "Login failed"));
      setLoading(false);
    }
  }

  // Google OAuth 登录
  async function handleGoogleLogin() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthError) {
        setError(getErrorMessage(oauthError, "Google sign-in failed"));
        setLoading(false);
      }
    } catch {
      setError("Google sign-in is temporarily unavailable");
      setLoading(false);
    }
  }

  return (
    <TwoPanelLayout>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex flex-col gap-5 pt-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to access the formula search and admin management dashboard.
            </p>
          </div>

          {/* 邮箱+密码登录表单 */}
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/reset-password"
                  className="text-2xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl text-sm font-medium"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* 分隔线 */}
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          {/* Google 登录按钮 */}
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="h-11 w-full rounded-xl text-sm font-medium text-foreground transition-all hover:scale-[1.01] hover:bg-muted/50"
          >
            <svg className="mr-2 size-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {loading ? "Redirecting..." : "Continue with Google"}
          </Button>

          {/* 成功提示 */}
          {success && (
            <div
              role="alert"
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

          {/* 注册链接 */}
          <p className="text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </TwoPanelLayout>
  );
}

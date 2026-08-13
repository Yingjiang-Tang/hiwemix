"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { AuthCard } from "@/components/auth/AuthCard";
import { useLang } from "@/components/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/error-utils";
import Link from "next/link";

// shadcn login-04 双栏登录表单：左表单 + 右图片，保留项目原有 Supabase 认证逻辑与 i18n 文案
export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 显示密码重置成功 / 邮箱确认成功 / 回调错误的消息
  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      setSuccess(t.loginResetSuccess);
    }
    const errParam = searchParams.get("error");
    if (errParam) {
      // 只接受白名单标识符，映射到本地化文案；绝不透传上游原始错误字符串（防信息泄露——AUTH-3）
      setError(errParam === "link_invalid" ? t.loginErrorLink : t.loginErrorFailed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // OAuth 跳转后若用户点浏览器「返回」，bfcache 恢复页面时重置 loading，避免按钮卡死（AUTH-9）
  useEffect(() => {
    function onPageshow(e: PageTransitionEvent) {
      if (e.persisted) {
        setLoading(false);
        setGoogleLoading(false);
        setFacebookLoading(false);
      }
    }
    window.addEventListener("pageshow", onPageshow);
    return () => window.removeEventListener("pageshow", onPageshow);
  }, []);

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
        const msg = getErrorMessage(loginError, t.loginErrorFailed);
        if (msg.toLowerCase().includes("credentials")) {
          setError(t.loginErrorInvalid);
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }
      // 登录成功：回到登录前想访问的页面（next 参数，同源校验防开放重定向），否则去首页
      const next = searchParams.get("next");
      let safeNext = "/";
      if (next) {
        try {
          // 用 URL 解析校验同源：拒绝 //evil.com、/\evil.com、编码反斜杠等所有变体（对齐 auth/callback 的 AUTH-5）
          const u = new URL(next, window.location.origin);
          if (u.origin === window.location.origin) safeNext = next;
        } catch {
          // 非法 URL → 回首页
        }
      }
      router.push(safeNext);
    } catch (err) {
      setError(getErrorMessage(err, t.loginErrorFailed));
      setLoading(false);
    }
  }

  // Google OAuth 登录
  async function handleGoogleLogin() {
    setGoogleLoading(true);
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
        setError(getErrorMessage(oauthError, t.oauthGoogleFailed));
        setGoogleLoading(false);
      }
    } catch {
      setError(t.oauthUnavailable);
      setGoogleLoading(false);
    }
  }

  // Facebook OAuth 登录
  async function handleFacebookLogin() {
    setFacebookLoading(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthError) {
        setError(getErrorMessage(oauthError, t.oauthFacebookFailed));
        setFacebookLoading(false);
      }
    } catch {
      setError(t.oauthUnavailable);
      setFacebookLoading(false);
    }
  }

  return (
    <AuthCard {...props}>
      <form className="flex min-h-[700px] flex-col p-6 md:p-8" onSubmit={handleEmailLogin} autoComplete="off">
            <div className="mt-5 flex flex-col gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold text-foreground">{t.loginWelcome}</h1>
                <p className="text-balance text-sm text-muted-foreground">
                  {t.loginSubtitle}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">{t.loginEmail}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t.loginPlaceholderEmail}
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">{t.loginPassword}</Label>
                  <Link
                    href="/reset-password"
                    className="ml-auto text-sm text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                  >
                    {t.forgotPassword}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={t.loginPlaceholderPassword}
                  autoComplete="off"
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
                {loading ? <Spinner className="size-4" /> : t.loginButton}
              </Button>

              {/* 分隔线 */}
              <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                <span className="relative z-10 bg-background px-2 text-muted-foreground">
                  {t.or}
                </span>
              </div>

              {/* 第三方 OAuth 登录按钮 */}
              <div className="grid grid-cols-1 gap-3">
                {/* Google 登录按钮 */}
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || googleLoading}
                  onClick={handleGoogleLogin}
                  className="h-11 w-full rounded-xl text-sm font-medium text-foreground transition-all hover:scale-[1.01] hover:bg-muted/50"
                >
                  {googleLoading ? (
                    <Spinner className="size-4" />
                  ) : (
                    <>
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
                      {t.continueWithGoogle}
                    </>
                  )}
                </Button>

                {/* Facebook 登录按钮 */}
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || facebookLoading}
                  onClick={handleFacebookLogin}
                  className="h-11 w-full rounded-xl text-sm font-medium text-foreground transition-all hover:scale-[1.01] hover:bg-muted/50"
                >
                  {facebookLoading ? (
                    <Spinner className="size-4" />
                  ) : (
                    <>
                      <svg className="mr-2 size-5" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 1C5.925 1 1 5.925 1 12c0 5.49 4.023 10.034 9.281 10.86V15.18H7.484V12h2.797V9.575c0-2.76 1.643-4.282 4.16-4.282 1.205 0 2.465.215 2.465.215v2.71h-1.388c-1.369 0-1.796.85-1.796 1.72V12h3.055l-.488 3.18h-2.567v6.68C19.977 22.034 23 17.49 23 12c0-6.075-4.925-11-11-11z"
                          fill="#0866FF"
                        />
                      </svg>
                      {t.continueWithFacebook}
                    </>
                  )}
                </Button>
              </div>

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

              {/* 注册链接 — mt-auto 推到底部，登录页与注册页卡片等高（min-h-700px） */}
              <div className="mt-auto pt-6 text-center text-sm text-muted-foreground">
                {t.noAccount}{" "}
                <Link
                  href="/register"
                  className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
                >
                  {t.signUp}
                </Link>
              </div>
            </div>
          </form>
    </AuthCard>
  );
}

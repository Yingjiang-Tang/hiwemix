"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { AuthCard } from "@/components/auth/AuthCard";
import { useLang } from "@/components/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage, isAuthRateLimit } from "@/lib/auth-errors";
import { useEmailCooldown } from "@/lib/use-email-cooldown";
import { PasswordInput } from "@/components/auth/password-input";
import { getEmailRedirectTo, getSafeAuthNext } from "@/lib/auth-redirect";
import Link from "next/link";

// shadcn login-04 双栏注册表单：左图右表单，保留项目原有 Supabase 注册逻辑与 i18n 文案
export function RegisterForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeAuthNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState<"email" | "google" | "facebook" | "resend" | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [info, setInfo] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const busy = useRef(false);
  const { cooldown, startCooldown, isCoolingDown } = useEmailCooldown("signup_cooldown_at");
  const loading = pending === "email";
  const googleLoading = pending === "google";
  const facebookLoading = pending === "facebook";
  const blocked = pending !== null;
  const waitingForEmail = Boolean(verificationEmail);

  useEffect(() => {
    function onPageshow(event: PageTransitionEvent) {
      if (event.persisted) { busy.current = false; setPending(null); }
    }
    window.addEventListener("pageshow", onPageshow);
    return () => window.removeEventListener("pageshow", onPageshow);
  }, []);
  function finish() { busy.current = false; setPending(null); }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || waitingForEmail || !email.trim() || !password || !confirmPassword) return;
    if (password.length < 8) { setError({ code: "invalid_password" }); return; }
    if (password.length > 128) { setError({ code: "password_too_long" }); return; }
    if (password !== confirmPassword) { setError({ code: "password_mismatch" }); return; }
    if (isCoolingDown()) { setError({ code: "rate_limit" }); return; }
    busy.current = true;
    setPending("email"); setError(null); setInfo("");
    let navigating = false;
    try {
      const { data, error: signUpError } = await createClient().auth.signUp({
        email: email.trim(), password,
        options: { emailRedirectTo: getEmailRedirectTo(next, { type: "signup" }) },
      });
      if (signUpError) {
        if (isAuthRateLimit(signUpError)) startCooldown();
        setError(signUpError);
        return;
      }
      if (!data.session) {
        setVerificationEmail(email.trim());
        setInfo(t.registerConfirmEmail);
        setPassword(""); setConfirmPassword("");
        startCooldown();
        return;
      }
      navigating = true;
      router.replace(next);
      router.refresh();
    } catch (err) { setError(err); }
    finally { if (!navigating) finish(); }
  }

  async function handleOAuth(provider: "google" | "facebook") {
    if (busy.current || waitingForEmail) return;
    busy.current = true;
    setPending(provider); setError(null); setInfo("");
    let navigating = false;
    try {
      const { data, error: oauthError } = await createClient().auth.signInWithOAuth({
        provider, options: { redirectTo: getEmailRedirectTo(next), skipBrowserRedirect: true },
      });
      if (oauthError) { setError(oauthError); return; }
      if (!data.url) { setError({ code: "oauth_unavailable" }); return; }
      window.location.assign(data.url);
      navigating = true;
    } catch (err) { setError(err); }
    finally { if (!navigating) finish(); }
  }

  async function resendVerification() {
    if (busy.current || isCoolingDown() || !verificationEmail) return;
    busy.current = true;
    setPending("resend"); setError(null);
    try {
      const { error: resendError } = await createClient().auth.resend({
        type: "signup", email: verificationEmail,
        options: { emailRedirectTo: getEmailRedirectTo(next, { type: "signup" }) },
      });
      if (resendError) {
        if (isAuthRateLimit(resendError)) startCooldown();
        setError(resendError);
        return;
      }
      startCooldown(); setInfo(t.authVerificationSent);
    } catch (err) { setError(err); }
    finally { finish(); }
  }

  return (
    <AuthCard className={cn("", className)} {...props}>
      <form className="flex min-h-[700px] flex-col p-6 md:p-8" onSubmit={handleRegister}>
        <div className="mt-5 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold text-foreground">{t.registerTitle}</h1>
            <p className="text-balance text-sm text-muted-foreground">
              {t.registerSubtitle}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">{t.loginEmail}</Label>
            <Input
              id="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              disabled={blocked || waitingForEmail}
              className="max-md:h-11"
              type="email"
              placeholder={t.loginPlaceholderEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">{t.loginPassword}</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              maxLength={128}
              disabled={blocked || waitingForEmail}
              type="password"
              placeholder={t.registerPasswordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">{t.registerConfirmLabel}</Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              maxLength={128}
              disabled={blocked || waitingForEmail}
              type="password"
              placeholder={t.registerConfirmPlaceholder}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={blocked || waitingForEmail || cooldown > 0}
            className="h-11 w-full rounded-xl text-sm font-medium"
          >
            {loading ? <Spinner className="size-4" /> : cooldown > 0 && !waitingForEmail ? t.authResendIn(cooldown) : t.registerButton}
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
              disabled={blocked || waitingForEmail}
              onClick={() => void handleOAuth("google")}
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
              disabled={blocked || waitingForEmail}
              onClick={() => void handleOAuth("facebook")}
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

          {/* 信息提示（如需邮箱确认） */}
          {info && (
            <div
              role="status"
              className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-2xs text-primary"
            >
              {info}
            </div>
          )}

          {waitingForEmail && (
            <div className="grid gap-2 text-center text-sm text-muted-foreground">
              <p className="break-words font-medium text-foreground">{verificationEmail}</p>
              <p>{t.authEmailHint}</p>
              <Button type="button" variant="outline" onClick={() => void resendVerification()} disabled={blocked || cooldown > 0} className="h-11 w-full rounded-xl text-sm font-medium">
                {pending === "resend" ? <Spinner className="size-4" /> : cooldown > 0 ? t.authResendIn(cooldown) : t.authResendVerification}
              </Button>
              <button type="button" disabled={blocked} onClick={() => { setVerificationEmail(""); setInfo(""); setError(null); }} className="font-medium text-primary hover:underline max-md:min-h-11 max-md:min-w-11">{t.authChangeEmail}</button>
            </div>
          )}

          {/* 错误提示 */}
          {Boolean(error) && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-2xs text-destructive"
            >
              {getAuthErrorMessage(error, t, t.registerErrorFailed)}
            </div>
          )}

          {/* 登录链接 — mt-auto 推到底部，与登录页卡片等高（min-h-700px） */}
          <div className="mt-auto pt-6 text-center text-sm text-muted-foreground">
            {t.haveAccount}{" "}
            <Link
              href={{ pathname: "/login", query: { next } }}
              className="font-medium text-primary underline underline-offset-4 hover:opacity-80 max-md:inline-flex max-md:min-h-11 max-md:items-center"
            >
              {t.loginLink}
            </Link>
          </div>
        </div>
      </form>
    </AuthCard>
  );
}

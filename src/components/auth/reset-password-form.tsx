"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/password-input";
import { useLang } from "@/components/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getEmailRedirectTo } from "@/lib/auth-redirect";
import { fetchWithAuthTimeout } from "@/lib/auth-fetch";
import { getAuthErrorMessage, isAuthRateLimit } from "@/lib/auth-errors";
import { useEmailCooldown } from "@/lib/use-email-cooldown";

type Step = "email" | "checking" | "check-email" | "new-password";

export function ResetPasswordForm({ fromEmail, linkExpired }: { fromEmail: boolean; linkExpired: boolean }) {
  const { t } = useLang();
  const [step, setStep] = useState<Step>(fromEmail ? "checking" : "email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(linkExpired ? { code: "otp_expired" } : null);
  const recoveredUserId = useRef<string | null>(null);
  const busy = useRef(false);
  const { cooldown, startCooldown, isCoolingDown } = useEmailCooldown("reset_cooldown_at");

  useEffect(() => {
    const supabase = createClient();
    const controller = new AbortController();
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (recoveredUserId.current && session?.user.id !== recoveredUserId.current) {
        recoveredUserId.current = null;
        setPassword("");
        setConfirmPassword("");
        setStep("email");
        setError({ code: "account_changed" });
      }
    });
    async function verifyRecovery() {
      try {
        const response = await fetchWithAuthTimeout("/auth/recovery", { cache: "no-store", signal: controller.signal });
        const result: { user?: { id: string; email: string }; error?: string } = await response.json();
        if (!active) return;
        if (!response.ok || !result.user) {
          setStep("email");
          setError(result);
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (session?.user.id !== result.user.id) {
          setStep("email");
          setError({ code: "account_changed" });
          return;
        }
        recoveredUserId.current = result.user.id;
        setEmail(result.user.email);
        setStep("new-password");
        setError(null);
      } catch (err) {
        if (active) { setStep("email"); setError(err); }
      }
    }
    if (fromEmail) void verifyRecovery();
    return () => { active = false; controller.abort(); subscription.unsubscribe(); };
  }, [fromEmail]);

  async function sendEmail(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy.current || isCoolingDown() || !email.trim()) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const submittedEmail = email.trim();
      const { error: sendError } = await createClient().auth.resetPasswordForEmail(submittedEmail, {
        redirectTo: getEmailRedirectTo("/reset-password", { type: "recovery" }),
      });
      if (sendError) {
        if (isAuthRateLimit(sendError)) startCooldown();
        setError(isAuthRateLimit(sendError) ? sendError : { code: "reset_send_failed" });
        return;
      }
      setEmail(submittedEmail);
      setStep("check-email");
      startCooldown();
    } catch (err) { setError(err); }
    finally { busy.current = false; setLoading(false); }
  }

  async function setNewPassword(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    if (password.length < 8) { setError({ code: "invalid_password" }); return; }
    if (password.length > 128) { setError({ code: "password_too_long" }); return; }
    if (password !== confirmPassword) { setError({ code: "password_mismatch" }); return; }
    if (!recoveredUserId.current) { setError({ code: "session_expired" }); return; }
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuthTimeout("/auth/recovery", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, userId: recoveredUserId.current }),
      });
      const result: { error?: string; success?: boolean } = await response.json();
      if (!response.ok || !result.success) {
        setError(result);
        if (response.status === 401 || response.status === 409) {
          recoveredUserId.current = null;
          setPassword(""); setConfirmPassword(""); setStep("email");
        }
        return;
      }
      // 整页跳转确保 SDK 内存中的旧会话和路由缓存一起失效。
      window.location.replace("/login?reset=success");
    } catch (err) { setError(err); }
    finally { busy.current = false; setLoading(false); }
  }

  return (
    <AuthCard>
      <div className="flex min-h-[700px] flex-col gap-5 p-6 pt-6 md:p-8">
        {step === "checking" && <p role="status" className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Spinner className="size-4" />{t.authCheckingEmail}</p>}
        {step === "email" && (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">{t.resetTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.resetSubtitle}</p>
            </div>
            <form onSubmit={sendEmail} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">{t.loginEmail}</Label>
                <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder={t.loginPlaceholderEmail} value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} className="max-md:h-11" required autoFocus />
              </div>
              <Button type="submit" disabled={loading || cooldown > 0} className="h-11 w-full rounded-xl text-sm font-medium">
                {loading ? <Spinner className="size-4" /> : cooldown > 0 ? t.authResendIn(cooldown) : t.resetSendButton}
              </Button>
            </form>
          </>
        )}
        {step === "check-email" && (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">{t.resetCheckEmailTitle}</h2>
              <p className="mt-1 break-words text-sm text-muted-foreground">{t.resetSentMessage(email)}</p>
            </div>
            <div className="flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
              <p>{t.resetInstructions}</p>
              <p>{t.authEmailHint}</p>
              <p>{t.authDidntReceive}</p>
              <button type="button" onClick={() => void sendEmail()} disabled={cooldown > 0 || loading} className="font-medium text-primary hover:underline disabled:opacity-50 max-md:min-h-11 max-md:min-w-11">
                {loading ? <Spinner className="size-4" /> : cooldown > 0 ? t.authResendIn(cooldown) : t.resetResendButton}
              </button>
              <button type="button" disabled={loading} onClick={() => { setStep("email"); setError(null); }} className="text-muted-foreground hover:text-foreground hover:underline max-md:min-h-11 max-md:min-w-11">{t.authChangeEmail}</button>
            </div>
          </>
        )}
        {step === "new-password" && (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">{t.resetNewTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.resetNewSubtitle}</p>
              <p className="mt-1 break-words text-sm text-foreground">{email}</p>
            </div>
            <form onSubmit={setNewPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">{t.resetNewPassword}</Label>
                <PasswordInput id="password" name="password" autoComplete="new-password" placeholder={t.registerPasswordPlaceholder} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={128} disabled={loading} required autoFocus />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword">{t.resetConfirmPassword}</Label>
                <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" placeholder={t.registerConfirmPlaceholder} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} maxLength={128} disabled={loading} required />
              </div>
              <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-sm font-medium">{loading ? <Spinner className="size-4" /> : t.resetSubmitButton}</Button>
            </form>
            <p role="status" className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-2xs text-primary">{t.resetVerified}</p>
          </>
        )}
        {Boolean(error) && <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-2xs text-destructive">{getAuthErrorMessage(error, t, step === "new-password" ? t.resetUpdateFailed : t.resetSendFailed)}</div>}
        <p className="mt-auto pt-6 text-center text-xs text-muted-foreground"><Link href="/login" className="font-medium text-primary hover:underline max-md:inline-flex max-md:min-h-11 max-md:items-center">{t.backToLogin}</Link></p>
      </div>
    </AuthCard>
  );
}

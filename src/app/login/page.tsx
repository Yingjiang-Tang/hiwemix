"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLang } from "@/components/LanguageContext";
import { useAuth } from "@/components/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
  import { Loader2, User, Lock, Eye, EyeOff, ArrowLeft, Globe } from "lucide-react";
  
  function WhatsAppIcon({ className }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    );
  }
  
  function FacebookIcon({ className }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    );
  }
  
  function InstagramIcon({ className }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    );
  }

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const router = useRouter();
  const { t } = useLang();
  const { login } = useAuth();

  async function attemptLogin() {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.user) login(data.user);
      router.push("/");
      return true;
    }
    setError(data.error || t.loginErrorFailed);
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError(t.loginErrorEmpty);
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        if (password.length < 8) {
          setError(t.registerErrorPassword);
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError(t.registerErrorMismatch);
          setLoading(false);
          return;
        }
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, confirmPassword }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          await attemptLogin();
        } else {
          setError(data.error || t.registerErrorFailed);
        }
      } else {
        await attemptLogin();
      }
    } catch {
      setError(isRegister ? t.registerErrorFailed : t.loginErrorNetwork);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip lg:flex-row">
      {/* ===== 左侧背景区 (40%) — 珍珠漆图片背景 ===== */}
      <div className="relative hidden w-full flex-col justify-between bg-cover bg-center px-5 py-6 lg:flex lg:w-[40%]"
        style={{ backgroundImage: "url('/car-paint.jpg')" }}
      >
        {/* 半透明遮罩提升文字可读性 */}
        <div className="absolute inset-0 bg-black/20" />

        {/* 主标题 */}
        <div className="relative z-10 text-left">
          <h1 className="text-[70px] font-extrabold uppercase leading-[1.1] tracking-[2px] text-white xl:text-[82px] font-heading">
            Welcome to
          </h1>
          <h1 className="text-[70px] font-extrabold uppercase leading-[1.1] tracking-[2px] text-white xl:text-[82px] font-heading">
            HIWEMIX
          </h1>
        </div>

        {/* 底部社交图标 */}
        <div className="relative z-10 flex items-center gap-1">
          <a
            href="https://www.hiwe.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Website"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:text-white/75"
          >
            <Globe className="size-5" />
          </a>
          <a
            href="https://api.whatsapp.com/send?phone=8615819205996"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:text-white/75"
          >
            <WhatsAppIcon className="size-5" />
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61550592422623"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:text-white/75"
          >
            <FacebookIcon className="size-5" />
          </a>
          <a
            href="https://www.instagram.com/haiwenduan?igsh=eGd2c2Fkbnplazl1"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:text-white/75"
          >
            <InstagramIcon className="size-5" />
          </a>
        </div>
      </div>

      {/* ===== 右侧表单区 (60%) ===== */}
      <div className="relative flex flex-1 items-center justify-center bg-white px-6 py-10 lg:px-5">
        {/* 注册模式返回箭头 */}
        {isRegister && (
          <button
            onClick={() => {
              setIsRegister(false);
              setError("");
              setConfirmPassword("");
            }}
            aria-label={t.backToLogin}
            className="absolute left-3 top-6 inline-flex items-center justify-center text-black transition-colors hover:text-muted-foreground lg:left-9 lg:top-[50px]"
          >
            <ArrowLeft className="size-6 lg:size-7" />
          </button>
        )}

        <div className="w-full max-w-[360px]">
          {/* Logo — 水平居中在表单正上方，向上平移 30px */}
          <div className="mb-2 flex justify-center lg:-mt-[30px]">
            <Image
              src="/hiwe.png"
              alt="HIWE"
              width={1206}
              height={334}
              className="h-10 w-auto object-contain lg:h-14"
            />
          </div>

          {/* 表单卡片 — Dub.co 极简风格 */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} aria-label={isRegister ? t.registerButton : t.loginButton} className="flex flex-col gap-4">
                {/* Username */}
                <div className="flex flex-col gap-1.5">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      autoFocus
                      autoComplete="off"
                      className={cn(
                        "h-10 rounded-xl pl-9",
                        isRegister ? "focus-visible:border-purple-500 focus-visible:ring-purple-500/20" : ""
                      )}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete={isRegister ? "new-password" : "current-password"}
                      className={cn(
                        "h-10 rounded-xl pl-9 pr-9",
                        isRegister ? "focus-visible:border-purple-500 focus-visible:ring-purple-500/20" : ""
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (注册模式) */}
                {isRegister && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/80">Confirm password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                        className="h-10 rounded-xl pl-9 pr-9 focus-visible:border-purple-500 focus-visible:ring-purple-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-muted-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Error 提示 */}
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-2xs text-destructive"
                  >
                    {error}
                  </div>
                )}

                {/* 提交按钮 */}
                <Button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className={cn(
                    "h-10 w-full rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] hover:opacity-90",
                    isRegister
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "bg-primary hover:bg-primary/80"
                  )}
                >
                  {loading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : isRegister ? (
                    t.registerButton
                  ) : (
                    t.loginButton
                  )}
                </Button>

                {/* 模式切换链接 */}
                <p className="text-center text-sm text-muted-foreground">
                  {isRegister ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegister(false);
                        setError("");
                        setConfirmPassword("");
                      }}
                      className={cn(
                        "font-medium transition-colors hover:underline",
                        isRegister ? "text-purple-600 hover:text-purple-700" : "text-primary hover:text-primary/80"
                      )}
                    >
                      {t.registerLoginLink}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegister(true);
                        setError("");
                      }}
                      className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
                    >
                      {t.loginRegisterLink}
                    </button>
                  )}
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

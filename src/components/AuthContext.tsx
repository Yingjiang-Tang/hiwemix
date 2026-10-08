"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { AuthUser, AuthContextValue } from "@/types";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const revision = useRef(0);
  const mounted = useRef(false);
  const profileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyUser = useCallback((authUser: User | null) => {
    const currentRevision = ++revision.current;
    if (profileTimer.current) clearTimeout(profileTimer.current);
    if (!mounted.current) return;
    setLoading(false);
    if (!authUser) { setUser(null); return; }
    setUser((previous) => ({
      id: authUser.id, email: authUser.email ?? "",
      role: previous?.id === authUser.id ? previous.role : "user",
    }));
    // 查询离开认证回调后执行；旧请求不能覆盖退出或切换账号后的新状态。
    profileTimer.current = setTimeout(async () => {
      try {
        const { data: profile, error } = await createClient().from("profiles").select("role").eq("id", authUser.id).single();
        if (!mounted.current || revision.current !== currentRevision || error) return;
        setUser((previous) => previous?.id === authUser.id ? { ...previous, role: profile?.role ?? "user" } : previous);
      } catch { /* 瞬时查询失败保留同一账号的现有角色 */ }
    }, 0);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const supabase = createClient();
    // INITIAL_SESSION 统一处理首屏，避免 getUser 与状态监听重复请求、相互覆盖。
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });
    return () => {
      mounted.current = false;
      revision.current += 1;
      if (profileTimer.current) clearTimeout(profileTimer.current);
      subscription.unsubscribe();
    };
  }, [applyUser]);

  const login = useCallback((newUser: AuthUser) => {
    revision.current += 1;
    setUser(newUser);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    revision.current += 1;
    if (profileTimer.current) clearTimeout(profileTimer.current);
    try { await createClient().auth.signOut({ scope: "local" }); }
    catch { /* 下方仍清理本浏览器的会话 */ }
    finally {
      // 网络故障也能退出本浏览器；其他设备的会话保持正常。
      const prefix = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;
      for (const cookie of document.cookie.split(";")) {
        const name = cookie.trim().split("=")[0];
        if (name === prefix || name.startsWith(`${prefix}.`) || name === `${prefix}-code-verifier`) document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
      }
      setUser(null);
      window.location.replace("/login");
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const currentRevision = ++revision.current;
    try {
      const { data: { user: authUser }, error } = await createClient().auth.getUser();
      if (!mounted.current || revision.current !== currentRevision) return;
      if (error && error.status !== 401 && error.status !== 403) { setLoading(false); return; }
      applyUser(authUser);
    } catch { if (mounted.current) setLoading(false); }
  }, [applyUser]);

  return <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

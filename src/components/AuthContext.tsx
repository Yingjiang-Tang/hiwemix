"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// Supabase Auth 用户信息
interface AuthUser {
  id: string;       // Supabase auth.users 的 UUID
  email: string;
  role: string;     // 从 public.profiles 查询
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 从 profiles 表获取 role
  async function fetchProfile(supabase: ReturnType<typeof createClient>, authUser: User): Promise<AuthUser | null> {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authUser.id)
        .single();

      return {
        id: authUser.id,
        email: authUser.email ?? "",
        role: profile?.role ?? "user",
      };
    } catch {
      // profiles 表可能还不存在（尚未执行 profiles-setup.sql）
      return {
        id: authUser.id,
        email: authUser.email ?? "",
        role: "user",
      };
    }
  }

  // 挂载时获取当前登录用户并监听状态变化
  useEffect(() => {
    const supabase = createClient();

    // 获取当前 session
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        fetchProfile(supabase, authUser).then((u) => {
          if (u) setUser(u);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // 监听 auth 状态变化（登录、登出、token 刷新等）
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const u = await fetchProfile(supabase, session.user);
          if (u) setUser(u);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 手动登录（供现有用户名密码登录流程过渡使用）
  const login = useCallback((newUser: AuthUser) => {
    setUser(newUser);
  }, []);

  // 退出登录
  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/login";
  }, []);

  // 手动刷新用户信息（例如管理员修改 role 后）
  const refreshUser = useCallback(async () => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const u = await fetchProfile(supabase, authUser);
      if (u) setUser(u);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

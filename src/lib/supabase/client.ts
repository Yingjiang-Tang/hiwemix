import { createBrowserClient } from "@supabase/ssr";

// 浏览器端 Supabase 客户端 — 仅用于 "use client" 组件
// 例如 AuthContext、login 页面等需要调用 supabase.auth 的场景
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

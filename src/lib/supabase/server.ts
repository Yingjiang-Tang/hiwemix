import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { fetchWithAuthTimeout } from "@/lib/auth-fetch";
import { isLocalPreviewHost, LOCAL_PREVIEW_HEADER } from "@/lib/local-preview";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function isLocalPreview(): Promise<boolean> {
  if (process.env.NODE_ENV !== "development") return false;
  const requestHeaders = await headers();
  return isLocalPreviewHost(requestHeaders.get("host")) && requestHeaders.get(LOCAL_PREVIEW_HEADER) === "1";
}

// 服务端 Supabase 客户端 — 用于 API Routes / Server Components
// 通过 cookies() 自动读取并刷新 session
export async function createClient() {
  // 仅 proxy 放行的本机只读请求使用服务端数据权限，不生成登录会话。
  if (await isLocalPreview()) return getSupabaseAdmin();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: fetchWithAuthTimeout },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 在 Server Component 中调用 setAll 会抛错（cookies 只读）
            // 这里静默忽略，session 由 Middleware 层写入
          }
        },
      },
    }
  );
}

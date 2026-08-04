// 前后端通用的轻量 cookie 读写工具
// 语言/访问者 ID 这类"服务器也需要知道的小偏好"用 cookie；
// 收藏、搜索历史等纯客户端大数据继续留在 localStorage（不占请求头）。

export const LANG_COOKIE = "site-language";
export const VISITOR_COOKIE = "hiwe_visitor_id";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 年

/** 客户端写 cookie（无 path 限制时默认当前路径，这里显式根路径全站可见） */
export function setClientCookie(name: string, value: string, maxAge = COOKIE_MAX_AGE) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  } catch {
    /* 隐私模式等场景静默降级 */
  }
}

/** 客户端读 cookie */
export function getClientCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const m = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

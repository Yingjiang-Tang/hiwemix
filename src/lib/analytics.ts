// ============================================================
// 前端埋点 SDK — 轻量行为分析
// track() 发送事件到 /api/analytics；服务端负责生成/续期 visitor_id cookie
// 并插入 Supabase。失败静默降级（不影响用户任何操作）。
// ============================================================

export type TrackEventType = "page_view" | "search" | "formula_view" | "color_view";

export interface TrackData {
  make?: string;
  code?: string;
  name?: string;
  year?: string;
  page?: string;
  formula_id?: string;
  variant?: string;
  version?: string;
  [key: string]: string | number | undefined;
}

let lastSentAt = 0;
let sentInWindow = 0;

/**
 * 发送一条事件。
 * 客户端节流：同一窗口(10s)内最多 5 条，防死循环/刷屏。
 */
export async function track(event_type: TrackEventType, event_data: TrackData = {}): Promise<void> {
  const now = Date.now();
  if (now - lastSentAt > 10_000) {
    lastSentAt = now;
    sentInWindow = 0;
  }
  if (sentInWindow >= 5) return;
  sentInWindow += 1;

  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type, event_data }),
      keepalive: true,
    });
  } catch {
    /* 埋点失败不影响用户操作 */
  }
}

/** 页面访问事件（在客户端路由变化/首载时调用一次） */
export function trackPageView(page?: string): void {
  void track("page_view", { page });
}

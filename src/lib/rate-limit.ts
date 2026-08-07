// ============================================================
// 内存限流工具 — 基于 IP 的滑动窗口限流
// 单实例部署适用，生产环境建议换 Redis（如 @upstash/ratelimit）
// ============================================================

import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number; // 窗口重置时间戳 (ms)
}

const hits = new Map<string, RateLimitEntry>();

// 定期清理过期条目（每 60 秒）
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key);
  }
}

/** 从请求中提取客户端 IP */
function getClientIP(req: NextRequest): string {
  // 部署在 Vercel/可信反向代理后：代理会在 X-Forwarded-For 末尾追加真实客户端 IP，
  // 客户端可伪造的值只会出现在前部。因此取最右侧一个，忽略伪造部分，
  // 防止攻击者每请求改头绕过限流。裸 Node 无信任代理时此头不可信，需在边缘层过滤。
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const list = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    const ip = list[list.length - 1];
    if (ip) return ip;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}

export interface RateLimitOptions {
  /** 时间窗口内最大请求数 */
  maxRequests: number;
  /** 时间窗口大小（毫秒） */
  windowMs: number;
  /** 限流标识前缀（用于区分不同端点） */
  prefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/** 检查并记录一次请求 */
export function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): RateLimitResult {
  cleanup();
  const ip = getClientIP(req);
  const key = `${options.prefix ?? "api"}:${ip}`;
  const now = Date.now();

  const entry = hits.get(key);

  // 没有记录或窗口已过期 → 新窗口
  if (!entry || now > entry.resetAt) {
    const resetAt = now + options.windowMs;
    hits.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: options.maxRequests - 1, resetAt };
  }

  // 窗口内请求数已达上限
  if (entry.count >= options.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // 窗口内递增计数
  entry.count++;
  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/** 返回 429 Too Many Requests 响应 */
export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return NextResponse.json(
    { error: "请求过于频繁，请稍后再试" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(retryAfter, 1)),
        "X-RateLimit-Limit": "rate limit exceeded",
      },
    }
  );
}

/** 便捷方法：检查限流，若超限直接返回 429 */
export function applyRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  const result = checkRateLimit(req, options);
  if (!result.allowed) {
    return rateLimitResponse(result.resetAt);
  }
  return null; // 未超限
}

// ============================================================
// 预设限流策略
// ============================================================

/** 登录端点：每分钟 5 次（防暴力破解） */
export const LOGIN_LIMIT: RateLimitOptions = {
  prefix: "login",
  maxRequests: 5,
  windowMs: 60_000,
};

/** 注册端点：每小时 3 次（防滥用注册） */
export const REGISTER_LIMIT: RateLimitOptions = {
  prefix: "register",
  maxRequests: 3,
  windowMs: 3_600_000,
};

/** 管理后台 API：每分钟 60 次 */
export const ADMIN_LIMIT: RateLimitOptions = {
  prefix: "admin",
  maxRequests: 60,
  windowMs: 60_000,
};

/** 公开查询 API：每分钟 120 次 */
export const PUBLIC_LIMIT: RateLimitOptions = {
  prefix: "public",
  maxRequests: 120,
  windowMs: 60_000,
};

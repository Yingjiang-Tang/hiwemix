import { createHmac, timingSafeEqual } from "node:crypto";

// 仅服务端使用：签名证明标记来自邮件验证回调。
export const RECOVERY_COOKIE = "pw_recovery";
export const RECOVERY_MAX_AGE = 15 * 60;

function sign(payload: string): string {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Missing SUPABASE_SECRET_KEY");
  return createHmac("sha256", key).update(`password-recovery:${payload}`).digest("base64url");
}

export function createRecoveryToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: Date.now() + RECOVERY_MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function getRecoveryUserId(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const data: unknown = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data || typeof data !== "object" || !("userId" in data) || !("expiresAt" in data)) return null;
    if (typeof data.userId !== "string" || typeof data.expiresAt !== "number" || data.expiresAt <= Date.now()) return null;
    return data.userId;
  } catch { return null; }
}

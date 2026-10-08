import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createRecoveryToken, getRecoveryUserId, RECOVERY_MAX_AGE } from "@/lib/password-recovery";

beforeEach(() => { vi.stubEnv("SUPABASE_SECRET_KEY", "audit-signing-key"); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

test("恢复标记绑定账号并在有效期后失效", () => {
  vi.useFakeTimers();
  const token = createRecoveryToken("account-a");
  expect(getRecoveryUserId(token)).toBe("account-a");
  vi.advanceTimersByTime(RECOVERY_MAX_AGE * 1000);
  expect(getRecoveryUserId(token)).toBeNull();
});

test("拒绝普通标记和篡改后的账号", () => {
  const token = createRecoveryToken("account-a");
  const [, signature] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ userId: "account-b", expiresAt: Date.now() + 60000 })).toString("base64url");
  expect(getRecoveryUserId(`${forged}.${signature}`)).toBeNull();
  expect(getRecoveryUserId("1")).toBeNull();
});

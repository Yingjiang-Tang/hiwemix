import { expect, test } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const user = { id: "11111111-1111-4111-8111-111111111111", email: "audit@example.invalid", aud: "authenticated", role: "authenticated", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };

test.beforeEach(async ({ page }) => {
  // 浏览器中的 Supabase 请求全部受控，不发送真实邮件、不创建真实账号。
  await page.route(`${supabaseUrl}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/profiles")) await route.fulfill({ json: { role: "user" } });
    else if (path.endsWith("/user")) await route.fulfill({ json: user });
    else await route.fulfill({ json: {} });
  });
  await page.route("**/api/favorites", (route) => route.fulfill({ json: [] }));
});

test("找回密码的首次发送、换邮箱和刷新都遵守冷却", async ({ page }) => {
  let calls = 0;
  let redirect = "";
  await page.route(`${supabaseUrl}/auth/v1/recover**`, async (route) => {
    calls += 1;
    redirect = new URL(route.request().url()).searchParams.get("redirect_to") ?? "";
    await route.fulfill({ json: {} });
  });
  await page.goto("/reset-password");
  await page.locator("#email").fill(user.email);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  expect(new URL(redirect).searchParams.get("type")).toBe("recovery");
  await page.getByRole("button", { name: "Change email", exact: true }).click();
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
  await page.reload();
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
  expect(calls).toBe(1);
});

test("禁用 localStorage 时仍能发送邮件并执行内存冷却", async ({ page }) => {
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"] as const) Storage.prototype[method] = () => { throw new DOMException("Storage disabled", "SecurityError"); };
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/reset-password");
  await page.locator("#email").fill(user.email);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.getByRole("button", { name: "Change email", exact: true }).click();
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
  expect(errors).toEqual([]);
});

test("未验证的恢复 URL 不显示成功信息", async ({ page }) => {
  await page.route("**/auth/recovery", (route) => route.fulfill({ status: 401, json: { error: "session_expired" } }));
  await page.goto("/reset-password?from=email");
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.getByText("Email verified. You can now set your new password.")).not.toBeVisible();
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("expired");
});

async function seedRecoverySession(context: import("@playwright/test").BrowserContext) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: expiresAt, aud: "authenticated", role: "authenticated", email: user.email })}.audit-signature`;
  const session = { access_token: token, refresh_token: "audit-refresh", expires_at: expiresAt, expires_in: 3600, token_type: "bearer", user };
  await context.addCookies([{ name: `sb-${projectRef}-auth-token`, value: `base64-${encode(session)}`, url: "http://localhost:3000" }]);
}

test("改密请求绑定恢复账号，账号变化后返回重新申请步骤", async ({ page, context }) => {
  await seedRecoverySession(context);
  let submitted: unknown;
  await page.route("**/auth/recovery", async (route) => {
    if (route.request().method() === "POST") {
      submitted = route.request().postDataJSON();
      await route.fulfill({ status: 409, json: { error: "account_changed" } });
    } else await route.fulfill({ json: { user: { id: user.id, email: user.email } } });
  });
  await page.goto("/reset-password?from=email");
  await expect(page.getByRole("heading", { name: "Set new password" })).toBeVisible();
  await page.locator("#password").fill("safe-password");
  await page.locator("#confirmPassword").fill("safe-password");
  await page.locator('button[type="submit"]').click();
  await expect(page.locator("#email")).toBeVisible();
  expect(submitted).toEqual({ userId: user.id, password: "safe-password" });
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("account has changed");
});

test("登录请求互斥，未验证邮箱提供重发入口且不泄漏上游错误", async ({ page }) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`${supabaseUrl}/auth/v1/token**`, async (route) => {
    await waiting;
    await route.fulfill({ status: 400, json: { error_code: "email_not_confirmed", msg: "Private upstream detail" } });
  });
  await page.goto("/login");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill("safe-password");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Continue with Facebook" })).toBeDisabled();
  release();
  await expect(page.getByRole("button", { name: "Resend confirmation email" })).toBeVisible();
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("confirm your email");
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).not.toContainText("Private upstream detail");
  await page.getByRole("button", { name: "Resend confirmation email" }).click();
  await expect(page.getByRole("status")).toContainText("new email has been sent");
});

test("注册等待验证时不能重复提交，支持更换邮箱", async ({ page }) => {
  let calls = 0;
  await page.route(`${supabaseUrl}/auth/v1/signup**`, async (route) => { calls += 1; await route.fulfill({ json: user }); });
  await page.goto("/register?next=%2Ffavorites");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill("safe-password");
  await page.locator("#confirmPassword").fill("safe-password");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("button", { name: "Change email", exact: true })).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
  await page.getByRole("button", { name: "Change email", exact: true }).click();
  await expect(page.locator("#email")).toBeEnabled();
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
  expect(calls).toBe(1);
});

test("OAuth 保留原目标，登录注册切换也保留目标", async ({ page }) => {
  let redirect = "";
  await page.route(`${supabaseUrl}/auth/v1/authorize**`, async (route) => {
    redirect = new URL(route.request().url()).searchParams.get("redirect_to") ?? "";
    await route.fulfill({ contentType: "text/html", body: "Mock authorization" });
  });
  await page.goto("/login?next=%2Ffavorites");
  await page.getByRole("link", { name: "Sign up", exact: true }).click();
  await expect(page).toHaveURL(/\/register\?next=%2Ffavorites$/);
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByText("Mock authorization")).toBeVisible();
  expect(new URL(redirect).searchParams.get("next")).toBe("/favorites");
});

test("中文找回密码、自动填充和四个断点的触摸尺寸正确", async ({ page, context }) => {
  await context.addCookies([{ name: "site-language", value: "zh", url: "http://localhost:3000" }]);
  for (const width of [375, 414, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/login", "/register", "/reset-password"]) {
      await page.goto(path);
      await expect(page.locator('label[for="email"]')).toHaveText("邮箱");
      await expect(page.locator("#email")).toHaveAttribute("autocomplete", "email");
      const mobile = width < 768;
      const box = await page.locator("#email").boundingBox();
      expect(box?.height).toBe(mobile ? 44 : 32);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
      if (path === "/login") {
        await expect(page.locator("#password")).toHaveAttribute("autocomplete", "current-password");
        if (mobile) {
          await page.getByRole("button", { name: "显示密码" }).click();
          await expect(page.locator("#password")).toHaveAttribute("type", "text");
        }
      }
    }
    await expect(page.getByRole("heading", { name: "找回密码" })).toBeVisible();
  }
});

test("邮件发送失败可重试，限流后不能重复发送", async ({ page }) => {
  let calls = 0;
  await page.route(`${supabaseUrl}/auth/v1/recover**`, async (route) => {
    calls += 1;
    await route.fulfill({ status: calls === 1 ? 400 : 429, json: { error_code: calls === 1 ? "unexpected_failure" : "over_email_send_rate_limit", msg: "Private upstream detail" } });
  });
  await page.goto("/reset-password");
  await page.locator("#email").fill(user.email);
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("Unable to send");
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("Too many requests");
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
  expect(calls).toBe(2);
});

test("改密失败后可以重试，成功后返回登录并给出提示", async ({ page, context }) => {
  await seedRecoverySession(context);
  let calls = 0;
  await page.route("**/auth/recovery", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fulfill({ json: { user: { id: user.id, email: user.email } } });
      return;
    }
    calls += 1;
    if (calls === 1) await route.fulfill({ status: 400, json: { error: "same_password" } });
    else {
      await context.clearCookies({ name: `sb-${projectRef}-auth-token` });
      await route.fulfill({ json: { success: true } });
    }
  });
  await page.goto("/reset-password?from=email");
  await expect(page.locator("#password")).toBeVisible();
  await page.locator("#password").fill("safe-password");
  await page.locator("#confirmPassword").fill("safe-password");
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("different");
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
  await page.locator("#password").fill("different-password");
  await page.locator("#confirmPassword").fill("different-password");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/login\?reset=success$/);
  await expect(page.getByRole("status")).toContainText("Password updated");
  expect(calls).toBe(2);
});

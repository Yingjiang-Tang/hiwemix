import { expect, test } from "@playwright/test";

test("登录页提供完整的邮箱登录入口", async ({ page }) => {
  await page.goto("/login");

  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
  await expect(page.getByRole("link", { name: /sign up|注册/i })).toBeVisible();
});

test("未登录用户访问受保护页面时返回登录页", async ({ page }) => {
  await page.goto("/favorites");

  await expect(page).toHaveURL(/\/login\?next=%2Ffavorites$/);
  await expect(page.locator("#email")).toBeVisible();
});

test("未登录请求受保护 API 时返回 401", async ({ request }) => {
  const response = await request.get("/api/colors");

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ error: "unauthenticated" });
});

test("登录表单在当前视口内没有水平溢出", async ({ page }) => {
  await page.goto("/login");

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasHorizontalOverflow).toBe(false);
});

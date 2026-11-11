import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "site-language", value: "en", url: baseURL! }]);
});

test("尚未进入搜索区时刷新仍显示开屏", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Explore Now", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Explore Now", exact: true })).toBeVisible();
});

test("恢复搜索后仍可通过站内导航跳转并返回", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Now", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: /^All Makes/ })).toBeVisible();
  await page.getByRole("banner").getByRole("link", { name: "Toner", exact: true }).click();
  await expect(page).toHaveURL("/color-library");
  await page.goBack();
  await expect(page.getByRole("button", { name: /^All Makes/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore Now", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Search", exact: true })).toBeInViewport();
});

for (const width of [375, 414, 768, 1024]) {
  test(`${width}px：从结果区刷新回到搜索面板顶部`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Explore Now", exact: true }).click();
    await expect(page.getByRole("button", { name: /^All Makes/ })).toBeVisible();
    const main = page.getByRole("main");
    await main.evaluate((element) => { element.scrollTop = 700; });
    await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBeGreaterThan(500);

    await page.reload();

    await expect(page.getByRole("button", { name: "Explore Now", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^All Makes/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Search", exact: true })).toBeInViewport();
    await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

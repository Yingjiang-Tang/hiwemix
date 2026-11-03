import { expect, test, type Page } from "@playwright/test";
import { getTonerLink } from "../../src/data/toner-site-links";

const backend = process.env.TONER_TEST_BACKEND;
test.skip(!backend || !/^http:\/\/127\.0\.0\.1:\d+$/.test(backend), "需要本机隔离色母测试后端");
const user = { id: "11111111-1111-4111-8111-111111111111", email: "audit@example.invalid", aud: "authenticated", role: "authenticated", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const toners = [
  { code: "2K-2001", trade_name: "White", name_zh: "白色", category: "2K_BASECOAT", hex: "#FFFFFF", website_url: "https://hiwe.com/first" },
  { code: "2K-2002", trade_name: "Black", name_zh: "黑色", category: "2K_BASECOAT", hex: "#111111", website_url: null },
  { code: "1K-3001", trade_name: "Red", name_zh: "红色", category: "1K_BASECOAT", hex: "#FF0000", website_url: null },
];

test.beforeEach(async ({ context, request, baseURL, page }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `toner-test-${Date.now()}` });
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp, aud: "authenticated", role: "authenticated" })}.test`;
  await context.addCookies([{ name: "sb-127-auth-token", value: `base64-${encode({ access_token: token, refresh_token: "test-refresh", expires_at: exp, expires_in: 3600, token_type: "bearer", user })}`, url: baseURL! }]);
  await request.post(`${backend}/__fixture`, { data: { toners } });
  await page.addInitScript(() => { document.cookie = "site-language=en; path=/"; });
});

async function openEdit(page: Page, code = "2K-2001") {
  await page.getByRole("button", { name: "管理色母", exact: true }).click();
  await page.getByRole("row").filter({ hasText: code }).getByRole("button", { name: "编辑", exact: true }).click();
  return page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: `编辑色母 — ${code}`, exact: true }) });
}

async function closeManagement(page: Page) {
  await page.getByRole("dialog").filter({ has: page.getByPlaceholder("搜索色母代码、名称、分类...") }).getByRole("button", { name: "Close", exact: true }).click();
}

for (const width of [375, 414, 768, 1024]) {
  test(`${width}px：编辑、即时更新、刷新持久化和解除关联`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/color-library", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "2K-2001 White", exact: true })).toHaveAttribute("href", "https://hiwe.com/first");
    const dialog = await openEdit(page);
    const input = dialog.getByLabel("官网产品页链接", { exact: true });
    await expect(input).toHaveValue("https://hiwe.com/first");
    await input.fill(" https://www.hiwe.com/manual-product ");
    if (width < 768) {
      for (const control of [input, dialog.getByRole("button", { name: "打开验证" }), dialog.getByRole("button", { name: "保存", exact: true })]) {
        await expect.poll(async () => (await control.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(44);
        await expect.poll(async () => (await control.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    }
    await page.screenshot({ path: test.info().outputPath(`toner-edit-${width}.png`), fullPage: true });
    await dialog.getByRole("button", { name: "保存", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await closeManagement(page);
    await expect(page.getByRole("link", { name: "2K-2001 White", exact: true })).toHaveAttribute("href", "https://www.hiwe.com/manual-product");
    await page.reload();
    await expect(page.getByRole("link", { name: "2K-2001 White", exact: true })).toHaveAttribute("href", "https://www.hiwe.com/manual-product");
    const second = await openEdit(page);
    await second.getByLabel("官网产品页链接", { exact: true }).fill("");
    await expect(second.getByRole("button", { name: "打开验证" })).toBeDisabled();
    await second.getByRole("button", { name: "保存", exact: true }).click();
    await expect(second).not.toBeVisible();
    await closeManagement(page);
    await page.reload();
    await expect(page.getByText("2K-2001", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "2K-2001 White", exact: true })).toHaveCount(0);
    if (width < 768) await page.getByRole("button", { name: "2K Basecoat", exact: true }).click();
    await page.getByRole("tab", { name: /^All \d+$/ }).click();
    // 此编号在旧静态映射中有链接，数据库为 NULL 时也不能恢复旧链接。
    await expect(page.getByText("1K-3001", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "1K-3001 Red", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("新增失败保留输入，重试等待成功并防止重复提交", async ({ page }) => {
  await page.goto("/color-library", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "管理色母", exact: true }).click();
  await page.getByRole("button", { name: "添加色母", exact: true }).click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "添加色母", exact: true }) });
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "2K Basecoat", exact: true }).click();
  await dialog.getByPlaceholder("例如 Titanium White").fill("Manual Toner");
  await dialog.getByPlaceholder("例如 纯白").fill("手动色母");
  const input = dialog.getByLabel("官网产品页链接", { exact: true });
  await input.fill("https://hiwe.com/manual-new");
  let attempts = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/admin/toners", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts++;
    if (attempts === 1) return route.fulfill({ status: 500, json: { error: "保存失败，请稍后重试" } });
    await pending;
    await route.continue();
  });
  await dialog.getByRole("button", { name: "保存提交", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("保存失败，请稍后重试");
  await expect(input).toHaveValue("https://hiwe.com/manual-new");
  await dialog.getByRole("button", { name: "保存提交", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "保存中…", exact: true })).toBeDisabled();
  await expect(input).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  expect(attempts).toBe(2);
  release();
  await expect(dialog).not.toBeVisible();
  await closeManagement(page);
  await expect(page.getByRole("link", { name: "2K-2003 Manual Toner", exact: true })).toHaveAttribute("href", "https://hiwe.com/manual-new");
  await page.reload();
  await expect(page.getByRole("link", { name: "2K-2003 Manual Toner", exact: true })).toBeVisible();
});

test("编辑失败保留输入，拒绝非法网址并使用当前输入打开验证", async ({ page, context }) => {
  await page.goto("/color-library", { waitUntil: "domcontentloaded" });
  const dialog = await openEdit(page);
  const input = dialog.getByLabel("官网产品页链接", { exact: true });
  await input.fill("https://hiwe.com.evil.com/wrong");
  await expect(dialog.getByRole("button", { name: "打开验证" })).toBeDisabled();
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("仅支持");
  await input.fill("https://hiwe.com/unsaved-preview");
  await context.route("https://hiwe.com/**", (route) => route.fulfill({ contentType: "text/html", body: "Product preview" }));
  const popupPromise = page.waitForEvent("popup");
  await dialog.getByRole("button", { name: "打开验证" }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://hiwe.com/unsaved-preview");
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await popup.close();
  await page.route("**/api/admin/toners", (route) => route.request().method() === "PUT" ? route.abort() : route.continue());
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(input).toHaveValue("https://hiwe.com/unsaved-preview");
  await expect(dialog.getByRole("button", { name: "保存", exact: true })).toBeEnabled();
});

test("桌面色母卡片与修改前版本像素一致", async ({ page, context, request }) => {
  const baseline = process.env.TONER_BASELINE_URL;
  test.skip(!baseline || !/^http:\/\/localhost:\d+\/[a-z0-9-]+$/.test(baseline), "可选：需要运行修改前版本的本机页面地址");
  await request.post(`${backend}/__fixture`, { data: { toners: toners.map((toner) => ({ ...toner, website_url: getTonerLink(toner.code) ?? null })) } });
  const original = await context.newPage();
  try {
    for (const width of [768, 1024]) {
      await page.setViewportSize({ width, height: 1000 });
      await original.setViewportSize({ width, height: 1000 });
      await Promise.all([page.goto("/color-library", { waitUntil: "domcontentloaded" }), original.goto(baseline!, { waitUntil: "domcontentloaded" })]);
      for (const view of [page, original]) {
        await expect(view.getByRole("button", { name: "管理色母", exact: true })).toBeVisible();
        await expect(view.getByText("2K-2001", { exact: true })).toBeVisible();
        await view.evaluate(() => document.fonts.ready);
      }
      for (const mode of ["category", "all"]) {
        if (mode === "all") {
          await Promise.all([page.getByRole("tab", { name: /^All \d+$/ }).click(), original.getByRole("tab", { name: /^All \d+$/ }).click()]);
        }
        // 基准页面路由不同会改变导航高亮，仅比较本次涉及的完整色母内容区域。
        const options = { animations: "disabled", style: "header, nextjs-portal, .sticky { visibility: hidden !important; }" } as const;
        const actual = await page.locator(".flex-1.px-6").screenshot({ ...options, path: test.info().outputPath(`toner-current-${width}-${mode}.png`) });
        const expected = await original.locator(".flex-1.px-6").screenshot({ ...options, path: test.info().outputPath(`toner-before-${width}-${mode}.png`) });
        expect(Buffer.compare(actual, expected), `${width}px ${mode} 色母内容应无像素变化`).toBe(0);
      }
    }
  } finally { await original.close(); }
});

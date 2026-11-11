import { expect, test } from "@playwright/test";

// 仅在隔离的管理员测试后端执行，避免向生产环境写入测试数据。
const backend = process.env.FORMULA_YEAR_TEST_BACKEND;
test.skip(!backend || !/^http:\/\/127\.0\.0\.1:\d+$/.test(backend), "需要本机隔离测试后端 FORMULA_YEAR_TEST_BACKEND");
test.describe.configure({ mode: "serial" });
const user = { id: "11111111-1111-4111-8111-111111111111", email: "audit@example.invalid", aud: "authenticated", role: "authenticated", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const components = [{ toner_code: "2K-2001", toner_name: "White", percentage: 100, grams_per_100g: 100 }];
const raw = (id: string, mode: string, years: { year: number; year_end?: number }[]) => ({ id, color_id: "toyota_A", variant_id: "1", version: id, paint_system: "2K", formula_type: "Single Stage", notes: "", updated_at: "2026-11-03", formula_components: components, year_mode: mode, formula_years: years });

test.beforeEach(async ({ context, page, request, baseURL }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `year-test-${Date.now()}` });
  await page.route("**/_next/image?**", (route) => route.fulfill({ path: "public/images/colors/ZK01.jpg", contentType: "image/jpeg" }));
  await page.route("**/images/colors/**", (route) => route.fulfill({ path: "public/images/colors/ZK01.jpg", contentType: "image/jpeg" }));
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp, aud: "authenticated", role: "authenticated" })}.test`;
  await context.addCookies([{ name: "sb-127-auth-token", value: `base64-${encode({ access_token: token, refresh_token: "test-refresh", expires_at: exp, expires_in: 3600, token_type: "bearer", user })}`, url: baseURL! }]);
  await request.post(`${backend}/__reset`);
  await request.post(`${backend}/__fixture`, { data: { color_years: [{ color_id: "toyota_A", year: 2018, year_end: 2025 }], formulas: [raw("A", "custom", [{ year: 2018, year_end: 2021 }]), raw("B", "custom", [{ year: 2022, year_end: 2025 }]), raw("legacy", "inherit", [])] } });
  await page.addInitScript(() => { document.cookie = "site-language=en; path=/"; });
});

for (const width of [375, 414, 768, 1024]) {
  test(`表单 ${width}px：读取、编辑多区间、刷新和明确选择模式`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/admin/data");
    if (width < 768) {
      await page.getByRole("button", { name: "Open menu", exact: true }).last().click();
    }
    await page.getByRole("button", { name: "配方", exact: true }).filter({ visible: true }).first().click();
    await page.getByRole("button", { name: /^A A(?: |$)/ }).click();
    await expect(page.locator("#formula-year-mode")).toHaveValue("custom");
    await expect(page.getByLabel("起始年份 1", { exact: true })).toHaveValue("2018");
    await page.getByLabel("起始年份 1", { exact: true }).fill("2019");
    await page.getByRole("button", { name: "添加年份或区间" }).click();
    await page.getByLabel("起始年份 2", { exact: true }).fill("2024");
    await expect(page.getByRole("status")).toContainText("允许作为备选配方保存");
    const controls = await page.locator("fieldset input, fieldset select, fieldset button").evaluateAll((elements) => elements.map((el) => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
    if (width < 768) expect(controls.every((rect) => rect.height >= 44 && rect.width >= 44), JSON.stringify(controls)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const saved = page.waitForResponse((response) => response.url().endsWith("/api/admin/formulas") && response.request().method() === "PUT");
    await page.getByRole("button", { name: "保存配方", exact: true }).click();
    expect((await saved).ok()).toBe(true);
    await page.reload();
    if (width < 768) await page.getByRole("button", { name: "Open menu", exact: true }).last().click();
    await page.getByRole("button", { name: "配方", exact: true }).filter({ visible: true }).first().click();
    await page.getByRole("button", { name: /^A A(?: |$)/ }).click();
    await expect(page.getByLabel("起始年份 1", { exact: true })).toHaveValue("2019");
    await expect(page.getByLabel("起始年份 2", { exact: true })).toHaveValue("2024");
    await page.screenshot({ path: test.info().outputPath(`formula-years-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "新增配方", exact: true }).filter({ visible: true }).first().click();
    await expect(page.locator("#formula-year-mode")).toHaveValue("");
    await expect(page.getByRole("button", { name: "保存配方", exact: true })).toBeDisabled();
  });
}

test("搜索匹配项、详情切换、复制和打印的年份一致", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text: string) => { (window as Window & { copied?: string }).copied = text; } } });
    window.print = () => {};
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Now/i }).click();
  await page.getByRole("button", { name: "Year", exact: true }).click();
  await page.getByRole("button", { name: "2020", exact: true }).click();
  await page.getByRole("button", { name: "Search", exact: true }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "A Audit Color A", exact: true }).click();
  await page.getByRole("button", { name: /2018-2021$/ }).click();
  const selection = page.locator("#formula-selection");
  await expect(selection.locator("option")).toHaveCount(2);
  await expect(selection).toContainText("Inherited from color");
  await expect(selection.locator('option[value="B"]')).toHaveCount(0);
  await selection.selectOption("legacy");
  await expect(page.locator(".formula-drawer")).toContainText("2018-2025");
  await selection.selectOption("A");
  await page.getByRole("button", { name: "Copy", exact: true }).filter({ visible: true }).first().click();
  expect(await page.evaluate(() => (window as Window & { copied?: string }).copied)).toContain("Years: 2018-2021");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".formula-drawer")).toContainText("2018-2021");
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "Add to Compare", exact: true }).filter({ visible: true }).first().click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("hiwe-compare")!));
  expect(saved[0].snapshot.formula.year_mode).toBe("custom");
  expect(saved[0].snapshot.formula.years).toEqual([{ year: 2018, year_end: 2021 }]);
});

test("2024 返回 B、2026 无匹配、不选年份显示三个备选", async ({ page }) => {
  for (const year of ["2024", "2026", ""]) {
    // 每轮重新访问首页，避免复用上一轮已进入搜索的历史状态。
    await page.goto("/color-library");
    await page.goto("/");
    await page.getByRole("button", { name: /Explore Now/i }).click();
    if (year) {
      await page.getByRole("button", { name: "Year", exact: true }).click();
      await page.getByRole("button", { name: year, exact: true }).click();
      await page.getByRole("button", { name: "Search", exact: true }).filter({ visible: true }).first().click();
    }
    if (year === "2026") {
      await expect(page.getByRole("button", { name: "A Audit Color A", exact: true })).toHaveCount(0);
      await expect(page.getByText("No matching colors found", { exact: true })).toBeVisible();
    } else {
      await page.getByRole("button", { name: "A Audit Color A", exact: true }).click();
      await page.getByRole("button", { name: year ? /2022-2025$/ : /2018-2021$/ }).click();
      const selection = page.locator("#formula-selection");
      await expect(selection.locator("option")).toHaveCount(year ? 2 : 3);
      expect(await selection.inputValue()).toBe(year ? "B" : "A");
      if (year) await expect(selection.locator('option[value="A"]')).toHaveCount(0);
    }
  }
});

test("旧对比快照可按沿用模式读取，收藏使用当前配方年份", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const formula = { id: "old-snapshot", color_id: "toyota_A", variant_id: "", version: "old", paint_system: "2K", formula_type: "Single Stage", components: [], notes: "", updated_at: "" };
    const color = { id: "toyota_A", make_id: "toyota", color_code: "A", color_name: "Old Snapshot", color_type: ["solid"], hex_preview: "#fff", variants: [], years: [{ year: 2019, year_end: 2020 }] };
    localStorage.setItem("hiwe-compare", JSON.stringify([{ snapshot: { formula_id: formula.id, formula, color }, ts: Date.now() }]));
  });
  await page.goto("/compare");
  await expect(page.getByText(/2019-2020/)).toBeVisible();
  await page.getByRole("button", { name: "A Old Snapshot", exact: true }).click();
  await expect(page.locator(".formula-drawer")).toContainText("Inherited from color");
  await page.route("**/api/favorites", (route) => route.fulfill({ json: [{ id: 1, formula_id: "B", color_code: "A", color_name: "Audit Color A", make_name: "Toyota", formula_type: "Single Stage", paint_system: "2K", version: "stale" }] }));
  await page.goto("/favorites");
  await expect(page.getByText(/2022-2025/)).toBeVisible();
});

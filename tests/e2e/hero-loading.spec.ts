import { expect, test } from "@playwright/test";

test("首页 HTML 提供视频，浏览器无需等待脚本即可发现资源", async ({ request }) => {
  const response = await request.get("/");
  const html = await response.text();
  expect(html.includes("<video")).toBe(true);
  expect(html.includes('preload="auto"')).toBe(true);
});

test("脚本尚未执行时，浏览器已开始下载视频", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const videoRequest = page.waitForRequest("**/video/hero-v2.mp4");
  await page.route("**/_next/**/*.js", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await videoRequest;
});

test("移动端和减少动态效果模式不下载背景视频", async ({ browser, baseURL }) => {
  for (const settings of [
    { viewport: { width: 375, height: 812 }, reducedMotion: "no-preference" as const },
    { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" as const },
  ]) {
    const context = await browser.newContext(settings);
    const page = await context.newPage();
    const videos: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("hero-v2.mp4")) videos.push(request.url());
    });
    try {
      await page.goto(baseURL!, { waitUntil: "networkidle" });
      expect(videos).toEqual([]);
    } finally {
      await context.close();
    }
  }
});

test("首页视频分段请求直接返回媒体，不跳转登录", async ({ request }) => {
  const response = await request.get("/video/hero-v2.mp4", {
    headers: { Range: "bytes=0-65535" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(206);
  expect(response.headers()["content-type"]).toContain("video/mp4");
  expect(response.headers()["content-range"]).toMatch(/^bytes 0-65535\//);
});

test("首次进入首页能够自动起播并显示视频", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const startedAt = Date.now();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const video = page.locator("video");
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime), { timeout: 10000 }).toBeGreaterThan(0);
  await expect(video).toHaveCSS("opacity", "1");
  console.log(`首页冷启动到视频显示：${Date.now() - startedAt}ms`);
});

test("首页媒体尚未加载时不露出蓝色背景", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // 阻断媒体请求，稳定复现冷启动时图片和视频均不可用的首屏。
  await page.route("**/video/hero-poster.jpg", (route) => route.abort());
  await page.route("**/video/hero-v2.mp4", (route) => route.abort());
  await page.goto("/");

  const hero = page.locator("section").filter({ has: page.locator("video") }).last();
  await expect(hero).toBeVisible();
  await expect(hero).toHaveCSS("background-image", "none");
  const color = await hero.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(color).not.toBe("rgba(0, 0, 0, 0)");
});

test("视频淡入时封面仍不透明，不露出底层", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let releaseVideo!: () => void;
  const waiting = new Promise<void>((resolve) => { releaseVideo = resolve; });
  await page.route("**/video/hero-v2.mp4", async (route) => {
    await waiting;
    await route.abort();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const video = page.locator("video");
    const poster = page.locator('img[src="/video/hero-poster.jpg"]');
    await expect(poster).toBeVisible();
    await expect.poll(() => poster.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    // 只推进视频就绪事件，检查真实组件的图层切换。
    await video.dispatchEvent("canplay");
    await expect(video).toHaveCSS("opacity", "1");
    await expect(poster).toHaveCSS("opacity", "1");
  } finally {
    releaseVideo();
  }
});

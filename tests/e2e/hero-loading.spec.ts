import { expect, test } from "@playwright/test";

test("首页媒体尚未加载时不露出蓝色背景", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // 阻断媒体请求，稳定复现冷启动时图片和视频均不可用的首屏。
  await page.route("**/video/hero-poster.jpg", (route) => route.abort());
  await page.route("**/video/hero.mp4", (route) => route.abort());
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
  await page.route("**/video/hero.mp4", async (route) => {
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

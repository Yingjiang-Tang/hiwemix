export const LOCAL_PREVIEW_HEADER = "x-hiwe-local-preview";

const PREVIEW_PATHS = new Set([
  "/", "/color-library", "/favorites", "/compare", "/tds",
  "/api/brands", "/api/colors", "/api/formulas", "/api/settings",
  "/api/regions", "/api/toners", "/api/tds",
]);

// 免登录仅用于本机开发预览，生产构建及其他域名始终走原认证流程。
export function isLocalPreviewHost(host: string | null): boolean {
  return process.env.NODE_ENV === "development" &&
    /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host ?? "");
}

export function isLocalPreviewRequest(request: Pick<Request, "url" | "method">): boolean {
  const url = new URL(request.url);
  return isLocalPreviewHost(url.host) &&
    (request.method === "GET" || request.method === "HEAD") &&
    PREVIEW_PATHS.has(url.pathname);
}

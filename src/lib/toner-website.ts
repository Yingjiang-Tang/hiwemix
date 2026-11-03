// 前后端共用：官网链接可留空，但不能指向其他站点或使用非 HTTPS 协议。
export function normalizeTonerWebsiteUrl(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("官网产品页链接必须是网址文本");
  const trimmed = value.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    if (!/^https:\/\/[^/]/i.test(trimmed) || /[\s\\]/.test(trimmed)) throw new Error();
    url = new URL(trimmed);
  } catch {
    throw new Error("请输入完整的 HTTPS 官网产品页网址");
  }
  if (url.protocol !== "https:" || !["hiwe.com", "www.hiwe.com"].includes(url.hostname) || url.username || url.password || url.port) {
    throw new Error("仅支持 https://hiwe.com 或 https://www.hiwe.com，不允许账号密码或非标准端口");
  }
  return url.href;
}

/** 提取 Supabase 错误信息，处理各种异常返回格式 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") {
    // Supabase 有时返回 message 为字符串 "{}"（服务端内部错误）
    if (!err || err === "{}") return fallback;
    return err;
  }
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message && obj.message !== "{}") return obj.message;
    if (typeof obj.error_description === "string") return obj.error_description;
  }
  return fallback;
}

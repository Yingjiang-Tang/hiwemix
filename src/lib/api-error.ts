import { NextResponse } from "next/server";

// 把任意 thrown value 规范化为 Error 实例，避免 Supabase PostgrestError
// 或网络层 throw 出来的 plain object 进入 Next.js dev 日志后变成 "⨯ {}"。
export function toError(err: unknown, fallback = "Unknown error"): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const message =
      (typeof obj.message === "string" && obj.message) ||
      (typeof obj.error_description === "string" && obj.error_description) ||
      (typeof obj.msg === "string" && obj.msg) ||
      fallback;
    const e = new Error(message);
    if (typeof obj.code === "string") (e as Error & { code?: string }).code = obj.code;
    return e;
  }
  return new Error(typeof err === "string" ? err : fallback);
}

export function jsonError(err: unknown, status = 500): NextResponse {
  const e = toError(err);
  console.error("[api]", e.message, e.stack);
  // 脱敏：不把内部错误（DB 约束/表结构等）回传给客户端，统一通用文案
  return NextResponse.json({ error: "服务器内部错误" }, { status });
}

export function adminWriteError(err: unknown): NextResponse {
  if (err && typeof err === "object" && "code" in err && err.code === "P0001" && "message" in err && typeof err.message === "string") {
    if (err.message.startsWith("配方年份与颜色范围冲突：")) return NextResponse.json({ error: err.message }, { status: 409 });
    if (err.message.startsWith("配方年份设置")) return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err && typeof err === "object" && "code" in err && err.code === "23503") {
    return NextResponse.json({ error: "仍有关联记录，请先处理关联数据" }, { status: 409 });
  }
  if (err && typeof err === "object" && "code" in err && err.code === "23505") {
    return NextResponse.json({ error: "ID 已存在，请使用编辑功能或更换 ID" }, { status: 409 });
  }
  if (err instanceof Error && (err.message.includes("仍关联") || err.message.includes("已存在"))) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
  return jsonError(err);
}

// 给 GET handler 用的薄包装：handler 抛错时统一返回 500 + 真错误消息。
export async function safeJson<T>(factory: () => Promise<T> | T): Promise<NextResponse> {
  try {
    return NextResponse.json(await factory());
  } catch (err) {
    return jsonError(err);
  }
}

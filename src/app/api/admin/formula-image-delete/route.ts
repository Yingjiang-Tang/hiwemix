import { NextRequest, NextResponse } from "next/server";
import { checkSupabaseAdmin } from "@/lib/auth";
import { applyRateLimit, ADMIN_LIMIT } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// 从 formula-images 桶删除指定文件（用于替换/删除配方颜色参考图时的旧文件清理）
// 请求：DELETE { "path": "filename.jpg" } 或 { "url": "https://.../formula-images/filename.jpg" }
// 响应：{ success: true } 或 { error }
// 注意：best-effort，删除失败仅服务端日志，不影响主流程（调用方已自行处理 fallback）
export async function DELETE(req: NextRequest) {
  const limitRes = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes) return limitRes;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;

  let body: { path?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const path = body.path || extractPathFromUrl(body.url || "");
  if (!path) {
    return NextResponse.json({ error: "缺少 path 或 url" }, { status: 400 });
  }

  // 路径校验：禁止 .. / 空字符串 / 包含非法前缀，防止越权访问其他桶
  if (path.includes("..") || path.startsWith("/") || path.includes("\0")) {
    return NextResponse.json({ error: "非法路径" }, { status: 400 });
  }

  try {
    const { error: rmErr } = await getSupabaseAdmin()
      .storage
      .from("formula-images")
      .remove([path]);
    if (rmErr) {
      console.warn(`[DELETE /api/admin/formula-image-delete] failed: ${path}`, rmErr);
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/admin/formula-image-delete]", e);
    return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 500 });
  }
}

function extractPathFromUrl(url: string): string | null {
  if (!url) return null;
  const marker = "/object/public/formula-images/";
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  const path = url.slice(idx + marker.length);
  return path || null;
}

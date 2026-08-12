import { NextRequest, NextResponse } from "next/server";
import { checkSupabaseAdmin } from "@/lib/auth";
import { applyRateLimit, ADMIN_LIMIT } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// 上传图片到 Supabase Storage 公开 bucket 'tds-images'
// 请求：multipart/form-data，字段名 file
// 响应：{ url: string } 或 { error: string }
export async function POST(req: NextRequest) {
  const limitRes = applyRateLimit(req, ADMIN_LIMIT);
  if (limitRes) return limitRes;
  const { error } = await checkSupabaseAdmin();
  if (error) return error;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "请求格式错误（需要 multipart/form-data）" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少文件（字段名 file）" }, { status: 400 });
  }

  // 限制文件类型和大小
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "仅支持 JPG/PNG/WebP/GIF" }, { status: 400 });
  }
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "文件超过 5 MB" }, { status: 400 });
  }

  // 生成唯一文件名：{时间戳}-{随机}-{原文件名}
  const ext = file.name.split(".").pop() ?? "bin";
  const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext : "bin";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await getSupabaseAdmin()
      .storage
      .from("tds-images")
      .upload(filename, buf, {
        contentType: file.type,
        upsert: false,
        cacheControl: "31536000", // 1 年缓存
      });
    if (upErr) throw upErr;

    const { data: pub } = getSupabaseAdmin().storage.from("tds-images").getPublicUrl(filename);
    return NextResponse.json({ url: pub.publicUrl });
  } catch (e) {
    // 内部错误脱敏：真实错误只进服务端日志
    console.error("[POST /api/admin/tds-upload]", e);
    return NextResponse.json({ error: "上传失败，请稍后重试" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getGuideCategories, getGuides } from "@/lib/db-tds";
import { requireLogin } from "@/lib/auth";

// 公开读：列出分类 + 文档（登录用户，全站已登录门禁，此处为路由级纵深防御）
export async function GET(req: NextRequest) {
  const authError = await requireLogin();
  if (authError) return authError;
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const docType = (searchParams.get("docType") ?? undefined) as
    | "tds"
    | "msds"
    | "sds"
    | "manual"
    | undefined;

  try {
    const [categories, guides] = await Promise.all([
      getGuideCategories(),
      getGuides({ categoryId, docType, publishedOnly: true }),
    ]);
    return NextResponse.json({ categories, guides });
  } catch (e) {
    // 内部错误脱敏：真实错误只进服务端日志，客户端只看到通用文案
    console.error("[GET /api/tds]", e);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
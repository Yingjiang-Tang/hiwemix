import { NextRequest, NextResponse } from "next/server";
import { getGuideCategories, getGuides } from "@/lib/db-tds";

// 公开读：列出分类 + 文档（默认只显示已发布）
export async function GET(req: NextRequest) {
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
    const detail = (e as { message?: string })?.message ?? String(e);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
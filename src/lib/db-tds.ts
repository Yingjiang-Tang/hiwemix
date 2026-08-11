// ============================================================
// TDS 产品手册数据访问层
// 读用 session 感知的 SSR 客户端（受 RLS SELECT 保护，仅已登录用户），写用 getSupabaseAdmin()（BYPASSRLS）
// ============================================================
import { createClient } from "./supabase/server";
import { getSupabaseAdmin } from "./supabase-server";
import type { GuideCategory, Guide, DocType } from "@/types";

// ====== 读 ======

export async function getGuideCategories(): Promise<GuideCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guide_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapCategoryRow);
}

export async function getGuides(opts?: {
  categoryId?: string;
  docType?: DocType;
  publishedOnly?: boolean;
}): Promise<Guide[]> {
  const supabase = await createClient();
  let q = supabase.from("guides").select("*").order("sort_order", { ascending: true });
  if (opts?.categoryId) q = q.eq("category_id", opts.categoryId);
  if (opts?.docType) q = q.eq("doc_type", opts.docType);
  if (opts?.publishedOnly) q = q.eq("is_published", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapGuideRow);
}

export async function getGuideById(id: string): Promise<Guide | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guides")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapGuideRow(data) : null;
}

// ====== 管理端写 ======

export async function saveGuideCategory(cat: GuideCategory): Promise<GuideCategory> {
  const { data, error } = await getSupabaseAdmin()
    .from("guide_categories")
    .upsert({
      id: cat.id,
      name: cat.name,
      name_zh: cat.nameZh,
      description: cat.description ?? null,
      description_zh: cat.descriptionZh ?? null,
      icon: cat.icon ?? null,
      sort_order: cat.sortOrder ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return mapCategoryRow(data as Record<string, unknown>);
}

export async function deleteGuideCategory(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("guide_categories").delete().eq("id", id);
  if (error) throw error;
}

export async function saveGuide(guide: Guide): Promise<Guide> {
  const { data, error } = await getSupabaseAdmin()
    .from("guides")
    .upsert({
      id: guide.id,
      category_id: guide.categoryId,
      product_sku: guide.productSku ?? null,
      version: guide.version,
      doc_type: guide.docType,
      title: guide.title,
      title_zh: guide.titleZh,
      summary: guide.summary ?? null,
      summary_zh: guide.summaryZh ?? null,
      cover_image: guide.coverImage ?? null,
      content: guide.content ?? "",
      content_zh: guide.contentZh ?? "",
      sort_order: guide.sortOrder ?? 0,
      is_published: guide.isPublished,
    })
    .select()
    .single();
  if (error) throw error;
  return mapGuideRow(data as Record<string, unknown>);
}

export async function deleteGuide(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("guides").delete().eq("id", id);
  if (error) throw error;
}

// ====== 内部映射（snake_case → camelCase） ======

function mapCategoryRow(row: Record<string, unknown>): GuideCategory {
  return {
    id: row.id as string,
    name: row.name as string,
    nameZh: row.name_zh as string,
    description: (row.description as string) ?? undefined,
    descriptionZh: (row.description_zh as string) ?? undefined,
    icon: (row.icon as string) ?? undefined,
    sortOrder: row.sort_order as number,
  };
}

function mapGuideRow(row: Record<string, unknown>): Guide {
  return {
    id: row.id as string,
    categoryId: row.category_id as string,
    productSku: (row.product_sku as string) ?? undefined,
    version: row.version as string,
    docType: row.doc_type as DocType,
    title: row.title as string,
    titleZh: row.title_zh as string,
    summary: (row.summary as string) ?? undefined,
    summaryZh: (row.summary_zh as string) ?? undefined,
    coverImage: (row.cover_image as string) ?? undefined,
    content: row.content as string,
    contentZh: row.content_zh as string,
    sortOrder: row.sort_order as number,
    isPublished: row.is_published as boolean,
    updatedAt: row.updated_at as string,
  };
}
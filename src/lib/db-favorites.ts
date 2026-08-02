import { getSupabaseAdmin } from "./supabase-server";

// 收藏项（冗余快照 + 主键引用）
export interface UserFavorite {
  id: number;
  user_id: string;
  formula_id: string;
  color_code: string;
  color_name: string;
  make_name: string;
  formula_type: string;
  paint_system: string;
  version: string;
  created_at: string;
}

// 收藏时保存的快照输入（由前端传入，含展示所需冗余字段）
export interface FavoriteSnapshot {
  formula_id: string;
  color_code: string;
  color_name: string;
  make_name: string;
  formula_type: string;
  paint_system: string;
  version: string;
}

/** 获取用户的收藏列表（按收藏时间倒序） */
export async function getUserFavorites(userId: string): Promise<UserFavorite[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message || "query favorites failed");
  return (data ?? []) as UserFavorite[];
}

/** 新增收藏（幂等：同 user+formula 已存在则直接返回现有记录） */
export async function addUserFavorite(userId: string, snapshot: FavoriteSnapshot): Promise<UserFavorite> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_favorites")
    .upsert(
      {
        user_id: userId,
        ...snapshot,
      },
      { onConflict: "user_id,formula_id", ignoreDuplicates: false }
    )
    .select()
    .single();
  if (error) throw new Error(error.message || "insert favorite failed");
  return data as UserFavorite;
}

/** 删除收藏 */
export async function removeUserFavorite(userId: string, formulaId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("user_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("formula_id", formulaId);
  if (error) throw new Error(error.message || "delete favorite failed");
}

/** 判断是否已收藏某配方 */
export async function isFavorite(userId: string, formulaId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("formula_id", formulaId)
    .maybeSingle();
  if (error) throw new Error(error.message || "check favorite failed");
  return !!data;
}

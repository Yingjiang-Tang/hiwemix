import { getSupabaseAdmin } from "./supabase-server";
import type { FormulaSnapshot } from "@/types";

// 个人保存的配方行
export interface UserSavedFormula {
  id: number;
  user_id: string;
  formula_id: string | null;
  name: string;
  formula_json: FormulaSnapshot;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// 保存输入（前端传入：名称 + 完整快照）
export interface SaveFormulaInput {
  name: string;
  formula_id: string;
  formula_json: FormulaSnapshot;
}

/** 获取用户保存的配方列表（按保存时间倒序） */
export async function getUserSavedFormulas(userId: string): Promise<UserSavedFormula[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_formulas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message || "query saved formulas failed");
  return (data ?? []) as UserSavedFormula[];
}

/** 保存配方（幂等：同 user+formula 重复保存时更新快照与 updated_at，保留首版 name/notes） */
export async function addUserSavedFormula(userId: string, input: SaveFormulaInput): Promise<UserSavedFormula> {
  // 服务端校验 formula 真实存在：避免保存幽灵配方
  const { data: formulaRow, error: formulaErr } = await getSupabaseAdmin()
    .from("formulas")
    .select("id")
    .eq("id", input.formula_id)
    .maybeSingle();
  if (formulaErr) throw new Error(formulaErr.message || "query formula failed");
  if (!formulaRow) throw new Error("formula not found");

  const { data, error } = await getSupabaseAdmin()
    .from("user_formulas")
    .upsert(
      {
        user_id: userId,
        formula_id: input.formula_id,
        name: input.name,
        formula_json: input.formula_json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,formula_id" }
    )
    .select()
    .single();
  if (error) throw new Error(error.message || "save formula failed");
  return data as UserSavedFormula;
}

/** 删除保存的配方（按行主键） */
export async function removeUserSavedFormula(userId: string, id: number): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("user_formulas")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(error.message || "delete saved formula failed");
}

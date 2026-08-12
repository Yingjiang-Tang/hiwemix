-- =====================================================================
-- 迁移：save_formula_type 事务化 — 变体重命名（5 步引用迁移）改为单个 DB 事务
-- 背景：此前 saveFormulaType 改 ID 时是 5 步顺序调用（建新 color_variants → 迁 map → 迁 formulas → 删旧 variants → 删旧 formula_types），
--       无事务。中途失败会留下半迁移状态（新 ID 已建但引用未迁完，或旧行未删净）。
--       本迁移把全部步骤收进一个 RPC 函数（SECURITY DEFINER，事务内执行），任一失败整体回滚。
-- 用法：Supabase Dashboard → SQL Editor → 粘贴 → Run（幂等，CREATE OR REPLACE 可重复执行）
-- 语义与原代码一致：ID 未变更时仅 upsert formula_types + 同步 color_variants 真名。
-- =====================================================================

CREATE OR REPLACE FUNCTION public.save_variant_with_relink(
  p_id TEXT,
  p_name TEXT,
  p_year_range TEXT,
  p_original_id TEXT DEFAULT NULL
) RETURNS SETOF public.formula_types
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.formula_types;
BEGIN
  -- 1. 若 ID 发生了变更：先把所有引用迁移到新 ID，再删除旧记录（全部在同一事务内）
  IF p_original_id IS NOT NULL AND p_original_id <> p_id THEN
    -- 1a. 在 color_variants 中建立新 ID 行（ON CONFLICT 覆盖同 ID 旧行，沿用原 upsert 语义）
    INSERT INTO public.color_variants (id, name, year_range)
    VALUES (p_id, p_name, p_year_range)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      year_range = EXCLUDED.year_range;

    -- 1b. 迁移 color_variant_map（多对多关联）
    UPDATE public.color_variant_map SET variant_id = p_id WHERE variant_id = p_original_id;

    -- 1c. 迁移 formulas.variant_id（ON DELETE SET NULL，不迁移会在删旧行时把配方置空）
    UPDATE public.formulas SET variant_id = p_id WHERE variant_id = p_original_id;

    -- 1d. 删除旧 color_variants 行（此时已无引用）
    DELETE FROM public.color_variants WHERE id = p_original_id;

    -- 1e. 删除旧 formula_types 行
    DELETE FROM public.formula_types WHERE id = p_original_id;
  END IF;

  -- 2. upsert formula_types（新行 / 改名目标行）
  INSERT INTO public.formula_types (id, name, year_range)
  VALUES (p_id, p_name, p_year_range)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    year_range = EXCLUDED.year_range
  RETURNING * INTO v_row;

  -- 3. 同步 color_variants 的新 ID 行名（若无 ID 变更，name/year_range 变化也要反映到 color_variants）
  IF p_original_id IS NULL OR p_original_id = p_id THEN
    INSERT INTO public.color_variants (id, name, year_range)
    VALUES (p_id, p_name, p_year_range)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      year_range = EXCLUDED.year_range;
  END IF;

  RETURN NEXT v_row;
END;
$$;

-- 验证：函数应存在且属主可执行
SELECT proname AS function_name, prosecdef AS security_definer
FROM pg_proc
WHERE proname = 'save_variant_with_relink';

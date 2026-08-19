-- =====================================================================
-- 迁移：formulas 加 image_url + 更新 save_formula_with_components RPC
-- 背景：Data Management → Formulas 面板新增"颜色参考图（OEM 车体照片）"
--       上传/替换能力。图片存放在 Supabase Storage 公开桶 formula-images，
--       URL 字符串写入 formulas.image_url。显示优先级链：formula.image_url
--       → /images/colors/{color_id}.jpg → /images/colors/{CODE}.jpg → hex 色块。
--
--       save_formula_with_components 同时接受 p_image_url 参数；
--       创建/更新时一并写入。空字符串视为 NULL（与 DB 层 X NULL 兼容）。
--
-- 用法：Supabase Dashboard → SQL Editor → 粘贴 → Run（幂等）
-- 注意：与 20260812000000_save_formula_transaction.sql 配套，需放在其后执行。
--       函数以迁移执行者（supabase_admin/postgres）为属主，
--       属主天然绕过 RLS；调用方为服务端 getSupabaseAdmin()（service_role，BYPASSRLS）。
-- =====================================================================

-- 1. 加列
ALTER TABLE public.formulas ADD COLUMN IF NOT EXISTS image_url TEXT;
COMMENT ON COLUMN public.formulas.image_url IS 'OEM 颜色参考图 URL（Supabase Storage 公开桶 formula-images）';

-- 2. 更新 RPC：接受 p_image_url 参数；空串视为 NULL
CREATE OR REPLACE FUNCTION public.save_formula_with_components(
  p_id TEXT,
  p_color_id TEXT,
  p_variant_id TEXT,
  p_version TEXT,
  p_paint_system TEXT,
  p_formula_type TEXT,
  p_notes TEXT,
  p_components JSONB,
  p_image_url TEXT DEFAULT NULL,
  p_is_new BOOLEAN DEFAULT FALSE
) RETURNS SETOF public.formulas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.formulas;
  v_image_url TEXT := NULLIF(btrim(COALESCE(p_image_url, '')), '');
BEGIN
  -- 1. 主行写入（单条语句，事务内）
  IF p_is_new THEN
    -- 创建语义：ID 已存在时报 23505，绝不静默覆盖
    INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes, image_url)
    VALUES (p_id, p_color_id, p_variant_id, p_version, p_paint_system, p_formula_type, p_notes, v_image_url)
    ON CONFLICT (id) DO NOTHING
    RETURNING * INTO v_row;
    IF v_row IS NULL THEN
      RAISE EXCEPTION 'formula id % already exists', p_id USING ERRCODE = '23505';
    END IF;
  ELSE
    -- 更新语义：存在则全字段更新
    INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes, image_url)
    VALUES (p_id, p_color_id, p_variant_id, p_version, p_paint_system, p_formula_type, p_notes, v_image_url)
    ON CONFLICT (id) DO UPDATE SET
      color_id = EXCLUDED.color_id,
      variant_id = EXCLUDED.variant_id,
      version = EXCLUDED.version,
      paint_system = EXCLUDED.paint_system,
      formula_type = EXCLUDED.formula_type,
      notes = EXCLUDED.notes,
      image_url = EXCLUDED.image_url
    RETURNING * INTO v_row;
  END IF;

  -- 2. 全量同步组件：先删后插（id 为 SERIAL 自增，无稳定客户端 id）
  DELETE FROM public.formula_components WHERE formula_id = p_id;

  -- 3. 插入新组件；grams_per_100g 始终从 percentage 派生，杜绝两列不一致
  IF jsonb_typeof(p_components) = 'array' AND jsonb_array_length(p_components) > 0 THEN
    INSERT INTO public.formula_components
      (formula_id, toner_code, toner_name, percentage, grams_per_100g, density, rgb_r, rgb_g, rgb_b, component_group)
    SELECT
      p_id,
      comp->>'toner_code',
      comp->>'toner_name',
      (comp->>'percentage')::numeric,
      (comp->>'percentage')::numeric,
      (comp->>'density')::numeric,
      (comp->>'rgb_r')::integer,
      (comp->>'rgb_g')::integer,
      (comp->>'rgb_b')::integer,
      CASE
        WHEN comp ? 'component_group' AND comp->>'component_group' IS NOT NULL
        THEN comp->>'component_group' ELSE NULL
      END
    FROM jsonb_array_elements(p_components) AS comp;
  END IF;

  RETURN NEXT v_row;
END;
$$;

-- 3. 验证：函数应存在且属主可执行
SELECT proname AS function_name, prosecdef AS security_definer
FROM pg_proc
WHERE proname = 'save_formula_with_components';

-- 4. 刷新 schema cache（让 PostgREST 立即识别新列）
NOTIFY pgrst, 'reload schema';

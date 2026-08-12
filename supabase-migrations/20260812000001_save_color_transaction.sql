-- =====================================================================
-- 迁移：save_color 事务化 — 颜色主行 + 变体映射 + 年份全量同步改为单个 DB 事务
-- 背景：此前 saveColor 是 4 步顺序调用（写主行 → upsert color_variants → 删旧映射 → 插新映射），
--       年份由 route 层另行调 saveColorYears（删后插）。中途失败会留半成品
--       （丢变体关联 / 丢年份 / 主行与映射不一致），且漏传 years 时旧年份不清理（残留）。
--       本迁移把全部步骤收进一个 RPC 函数（SECURITY DEFINER，事务内执行），
--       创建路径（p_is_new=true）用 INSERT ON CONFLICT DO NOTHING 防并发撞 ID 静默覆盖。
-- 用法：Supabase Dashboard → SQL Editor → 粘贴 → Run（幂等，CREATE OR REPLACE 可重复执行）
-- =====================================================================

CREATE OR REPLACE FUNCTION public.save_color_with_components(
  p_id TEXT,
  p_make_id TEXT,
  p_color_code TEXT,
  p_color_name TEXT,
  p_color_type TEXT[],
  p_hex_preview TEXT,
  p_car_model TEXT,
  p_variant_ids TEXT[],
  p_years JSONB,
  p_is_new BOOLEAN DEFAULT FALSE
) RETURNS SETOF public.colors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.colors;
BEGIN
  -- 1. 颜色主行写入（单条语句，事务内）
  IF p_is_new THEN
    -- 创建语义：ID 已存在时报 23505，绝不静默覆盖
    INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview, car_model)
    VALUES (p_id, p_make_id, p_color_code, p_color_name, p_color_type, p_hex_preview, p_car_model)
    ON CONFLICT (id) DO NOTHING
    RETURNING * INTO v_row;
    IF v_row IS NULL THEN
      RAISE EXCEPTION 'color id % already exists', p_id USING ERRCODE = '23505';
    END IF;
  ELSE
    -- 更新语义：存在则全字段更新
    INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview, car_model)
    VALUES (p_id, p_make_id, p_color_code, p_color_name, p_color_type, p_hex_preview, p_car_model)
    ON CONFLICT (id) DO UPDATE SET
      make_id = EXCLUDED.make_id,
      color_code = EXCLUDED.color_code,
      color_name = EXCLUDED.color_name,
      color_type = EXCLUDED.color_type,
      hex_preview = EXCLUDED.hex_preview,
      car_model = EXCLUDED.car_model
    RETURNING * INTO v_row;
  END IF;

  -- 2. 同步 color_variants：变体真名从 formula_types 查（空名回退到 ID，防覆盖共享变体名）
  IF array_length(p_variant_ids, 1) > 0 THEN
    INSERT INTO public.color_variants (id, name, year_range)
    SELECT
      vid,
      COALESCE(NULLIF(ft.name::text, ''), vid),
      COALESCE(ft.year_range, '')
    FROM unnest(p_variant_ids) AS vid
    LEFT JOIN public.formula_types ft ON ft.id = vid
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      year_range = EXCLUDED.year_range;
  END IF;

  -- 3. 清理旧映射 + 写入新映射（多对多全量同步）
  DELETE FROM public.color_variant_map WHERE color_id = p_id;
  IF array_length(p_variant_ids, 1) > 0 THEN
    INSERT INTO public.color_variant_map (color_id, variant_id)
    SELECT p_id, vid FROM unnest(p_variant_ids) AS vid;
  END IF;

  -- 4. 年份全量同步：删旧 + 插新（空数组 = 清空；单一年份 year_end 为 NULL）
  DELETE FROM public.color_years WHERE color_id = p_id;
  IF jsonb_typeof(p_years) = 'array' AND jsonb_array_length(p_years) > 0 THEN
    INSERT INTO public.color_years (color_id, year, year_end)
    SELECT
      p_id,
      (yr->>'year')::integer,
      (yr->>'year_end')::integer
    FROM jsonb_array_elements(p_years) AS yr;
  END IF;

  RETURN NEXT v_row;
END;
$$;

-- 验证：函数应存在且属主可执行
SELECT proname AS function_name, prosecdef AS security_definer
FROM pg_proc
WHERE proname = 'save_color_with_components';

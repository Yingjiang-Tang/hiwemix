-- =====================================================================
-- 一次性回填：把 color_variants 里被写坏的变体名/年份修复为真名
--
-- 背景：
--   管理后台「配方类型」Tab 写入 formula_types 表（存真名），
--   但保存颜色时曾用「写死 name = ID」的方式同步到 color_variants，
--   导致 color_variants.name 变成 '1'/'2'/'3'、year_range 变空。
--   前台展示读的是 color_variants（color_variant_map → color_variants），
--   所以显示成 '1'/'2'/'3'。
--
-- 本脚本：从 formula_types 取真名，回填 color_variants。
--   只更新 color_variants 两列（name / year_range），不碰任何其他表。
--
-- 在 Supabase Dashboard → SQL Editor 中执行，执行完可删除本文件。
-- =====================================================================

-- 回填 name 和 year_range：以 formula_types 为准
UPDATE public.color_variants cv
SET name       = COALESCE(NULLIF(ft.name, ''), cv.name),
    year_range = COALESCE(NULLIF(ft.year_range, ''), cv.year_range)
FROM public.formula_types ft
WHERE ft.id = cv.id;

-- 兜底：formula_types 中没有对应记录的变体，name 仍为 ID 的，直接按 ID 给可读名。
-- （如果你的 formula_types 里 id='1'/'2'/'3' 已存在且带真名，上一条 UPDATE 已覆盖，这条不会动它们。）
UPDATE public.color_variants cv
SET name = CASE cv.id
    WHEN '1' THEN 'Single Stage'
    WHEN '2' THEN 'Two Stages'
    WHEN '3' THEN 'Three Stages'
    ELSE cv.name
  END
WHERE cv.name IN ('1', '2', '3');

-- 验证：回填后应看到 Single Stage / Two Stages / Three Stages
SELECT id, name, year_range FROM public.color_variants ORDER BY id;

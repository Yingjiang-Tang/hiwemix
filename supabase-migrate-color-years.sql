-- =====================================================================
-- 迁移脚本：从 ColorVariant.year_range 迁移到 color_years 表
-- 功能：1. 创建 color_years 表
--       2. 从现有变体年份范围提取年份
--       3. 为没有年份数据的颜色随机分配年份
-- =====================================================================

-- Step0: 创建 color_years 表（如果不存在）
CREATE TABLE IF NOT EXISTS public.color_years (
  color_id TEXT NOT NULL REFERENCES public.colors(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  year_end INTEGER,
  PRIMARY KEY (color_id, year),
  CHECK (year >= 1900 AND year <= 2100),
  CHECK (year_end IS NULL OR (year_end >= year AND year_end <= 2100))
);

-- Step0b: 兼容已存在的库 —— 若表已存在但缺 year_end 列（旧版离散单年模型），补列；
--         已有数据按单一年份处理（year_end = NULL），与代码的区间模型对齐
ALTER TABLE public.color_years ADD COLUMN IF NOT EXISTS year_end INTEGER;
ALTER TABLE public.color_years DROP CONSTRAINT IF EXISTS color_years_year_end_check;
ALTER TABLE public.color_years ADD CONSTRAINT color_years_year_end_check
  CHECK (year_end IS NULL OR (year_end >= year AND year_end <= 2100));

COMMENT ON TABLE public.color_years IS '颜色-年份多对多关联表';
COMMENT ON COLUMN public.color_years.color_id IS '关联颜色 ID';
COMMENT ON COLUMN public.color_years.year IS '起始年份值';
COMMENT ON COLUMN public.color_years.year_end IS '结束年份（NULL 表示单一年份）';

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_color_years_color_id ON public.color_years (color_id);
CREATE INDEX IF NOT EXISTS idx_color_years_year ON public.color_years (year);

-- 启用 RLS
ALTER TABLE public.color_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS color_years_select_all ON public.color_years;
CREATE POLICY color_years_select_all ON public.color_years FOR SELECT TO public USING (true);

-- Step1: 从现有 ColorVariant.year_range 提取年份到 color_years
DO $$
DECLARE
  color_rec RECORD;
  variant_rec RECORD;
  year_min INTEGER;
  year_max INTEGER;
  year_val INTEGER;
BEGIN
  -- 遍历每个有关联变体的颜色
  FOR color_rec IN SELECT DISTINCT c.id
                    FROM colors c
                    JOIN color_variant_map cvm ON c.id = cvm.color_id
                    JOIN color_variants cv ON cvm.variant_id = cv.id
  LOOP
    -- 遍历该颜色关联的所有变体
    FOR variant_rec IN SELECT cv.year_range
                       FROM color_variants cv
                       JOIN color_variant_map cvm ON cv.id = cvm.variant_id
                       WHERE cvm.color_id = color_rec.id
                       AND cv.year_range IS NOT NULL
                       AND cv.year_range != ''
    LOOP
      -- 解析年份范围（格式："2018-2022" 或 "2020"）
      IF variant_rec.year_range ~ '^\d{4}-\d{4}$' THEN
        -- 年份范围："2018-2022"
        year_min := SPLIT_PART(variant_rec.year_range, '-', 1)::INTEGER;
        year_max := SPLIT_PART(variant_rec.year_range, '-', 2)::INTEGER;
        FOR year_val IN year_min..year_max LOOP
          INSERT INTO color_years (color_id, year)
          VALUES (color_rec.id, year_val)
          ON CONFLICT DO NOTHING;
        END LOOP;
      ELSIF variant_rec.year_range ~ '^\d{4}$' THEN
        -- 单个年份："2020"
        year_val := variant_rec.year_range::INTEGER;
        INSERT INTO color_years (color_id, year)
        VALUES (color_rec.id, year_val)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Step2: 为没有年份数据的颜色随机分配年份（用于演示）
DO $$
DECLARE
  color_rec RECORD;
  random_years INTEGER[];
  year_count INTEGER;
  i INTEGER;
  random_year INTEGER;
BEGIN
  -- 查找没有年份数据的颜色
  FOR color_rec IN SELECT c.id
                    FROM colors c
                    LEFT JOIN color_years cy ON c.id = cy.color_id
                    WHERE cy.color_id IS NULL
  LOOP
    -- 随机分配 1-3 个年份（范围：2000-2025）
    year_count := 1 + FLOOR(RANDOM() * 3)::INTEGER;
    random_years := ARRAY[];
    FOR i IN 1..year_count LOOP
      random_year := 2000 + FLOOR(RANDOM() * 26)::INTEGER;
      -- 避免重复
      IF NOT (random_year = ANY(random_years)) THEN
        random_years := array_append(random_years, random_year);
      END IF;
    END LOOP;
    -- 排序并插入
    FOR i IN 1..array_length(random_years, 1) LOOP
      INSERT INTO color_years (color_id, year)
      VALUES (color_rec.id, random_years[i])
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 验证迁移结果
DO $$
DECLARE
  total_colors INTEGER;
  colors_with_years INTEGER;
  total_years INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_colors FROM colors;
  SELECT COUNT(DISTINCT color_id) INTO colors_with_years FROM color_years;
  SELECT COUNT(*) INTO total_years FROM color_years;

  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  Total colors: %', total_colors;
  RAISE NOTICE '  Colors with years: %', colors_with_years;
  RAISE NOTICE '  Total year records: %', total_years;
END $$;

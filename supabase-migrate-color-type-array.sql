-- =====================================================================
-- 迁移脚本：color_type 从单值 TEXT 改为 TEXT[] 数组（支持多选）
-- 功能：1. 删除旧的单值 CHECK 约束
--       2. 已有单值用 USING ARRAY[color_type] 包成数组
--       3. 重建数组成员 CHECK 约束 + GIN 索引 + DEFAULT
-- 用法: Supabase Dashboard -> SQL Editor -> 粘贴 -> Run
-- =====================================================================

-- Step0: 删除旧约束（列级 CHECK 约束名默认 colors_color_type_check）
ALTER TABLE public.colors DROP CONSTRAINT IF EXISTS colors_color_type_check;

-- Step1: 类型改为 TEXT[]，已有单值自动包成单元素数组
ALTER TABLE public.colors
  ALTER COLUMN color_type TYPE TEXT[] USING ARRAY[color_type]::text[];

-- Step2: 设置 DEFAULT 并重建数组成员 CHECK 约束
ALTER TABLE public.colors ALTER COLUMN color_type SET DEFAULT '{}';
ALTER TABLE public.colors ADD CONSTRAINT colors_color_type_check
  CHECK (color_type <@ ARRAY['solid', 'metallic', 'pearl', 'matte', 'candy', 'special']::text[]);

-- Step3: 把普通 B-tree 索引换成 GIN 索引（数组包含查询）
DROP INDEX IF EXISTS idx_colors_color_type;
CREATE INDEX idx_colors_color_type ON public.colors USING GIN (color_type);

-- Step4: 刷新 PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 验证
DO $$
DECLARE
  total INTEGER;
  multi INTEGER;
  bad INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM colors;
  SELECT COUNT(*) INTO multi FROM colors WHERE array_length(color_type, 1) > 1;
  SELECT COUNT(*) INTO bad FROM colors WHERE NOT (color_type <@ ARRAY['solid','metallic','pearl','matte','candy','special']::text[]);
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  Total colors: %', total;
  RAISE NOTICE '  Colors with multiple types: %', multi;
  RAISE NOTICE '  Colors violating CHECK: %', bad;
END $$;

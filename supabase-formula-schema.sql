-- =====================================================================
-- 配方检索站 - Supabase 关系型建表脚本
-- 说明: 删除误建的产品表 + 建立配方关系型表，幂等可重复执行
-- 兼容: PostgreSQL 15+ (Supabase)
-- 用法: Supabase Dashboard → SQL Editor → 粘贴 → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. 复用触发器函数（与 users 表共用）
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 1. 删除之前误建的产品展示表（方向纠正）
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS public.product_tags CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;

-- ---------------------------------------------------------------------
-- 2. brands: 车辆品牌（对应 CarMake）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL
    CHECK (region IN ('JPN', 'EUR', 'USA', 'CHN', 'KOR'))
);

COMMENT ON TABLE public.brands IS '车辆品牌表';
COMMENT ON COLUMN public.brands.id IS '品牌 slug，如 toyota';
COMMENT ON COLUMN public.brands.region IS '产地';

-- ---------------------------------------------------------------------
-- 3. color_variants: 颜色变体（独立共享，多对多关联到 colors）
--    例：v_std(Standard) 被多个颜色引用
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.color_variants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  year_range TEXT NOT NULL
);

COMMENT ON TABLE public.color_variants IS '颜色变体表（跨颜色共享）';
COMMENT ON COLUMN public.color_variants.year_range IS '年份范围，如 2020-2026';

-- ---------------------------------------------------------------------
-- 4. colors: 颜色（对应 Color，不含嵌套 variants）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.colors (
  id TEXT PRIMARY KEY,
  make_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  color_code TEXT NOT NULL,
  color_name TEXT NOT NULL,
  color_type TEXT[] NOT NULL DEFAULT '{}'
    CHECK (color_type <@ ARRAY['solid', 'metallic', 'pearl', 'matte', 'candy', 'special']::text[]),
  hex_preview TEXT
);

COMMENT ON TABLE public.colors IS '颜色表';
COMMENT ON COLUMN public.colors.make_id IS '所属品牌 ID';
COMMENT ON COLUMN public.colors.color_type IS '颜色类型数组（可多选）';
COMMENT ON COLUMN public.colors.hex_preview IS '预览色 hex，如 #F8F8F5';

-- ---------------------------------------------------------------------
-- 5. color_variant_map: 颜色-变体多对多关联
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.color_variant_map (
  color_id TEXT NOT NULL REFERENCES public.colors(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES public.color_variants(id) ON DELETE CASCADE,
  PRIMARY KEY (color_id, variant_id)
);

COMMENT ON TABLE public.color_variant_map IS '颜色-变体多对多关联表';

-- ---------------------------------------------------------------------
-- 6. formulas: 调漆配方（对应 Formula，不含嵌套 components）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.formulas (
  id TEXT PRIMARY KEY,
  color_id TEXT NOT NULL REFERENCES public.colors(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES public.color_variants(id) ON DELETE SET NULL,
  version TEXT NOT NULL DEFAULT 'v1',
  paint_system TEXT NOT NULL DEFAULT '2K'
    CHECK (paint_system IN ('1K', '2K')),
  formula_type TEXT NOT NULL DEFAULT 'Single Stage'
    CHECK (formula_type IN ('Single Stage', 'Two Stages', 'Three Stages')),
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.formulas IS '调漆配方表';
COMMENT ON COLUMN public.formulas.variant_id IS '关联变体 ID，变体删除时置空';

-- updated_at 自动更新触发器
DROP TRIGGER IF EXISTS update_formulas_updated_at ON public.formulas;
CREATE TRIGGER update_formulas_updated_at
  BEFORE UPDATE ON public.formulas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 7. formula_components: 配方色母组件（对应 FormulaComponent）
--    FormulaComponent 无独立 id，用 SERIAL 自增
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.formula_components (
  id SERIAL PRIMARY KEY,
  formula_id TEXT NOT NULL REFERENCES public.formulas(id) ON DELETE CASCADE,
  toner_code TEXT NOT NULL,
  toner_name TEXT NOT NULL,
  percentage NUMERIC(8,3) NOT NULL DEFAULT 0,
  grams_per_100g NUMERIC(8,3) NOT NULL DEFAULT 0,
  density NUMERIC(8,3),
  rgb_r INTEGER,
  rgb_g INTEGER,
  rgb_b INTEGER,
  component_group TEXT CHECK (component_group IN ('Pearl Paint', 'Ground Paint'))
);

COMMENT ON TABLE public.formula_components IS '配方色母组件表';
COMMENT ON COLUMN public.formula_components.percentage IS '在总配方中的百分比';
COMMENT ON COLUMN public.formula_components.grams_per_100g IS '每 100g 总漆用量克数';

-- ---------------------------------------------------------------------
-- 8. settings: 系统设置（单行，对应 AppSettings）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  finishes JSONB NOT NULL DEFAULT '[]'::jsonb,
  types JSONB NOT NULL DEFAULT '[]'::jsonb,
  year_min INTEGER NOT NULL DEFAULT 1990,
  year_max INTEGER NOT NULL DEFAULT 2026
);

COMMENT ON TABLE public.settings IS '系统设置表（单行，id 固定为 1）';

-- ---------------------------------------------------------------------
-- 9. 索引（筛选常用列，支撑服务端多条件组合筛选）
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_colors_make_id    ON public.colors (make_id);
CREATE INDEX IF NOT EXISTS idx_colors_color_type  ON public.colors USING GIN (color_type);
CREATE INDEX IF NOT EXISTS idx_colors_color_code  ON public.colors (color_code);
CREATE INDEX IF NOT EXISTS idx_formulas_color_id  ON public.formulas (color_id);
CREATE INDEX IF NOT EXISTS idx_formulas_variant_id ON public.formulas (variant_id);
CREATE INDEX IF NOT EXISTS idx_components_formula_id ON public.formula_components (formula_id);
CREATE INDEX IF NOT EXISTS idx_cvm_color_id  ON public.color_variant_map (color_id);
CREATE INDEX IF NOT EXISTS idx_cvm_variant_id ON public.color_variant_map (variant_id);

-- ---------------------------------------------------------------------
-- 10. RLS 行级安全策略
--     设计: SELECT 对所有人开放（公开浏览）；
--          写操作仅 service_role（BYPASSRLS），走 Next.js API 服务端
-- ---------------------------------------------------------------------
ALTER TABLE public.brands             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.color_variants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.color_variant_map  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formula_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brands_select_all ON public.brands;
CREATE POLICY brands_select_all ON public.brands FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS color_variants_select_all ON public.color_variants;
CREATE POLICY color_variants_select_all ON public.color_variants FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS colors_select_all ON public.colors;
CREATE POLICY colors_select_all ON public.colors FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS color_variant_map_select_all ON public.color_variant_map;
CREATE POLICY color_variant_map_select_all ON public.color_variant_map FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS formulas_select_all ON public.formulas;
CREATE POLICY formulas_select_all ON public.formulas FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS formula_components_select_all ON public.formula_components;
CREATE POLICY formula_components_select_all ON public.formula_components FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS settings_select_all ON public.settings;
CREATE POLICY settings_select_all ON public.settings FOR SELECT TO public USING (true);

-- ---------------------------------------------------------------------
-- 10.5 guide_categories + guides: TDS 产品手册（重新设计：产品族分类）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guide_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,              -- 英文分类名
  name_zh TEXT NOT NULL,           -- 中文分类名
  description TEXT,                -- 英文简介
  description_zh TEXT,             -- 中文简介
  icon TEXT,                       -- lucide 图标名
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guides (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES public.guide_categories(id) ON DELETE RESTRICT,
  product_sku TEXT,                -- 产品 SKU（可选）
  version TEXT NOT NULL DEFAULT 'v1.0',
  doc_type TEXT NOT NULL DEFAULT 'tds',  -- 'tds' | 'msds' | 'sds' | 'manual'
  title TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  summary TEXT,                    -- 英文摘要
  summary_zh TEXT,                 -- 中文摘要
  cover_image TEXT,                -- Supabase Storage 公开 URL
  content TEXT NOT NULL DEFAULT '',     -- 英文 Markdown
  content_zh TEXT NOT NULL DEFAULT '',  -- 中文 Markdown
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.guide_categories IS 'TDS 产品族分类表';
COMMENT ON TABLE public.guides IS 'TDS 文档主表';

DROP TRIGGER IF EXISTS update_guides_updated_at ON public.guides;
CREATE TRIGGER update_guides_updated_at
  BEFORE UPDATE ON public.guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_guides_category_id ON public.guides (category_id);
CREATE INDEX IF NOT EXISTS idx_guides_doc_type ON public.guides (doc_type);
CREATE INDEX IF NOT EXISTS idx_guides_published ON public.guides (is_published);

ALTER TABLE public.guide_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guide_categories_select_all ON public.guide_categories;
CREATE POLICY guide_categories_select_all ON public.guide_categories FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS guides_select_all ON public.guides;
CREATE POLICY guides_select_all ON public.guides FOR SELECT TO public USING (true);

-- ---------------------------------------------------------------------
-- 12. color_years: 颜色-年份多对多关联（新增）
--     与代码模型一致：year 为起始年，year_end 为可选结束年（NULL=单年）。
--     单一年份存 (year, year_end NULL)；区间存 (year, year_end)。
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.color_years (
  color_id TEXT NOT NULL REFERENCES public.colors(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  year_end INTEGER,
  PRIMARY KEY (color_id, year),
  CHECK (year >= 1900 AND year <= 2100),
  CHECK (year_end IS NULL OR (year_end >= year AND year_end <= 2100))
);

COMMENT ON TABLE public.color_years IS '颜色-年份多对多关联表';
COMMENT ON COLUMN public.color_years.color_id IS '关联颜色 ID';
COMMENT ON COLUMN public.color_years.year IS '起始年份值';
COMMENT ON COLUMN public.color_years.year_end IS '结束年份（NULL 表示单一年份）';

-- 为 formulas 表添加 year 和 color_name 字段（可选，用于反规范化搜索）
ALTER TABLE public.formulas ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE public.formulas ADD COLUMN IF NOT EXISTS color_name TEXT;

-- ---------------------------------------------------------------------
-- 13. 索引 - color_years
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_color_years_color_id ON public.color_years (color_id);
CREATE INDEX IF NOT EXISTS idx_color_years_year ON public.color_years (year);

-- ---------------------------------------------------------------------
-- 14. RLS 行级安全策略 - color_years
-- ---------------------------------------------------------------------
ALTER TABLE public.color_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS color_years_select_all ON public.color_years;
CREATE POLICY color_years_select_all ON public.color_years FOR SELECT TO public USING (true);

-- ---------------------------------------------------------------------
-- 15. 刷新 PostgREST schema cache（让 REST API 立即认识新建的表）
-- ---------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

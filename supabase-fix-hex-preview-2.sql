-- =====================================================================
-- 修正 colors 表 hex_preview 第二波：白色变体 & 细微色差（14 条）
-- 只改 hex_preview 字段，color_code / color_name / 配方一律不动
-- 用法: Supabase Dashboard → SQL Editor → 粘贴 → Run
-- =====================================================================

-- ═══════════════════════════════════════════════════════════════════
-- 白色/珍珠白变体：纯白 → 带正确暖/冷底调（9 条）
-- ═══════════════════════════════════════════════════════════════════

-- 300 BMW Alpine White III：偏粉 → 明亮冷白
UPDATE public.colors SET hex_preview = '#F0F2F0' WHERE id = 'bmw_300';

-- A96 BMW Mineral White Metallic：纯白 → 暖白金属漆
UPDATE public.colors SET hex_preview = '#F5F0EB' WHERE id = 'bmw_a96';

-- TW3 Hyundai Cream White：纯白 → 奶油白暖调
UPDATE public.colors SET hex_preview = '#F5F0E0' WHERE id = 'hyundai_tw3_pearl';

-- WW2 Hyundai Cream White / Hyper White：纯白 → 奶油白暖调
UPDATE public.colors SET hex_preview = '#F5F0E0' WHERE id = 'hyundai_ww2_pearl';

-- UG Ford Cobalt White Pearl：纯白 → 带微蓝底调
UPDATE public.colors SET hex_preview = '#F0F2F5' WHERE id = 'ford_ug_pearl';

-- WL005 Wuling Milky White：纯白 → 牛奶白微暖
UPDATE public.colors SET hex_preview = '#F8F5F0' WHERE id = 'wuling_wl005_pearl';

-- 5BWG Changan Ford White Platinum：纯白 → 白金色微暖金属
UPDATE public.colors SET hex_preview = '#EDE9E3' WHERE id = 'changan-ford_5bwg_solid';

-- RBC Hyundai Polar White：纯白 → 极地白微冷
UPDATE public.colors SET hex_preview = '#F5F5F0' WHERE id = 'hyundai_rbc_solid';

-- 59VJ Changan Ford White Platinum-MET：太灰暗 → 白金色更亮
UPDATE public.colors SET hex_preview = '#ECE8E3' WHERE id = 'changan-ford_59vj';

-- ═══════════════════════════════════════════════════════════════════
-- 其他色系偏差（5 条）
-- ═══════════════════════════════════════════════════════════════════

-- LZ7S Audi Daytona Gray Pearl：偏深 → 中灰珠光（Audi 标准色）
UPDATE public.colors SET hex_preview = '#474B50' WHERE id = 'audi_lz7s_pearl';

-- 257 Geely Mocha Red：太鲜艳亮红 → 摩卡暗红
UPDATE public.colors SET hex_preview = '#8B2020' WHERE id = 'geely_257';

-- E44 Geely Shero（粉色）：太淡 → 柔和粉
UPDATE public.colors SET hex_preview = '#F0B8B8' WHERE id = 'geely_e44';

-- 5M Wuling Light Beige：基本是白 → 浅米色暖调
UPDATE public.colors SET hex_preview = '#F0E8D5' WHERE id = 'wuling_5m_metallic';

-- UBS Hyundai Stone Beige：纯灰无暖调 → 石米色灰棕
UPDATE public.colors SET hex_preview = '#C5BAA5' WHERE id = 'hyundai_ubs_metallic';

-- ═══════════════════════════════════════════════════════════════════
-- 刷新 PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';

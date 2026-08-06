-- =====================================================================
-- 修正 colors 表中 hex_preview 与实际颜色名不匹配的记录
-- 只改 hex_preview 字段，color_code / color_name / 配方一律不动
-- 用法: Supabase Dashboard → SQL Editor → 粘贴 → Run
-- =====================================================================

-- ═══════════════════════════════════════════════════════════════════
-- 严重错误：hex 与颜色名完全矛盾（9 条）
-- ═══════════════════════════════════════════════════════════════════

-- 1F7 Classic Silver：当前 #fef1f1（粉色）→ 银色
UPDATE public.colors SET hex_preview = '#C0C0C0' WHERE id = 'toyota_1f7_metallic';

-- 1G2 Falcon Gray：当前 #f31616（亮红）→ 灰色
UPDATE public.colors SET hex_preview = '#8A8A8A' WHERE id = 'toyota_1g2_metallic';

-- 209 Black Sand Pearl（Highlander）：当前 #30a1f8（亮蓝）→ 黑色珍珠
UPDATE public.colors SET hex_preview = '#1C1C1E' WHERE id = 'toyota_209_pearl-3';

-- 218 Black（C-HR）：当前 #FFFFFF（纯白）→ 黑色
UPDATE public.colors SET hex_preview = '#0D0D0D' WHERE id = 'toyota_218_pearl';

-- C1M Phytonic Blue Metallic（BMW）：当前 #FFFFFF（纯白）→ 深海蓝
UPDATE public.colors SET hex_preview = '#1E3B5A' WHERE id = 'bmw_c1m';

-- G28 Moler Beach Silver（Geely 嘉际）：当前 #383838（深灰）→ 银色
UPDATE public.colors SET hex_preview = '#C0C0C8' WHERE id = 'geely_g28';

-- G29 Bolivia Blue（Geely 嘉际）：当前 #FFFFFF（纯白）→ 蓝色
UPDATE public.colors SET hex_preview = '#3A6A9A' WHERE id = 'geely_g29';

-- F31 Blazing Gold（Geely 领克 03）：当前 #FFFFFF（纯白）→ 金色
UPDATE public.colors SET hex_preview = '#C5A040' WHERE id = 'geely_f31';

-- K20 Mica Red（Geely 帝豪 EV）：当前 #FFFFFF（纯白）→ 云母红
UPDATE public.colors SET hex_preview = '#8B1A1A' WHERE id = 'geely_k20';

-- ═══════════════════════════════════════════════════════════════════
-- 中度偏差：色调方向对但差很远（7 条）
-- ═══════════════════════════════════════════════════════════════════

-- 34K Snowflake White Pearl（Mazda）：当前 #99b8e1（淡蓝）→ 白色珍珠
UPDATE public.colors SET hex_preview = '#F2F0ED' WHERE id = 'mazda_34k_pearl';

-- A2B Ebony Black（Hyundai Elantra）：当前 #364859（蓝灰）→ 乌木黑
UPDATE public.colors SET hex_preview = '#1A1A1E' WHERE id = 'hyundai_a2b_solid';

-- A7 Desert Gold（Wuling 宏光）：当前 #fcff33（亮黄）→ 沙漠金
UPDATE public.colors SET hex_preview = '#C5A355' WHERE id = 'wuling_a7_metallic';

-- T2Y Shining Gold（Hyundai Sonata 8）：当前 #ffea00（亮黄）→ 闪耀金
UPDATE public.colors SET hex_preview = '#C8A840' WHERE id = 'hyundai_t2y_metallic';

-- XB2 Oxford Blue（Hyundai Sonata）：当前 #429eff（天蓝）→ 牛津深蓝
UPDATE public.colors SET hex_preview = '#1C2E50' WHERE id = 'hyundai_xb2_pearl';

-- UR3 Blue Passion（Hyundai LA FESTA）：当前 #9ef9ff（青）→ 激情蓝
UPDATE public.colors SET hex_preview = '#2A5A8A' WHERE id = 'hyundai_ur3_pearl';

-- C4F Arctic Race Blue（BMW）：当前 #7de8ff（青）→ 北极竞赛蓝
UPDATE public.colors SET hex_preview = '#4A7AAA' WHERE id = 'bmw_c4f';

-- ═══════════════════════════════════════════════════════════════════
-- 刷新 PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';

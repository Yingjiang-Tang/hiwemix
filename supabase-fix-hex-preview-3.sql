-- =====================================================================
-- 修正 colors 表 hex_preview 第三波：从权威来源查到的 OEM 码标准 hex（5 条）
-- 只改 hex_preview 字段，color_code / color_name / 配方一律不动
-- 用法: Supabase Dashboard → SQL Editor → 粘贴 → Run
--
-- 来源说明：每条均来自 web 检索命中"明确给出 hex/RGB 且绑定 OEM 色码
-- 或对应车系官方色名"的页面，来源 URL 见各行注释。
-- 其余 53 个无照片色码未找到可引用的确切 hex，保留当前值，未在此脚本中。
-- =====================================================================

-- ═══════════════════════════════════════════════════════════════════
-- Subaru
-- ═══════════════════════════════════════════════════════════════════

-- 02C World Rally Blue（Impreza WRX/BRZ/Forester）：深藏青 #183049 → WRB 蓝
-- 来源: Zero Paints ZP-1041 "Subaru World Rally Blue (02C)" 模型漆色卡
--   https://www.diecastmates.com/colors/zero-paints-zp-1065--658/zp-1041-subaru-world-rally-blue-02c-lacquer-metallic--24043
-- 注意: 该 hex 由模型漆厂商标注，偏饱和；与社区流传值（如 #1A4B8F 一类）差异较大，请按需取舍。
-- 02C 的 id 未在代码库确认，故用 make_id + color_code 定位；若命中多条请改为按 id。
UPDATE public.colors SET hex_preview = '#0736F8' WHERE make_id = 'subaru' AND color_code = '02C';

-- ═══════════════════════════════════════════════════════════════════
-- BMW / Audi
-- ═══════════════════════════════════════════════════════════════════

-- 300 Alpine White III（1/3/5/7/X3/X5）：近白 #F0F2F0 → 官方白 #FFFFFF
-- 来源: https://www.paintcalculators.com/car-colour-codes/bmw/
-- 注意: 改动细微（本就在白色系内），如偏好略带冷调的 #F0F2F0 可保留。
UPDATE public.colors SET hex_preview = '#FFFFFF' WHERE id = 'bmw_300';

-- LY9T Mythos Black（A4-A8/Q5/R8）：纯黑 #000000 → 近黑（Mythos Black 非纯黑）
-- 来源: https://www.paintcalculators.com/car-colour-codes/audi/
-- LY9T 的 id 未在代码库确认，故用 make_id + color_code 定位。
UPDATE public.colors SET hex_preview = '#0C0C0C' WHERE make_id = 'audi' AND color_code = 'LY9T';

-- LZ7S Daytona Gray Pearl（A4L/Q5L/R8）：中灰 #474B50 → #515555
-- 来源: https://encycolorpedia.com/515555 （颜色名匹配，非严格 OEM 码绑定，参考级）
UPDATE public.colors SET hex_preview = '#515555' WHERE id = 'audi_lz7s_pearl';

-- ═══════════════════════════════════════════════════════════════════
-- Geely
-- ═══════════════════════════════════════════════════════════════════

-- G28 Moler Beach Silver（嘉际）：银灰 #C0C0C8 → #CACED5
-- 来源: 易车网 VR 配置页 colorRgb=#CACED5（嘉际外观色）
--   http://photo.yiche.com/vr/outer/?albumId=3561&colorRgb=%23CACED5
UPDATE public.colors SET hex_preview = '#CACED5' WHERE id = 'geely_g28';

-- ═══════════════════════════════════════════════════════════════════
-- 刷新 PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';

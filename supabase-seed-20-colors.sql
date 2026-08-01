-- =====================================================================
-- 20 个随机颜色 + 配方 + 色母组件 (幂等，可重复执行)
-- 用法: Supabase Dashboard -> SQL Editor -> 粘贴 -> Run
-- =====================================================================

-- 0. 确保品牌存在（外键约束要求 make_id 必须先存在于 brands 表）
INSERT INTO public.brands (id, name, region) VALUES ('toyota', 'Toyota', 'JPN') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.brands (id, name, region) VALUES ('bmw', 'BMW', 'EUR') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.brands (id, name, region) VALUES ('mercedes', 'Mercedes-Benz', 'EUR') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.brands (id, name, region) VALUES ('audi', 'Audi', 'EUR') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.brands (id, name, region) VALUES ('honda', 'Honda', 'JPN') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.brands (id, name, region) VALUES ('ford', 'Ford', 'USA') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.brands (id, name, region) VALUES ('hyundai', 'Hyundai', 'KOR') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.brands (id, name, region) VALUES ('kia', 'Kia', 'KOR') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.brands (id, name, region) VALUES ('volkswagen', 'Volkswagen', 'EUR') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.brands (id, name, region) VALUES ('nissan', 'Nissan', 'JPN') ON CONFLICT (id) DO NOTHING;

-- 1. 确保变体存在
INSERT INTO public.color_variants (id, name, year_range) VALUES ('v_std', 'Standard', '2018-2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variants (id, name, year_range) VALUES ('v_pearl', 'Pearl Effect', '2020-2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variants (id, name, year_range) VALUES ('v_matte', 'Matte Finish', '2021-2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variants (id, name, year_range) VALUES ('v_stage1', 'Stage 1', '2015-2020') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variants (id, name, year_range) VALUES ('v_stage2', 'Stage 2', '2019-2024') ON CONFLICT (id) DO NOTHING;

-- 2. 插入 20 个颜色 + 变体映射
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('bmw_101', 'bmw', 'W381', 'Crystal White', ARRAY['solid'], '#F8F8F5') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('bmw_101', 'v_std') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('volkswagen_102', 'volkswagen', '0559', 'Phantom Black', ARRAY['solid'], '#0D0D0D') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('volkswagen_102', 'v_stage1') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('nissan_103', 'nissan', 'NH847', 'Cosmos Silver', ARRAY['metallic'], '#C0C0C8') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('nissan_103', 'v_matte') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('honda_104', 'honda', '0987', 'Ocean Blue', ARRAY['metallic'], '#1A3A6B') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('honda_104', 'v_std') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('nissan_105', 'nissan', 'R846', 'Sunset Red', ARRAY['solid'], '#B8281A') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('nissan_105', 'v_pearl') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('ford_106', 'ford', 'B167', 'Emerald Green', ARRAY['metallic'], '#1A6B3A') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('ford_106', 'v_stage1') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('volkswagen_107', 'volkswagen', 'W698', 'Royal Purple', ARRAY['pearl'], '#4A2050') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('volkswagen_107', 'v_matte') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('hyundai_108', 'hyundai', 'NH494', 'Desert Beige', ARRAY['solid'], '#D4C5A0') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('hyundai_108', 'v_stage2') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('honda_109', 'honda', '0619', 'Midnight Blue', ARRAY['solid'], '#0A1A3A') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('honda_109', 'v_stage2') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('toyota_110', 'toyota', 'B999', 'Champagne Gold', ARRAY['metallic'], '#C5A35A') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('toyota_110', 'v_std') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('volkswagen_111', 'volkswagen', '0775', 'Pearl White', ARRAY['pearl'], '#FFF5EE') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('volkswagen_111', 'v_pearl') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('volkswagen_112', 'volkswagen', 'NH353', 'Graphite Grey', ARRAY['matte'], '#3A3A3E') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('volkswagen_112', 'v_stage1') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('toyota_113', 'toyota', 'NH132', 'Fire Orange', ARRAY['solid'], '#E04A00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('toyota_113', 'v_pearl') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('kia_114', 'kia', '0196', 'Sky Blue', ARRAY['pearl'], '#87CEEB') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('kia_114', 'v_stage1') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('ford_115', 'ford', '0296', 'Bronze Brown', ARRAY['metallic'], '#8B4513') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('ford_115', 'v_std') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('volkswagen_116', 'volkswagen', 'NH767', 'Crimson Red', ARRAY['candy'], '#DC143C') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('volkswagen_116', 'v_std') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('hyundai_117', 'hyundai', 'G371', 'Ice Silver', ARRAY['metallic'], '#E8E8E8') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('hyundai_117', 'v_std') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('toyota_118', 'toyota', 'G614', 'Volcanic Grey', ARRAY['matte'], '#2A2A2E') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('toyota_118', 'v_stage2') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('nissan_119', 'nissan', 'NH734', 'Tropical Green', ARRAY['candy'], '#00A86B') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('nissan_119', 'v_stage2') ON CONFLICT DO NOTHING;
INSERT INTO public.colors (id, make_id, color_code, color_name, color_type, hex_preview) VALUES
  ('bmw_120', 'bmw', 'G736', 'Arctic White', ARRAY['pearl'], '#FFFAF0') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.color_variant_map (color_id, variant_id) VALUES ('bmw_120', 'v_std') ON CONFLICT DO NOTHING;

-- 3. 插入配方
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_bmw_101_v_std', 'bmw_101', 'v_std', 'v1', '1K', 'Basecoat', '建议喷涂2遍底色') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_volkswagen_102_v_stage1', 'volkswagen_102', 'v_stage1', 'v1', '2K', 'Basecoat', '建议喷涂2遍底色') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_nissan_103_v_matte', 'nissan_103', 'v_matte', 'v3', '2K', 'Basecoat', '') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_honda_104_v_std', 'honda_104', 'v_std', 'v2', '1K', 'Basecoat', '注意干燥时间') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_nissan_105_v_pearl', 'nissan_105', 'v_pearl', 'v1', '1K', 'Basecoat', '需要罩光油') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_ford_106_v_stage1', 'ford_106', 'v_stage1', 'v3', '1K', 'Basecoat', '注意干燥时间') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_volkswagen_107_v_matte', 'volkswagen_107', 'v_matte', 'v3', '2K', 'Basecoat', '需要罩光油') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_hyundai_108_v_stage2', 'hyundai_108', 'v_stage2', 'v3', '2K', 'Basecoat', '需要罩光油') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_honda_109_v_stage2', 'honda_109', 'v_stage2', 'v3', '1K', 'Basecoat', '注意干燥时间') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_toyota_110_v_std', 'toyota_110', 'v_std', 'v1', '2K', 'Basecoat', '') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_volkswagen_111_v_pearl', 'volkswagen_111', 'v_pearl', 'v3', '2K', 'Basecoat', '建议喷涂2遍底色') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_volkswagen_112_v_stage1', 'volkswagen_112', 'v_stage1', 'v1', '1K', 'Basecoat', '注意干燥时间') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_toyota_113_v_pearl', 'toyota_113', 'v_pearl', 'v1', '2K', 'Basecoat', '建议喷涂2遍底色') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_kia_114_v_stage1', 'kia_114', 'v_stage1', 'v3', '1K', 'Basecoat', '需要罩光油') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_ford_115_v_std', 'ford_115', 'v_std', 'v3', '1K', 'Basecoat', '需要罩光油') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_volkswagen_116_v_std', 'volkswagen_116', 'v_std', 'v1', '1K', 'Basecoat', '建议喷涂2遍底色') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_hyundai_117_v_std', 'hyundai_117', 'v_std', 'v2', '2K', 'Basecoat', '需要罩光油') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_toyota_118_v_stage2', 'toyota_118', 'v_stage2', 'v1', '1K', 'Basecoat', '') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_nissan_119_v_stage2', 'nissan_119', 'v_stage2', 'v2', '1K', 'Basecoat', '注意干燥时间') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.formulas (id, color_id, variant_id, version, paint_system, formula_type, notes) VALUES
  ('f_bmw_120_v_std', 'bmw_120', 'v_std', 'v1', '1K', 'Basecoat', '建议喷涂2遍底色') ON CONFLICT (id) DO NOTHING;

-- 4. 插入色母组件
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_bmw_101_v_std', '2K-2004', 'Black', 3.0, 3.0, 26, 26, 26);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_bmw_101_v_std', '2K-2024', 'Blue', 22.3, 22.3, 0, 0, 255);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_bmw_101_v_std', '2K-2003', 'Super White', 51.6, 51.6, 245, 245, 245);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_bmw_101_v_std', '2K-2017', 'Medium Yellow', 2.7, 2.7, 255, 215, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_bmw_101_v_std', '2K-2002', 'Standard White', 20.3, 20.3, 250, 250, 250);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_102_v_stage1', '2K-2017', 'Medium Yellow', 41.1, 41.1, 255, 215, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_102_v_stage1', '2K-2013', 'Vivid Red', 14.4, 14.4, 255, 26, 26);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_102_v_stage1', '2K-2011', 'Rose Red', 4.0, 4.0, 255, 105, 180);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_102_v_stage1', '2K-2005', 'Jet Black', 4.1, 4.1, 13, 13, 13);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_102_v_stage1', '2K-2009', 'Purple', 36.4, 36.4, 128, 0, 128);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_nissan_103_v_matte', '2K-2003', 'Super White', 37.1, 37.1, 245, 245, 245);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_nissan_103_v_matte', '2K-2024', 'Blue', 45.3, 45.3, 0, 0, 255);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_nissan_103_v_matte', '2K-2012', 'Red', 2.9, 2.9, 255, 0, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_nissan_103_v_matte', '2K-2014', 'Ferrari Red', 14.6, 14.6, 255, 40, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_honda_104_v_std', '2K-2014', 'Ferrari Red', 10.2, 10.2, 255, 40, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_honda_104_v_std', '2K-2006', 'Extra Black', 13.0, 13.0, 0, 0, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_honda_104_v_std', '2K-2026', 'Reddish Blue', 45.4, 45.4, 75, 0, 130);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_honda_104_v_std', '2K-2024', 'Blue', 31.4, 31.4, 0, 0, 255);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_nissan_105_v_pearl', '2K-2011', 'Rose Red', 44.8, 44.8, 255, 105, 180);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_nissan_105_v_pearl', '2K-2024', 'Blue', 41.3, 41.3, 0, 0, 255);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_nissan_105_v_pearl', '2K-2010', 'Purple Red', 12.2, 12.2, 199, 21, 133);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_nissan_105_v_pearl', '2K-2013', 'Vivid Red', 1.7, 1.7, 255, 26, 26);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_ford_106_v_stage1', '2K-2019', 'Lemon Yellow', 13.9, 13.9, 255, 244, 79);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_ford_106_v_stage1', '2K-2015', 'Orange Red', 13.6, 13.6, 255, 69, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_ford_106_v_stage1', '2K-2018', 'Yellow', 72.5, 72.5, 255, 222, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_107_v_matte', '2K-2010', 'Purple Red', 10.4, 10.4, 199, 21, 133);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_107_v_matte', '2K-2005', 'Jet Black', 5.4, 5.4, 13, 13, 13);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_107_v_matte', '2K-2023', 'Green', 12.5, 12.5, 0, 128, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_107_v_matte', '2K-2019', 'Lemon Yellow', 71.7, 71.7, 255, 244, 79);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_hyundai_108_v_stage2', '2K-2011', 'Rose Red', 49.2, 49.2, 255, 105, 180);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_hyundai_108_v_stage2', '2K-2024', 'Blue', 21.8, 21.8, 0, 0, 255);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_hyundai_108_v_stage2', '2K-2001', 'White', 18.8, 18.8, 255, 255, 255);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_hyundai_108_v_stage2', '2K-2004', 'Black', 10.1, 10.1, 26, 26, 26);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_hyundai_108_v_stage2', '2K-2026', 'Reddish Blue', 0.2, 0.2, 75, 0, 130);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_honda_109_v_stage2', '2K-2023', 'Green', 24.8, 24.8, 0, 128, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_honda_109_v_stage2', '2K-2009', 'Purple', 35.8, 35.8, 128, 0, 128);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_honda_109_v_stage2', '2K-2005', 'Jet Black', 24.4, 24.4, 13, 13, 13);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_honda_109_v_stage2', '2K-2014', 'Ferrari Red', 0.0, 0.0, 255, 40, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_honda_109_v_stage2', '2K-2006', 'Extra Black', 14.9, 14.9, 0, 0, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_toyota_110_v_std', '2K-2025', 'Greenish Blue', 29.0, 29.0, 0, 102, 204);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_toyota_110_v_std', '2K-2003', 'Super White', 32.3, 32.3, 245, 245, 245);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_toyota_110_v_std', '2K-2026', 'Reddish Blue', 38.7, 38.7, 75, 0, 130);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_111_v_pearl', '2K-2023', 'Green', 33.1, 33.1, 0, 128, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_111_v_pearl', '2K-2017', 'Medium Yellow', 18.5, 18.5, 255, 215, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_111_v_pearl', '2K-2009', 'Purple', 31.1, 31.1, 128, 0, 128);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_111_v_pearl', '2K-2024', 'Blue', 17.3, 17.3, 0, 0, 255);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_112_v_stage1', '2K-2025', 'Greenish Blue', 45.1, 45.1, 0, 102, 204);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_112_v_stage1', '2K-2024', 'Blue', 0.6, 0.6, 0, 0, 255);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_112_v_stage1', '2K-2010', 'Purple Red', 54.3, 54.3, 199, 21, 133);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_toyota_113_v_pearl', '2K-2019', 'Lemon Yellow', 29.8, 29.8, 255, 244, 79);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_toyota_113_v_pearl', '2K-2009', 'Purple', 36.4, 36.4, 128, 0, 128);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_toyota_113_v_pearl', '2K-2024', 'Blue', 23.8, 23.8, 0, 0, 255);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_toyota_113_v_pearl', '2K-2005', 'Jet Black', 10.0, 10.0, 13, 13, 13);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_kia_114_v_stage1', '2K-2017', 'Medium Yellow', 31.2, 31.2, 255, 215, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_kia_114_v_stage1', '2K-2026', 'Reddish Blue', 45.6, 45.6, 75, 0, 130);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_kia_114_v_stage1', '2K-2018', 'Yellow', 4.6, 4.6, 255, 222, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_kia_114_v_stage1', '2K-2002', 'Standard White', 18.7, 18.7, 250, 250, 250);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_ford_115_v_std', '2K-2017', 'Medium Yellow', 32.8, 32.8, 255, 215, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_ford_115_v_std', '2K-2006', 'Extra Black', 61.9, 61.9, 0, 0, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_ford_115_v_std', '2K-2011', 'Rose Red', 5.3, 5.3, 255, 105, 180);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_116_v_std', '2K-2017', 'Medium Yellow', 31.7, 31.7, 255, 215, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_116_v_std', '2K-2019', 'Lemon Yellow', 59.6, 59.6, 255, 244, 79);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_volkswagen_116_v_std', '2K-2025', 'Greenish Blue', 8.7, 8.7, 0, 102, 204);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_hyundai_117_v_std', '2K-2024', 'Blue', 15.7, 15.7, 0, 0, 255);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_hyundai_117_v_std', '2K-2019', 'Lemon Yellow', 4.2, 4.2, 255, 244, 79);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_hyundai_117_v_std', '2K-2005', 'Jet Black', 53.1, 53.1, 13, 13, 13);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_hyundai_117_v_std', '2K-2009', 'Purple', 4.4, 4.4, 128, 0, 128);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_hyundai_117_v_std', '2K-2012', 'Red', 22.6, 22.6, 255, 0, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_toyota_118_v_stage2', '2K-2003', 'Super White', 21.1, 21.1, 245, 245, 245);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_toyota_118_v_stage2', '2K-2026', 'Reddish Blue', 49.2, 49.2, 75, 0, 130);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_toyota_118_v_stage2', '2K-2010', 'Purple Red', 29.7, 29.7, 199, 21, 133);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_nissan_119_v_stage2', '2K-2009', 'Purple', 23.5, 23.5, 128, 0, 128);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_nissan_119_v_stage2', '2K-2013', 'Vivid Red', 39.9, 39.9, 255, 26, 26);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_nissan_119_v_stage2', '2K-2010', 'Purple Red', 17.8, 17.8, 199, 21, 133);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_nissan_119_v_stage2', '2K-2011', 'Rose Red', 18.8, 18.8, 255, 105, 180);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_bmw_120_v_std', '2K-2011', 'Rose Red', 13.8, 13.8, 255, 105, 180);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_bmw_120_v_std', '2K-2005', 'Jet Black', 5.9, 5.9, 13, 13, 13);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_bmw_120_v_std', '2K-2014', 'Ferrari Red', 31.2, 31.2, 255, 40, 0);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_bmw_120_v_std', '2K-2003', 'Super White', 26.3, 26.3, 245, 245, 245);
INSERT INTO public.formula_components (formula_id, toner_code, toner_name, percentage, grams_per_100g, rgb_r, rgb_g, rgb_b) VALUES
  ('f_bmw_120_v_std', '2K-2010', 'Purple Red', 22.9, 22.9, 199, 21, 133);

-- 5. 刷新 schema cache
NOTIFY pgrst, 'reload schema';
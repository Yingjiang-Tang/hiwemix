-- =====================================================================
-- 迁移：全站内容锁定 — 内容表 SELECT 改为仅已登录用户可读
-- 背景：此前所有内容表 SELECT 策略为 FOR SELECT TO public USING (true)，
--       任何人拿公开 anon key 可直接调 Supabase REST API 抓走全部配方数据，
--       完全绕过网站登录。本迁移配合 src/proxy.ts 门禁，构成两道防线。
-- 用法：Supabase Dashboard → SQL Editor → 粘贴 → Run（幂等，可重复执行）
-- =====================================================================

-- 对每张内容表（含控制台手动建的 formula_types）统一处理：
--   1) 确保 RLS 开启
--   2) 删除所有授予 public/anon 角色的 SELECT 策略（任意名字，含 Dashboard
--      “Enable read access for all users” 默认策略），彻底消除匿名读
--   3) 幂等重建 authenticated 读策略（先删后建，可重复执行）
DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'brands','color_variants','colors','color_variant_map','formulas',
    'formula_components','settings','guide_categories','guides','color_years',
    'regions','toners','formula_types'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;  -- 表不存在（如 formula_types 未建）则跳过
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- 删除该表上所有授予 public/anon 的 SELECT 策略（任意名字）
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND cmd = 'SELECT'
        AND (roles::text LIKE '%public%' OR roles::text LIKE '%anon%')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- 幂等重建 authenticated 读策略
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_auth', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t || '_select_auth', t);
  END LOOP;
END
$$;

-- 刷新 PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 验证 1：13 张表应全部 relrowsecurity=t（RLS 开启）
SELECT c.relname AS "table", c.relrowsecurity AS rls_enabled
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relname IN (
    'brands','color_variants','colors','color_variant_map','formulas',
    'formula_components','settings','guide_categories','guides','color_years',
    'regions','toners','formula_types'
  )
ORDER BY c.relname;

-- 验证 2：SELECT 策略应只有 *_select_auth（TO authenticated），无遗留 TO public/anon 的公开读策略
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'SELECT'
  AND tablename IN (
    'brands','color_variants','colors','color_variant_map','formulas',
    'formula_components','settings','guide_categories','guides','color_years',
    'regions','toners','formula_types'
  )
ORDER BY tablename;

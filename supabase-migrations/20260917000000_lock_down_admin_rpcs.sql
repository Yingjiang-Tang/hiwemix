-- =====================================================================
-- 迁移：收紧后台写入 RPC 的执行权限
-- 背景：以下函数使用 SECURITY DEFINER，会以函数所有者权限执行并绕过 RLS。
--       后台 API 已通过 getSupabaseAdmin() 使用 service_role 调用，因此数据库层
--       只需允许 service_role 执行，禁止浏览器侧的 anon/authenticated 直接调用。
--
-- 注意：按函数名遍历所有重载，确保旧版 save_formula_with_components 签名
--       不会因历史迁移残留而继续对外开放。
-- =====================================================================

DO $$
DECLARE
  function_signature TEXT;
  secured_function_count INTEGER;
BEGIN
  SELECT count(DISTINCT p.proname)
  INTO secured_function_count
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'save_formula_with_components',
      'save_color_with_components',
      'save_variant_with_relink'
    );

  IF secured_function_count <> 3 THEN
    RAISE EXCEPTION
      'Expected 3 admin RPC names, found %. Apply the earlier RPC migrations first.',
      secured_function_count;
  END IF;

  FOR function_signature IN
    SELECT format(
      '%I.%I(%s)',
      n.nspname,
      p.proname,
      pg_get_function_identity_arguments(p.oid)
    )
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'save_formula_with_components',
        'save_color_with_components',
        'save_variant_with_relink'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      function_signature
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      function_signature
    );
  END LOOP;

  -- has_function_privilege 会同时计算直接授权和经 PUBLIC 继承的权限。
  IF EXISTS (
    SELECT 1
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'save_formula_with_components',
        'save_color_with_components',
        'save_variant_with_relink'
      )
      AND (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
  ) THEN
    RAISE EXCEPTION 'Admin RPCs are still executable by anon or authenticated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'save_formula_with_components',
        'save_color_with_components',
        'save_variant_with_relink'
      )
      AND NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
  ) THEN
    RAISE EXCEPTION 'Admin RPCs are not executable by service_role';
  END IF;
END;
$$;

-- 输出最终权限状态，便于在 Supabase SQL Editor 中人工确认。
SELECT
  p.oid::regprocedure AS function_signature,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'save_formula_with_components',
    'save_color_with_components',
    'save_variant_with_relink'
  )
ORDER BY p.proname, p.oid::regprocedure::text;

-- 只读上线核验。先执行 20261103000000_formula_years.sql。
BEGIN READ ONLY;

SELECT column_name, is_nullable, column_default FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'formulas' AND column_name = 'year_mode';
SELECT year_mode, count(*) FROM public.formulas GROUP BY year_mode;
SELECT count(*) AS custom_year_entries FROM public.formula_years;

-- 普通角色应全部为 false，service_role 应全部为 true。
SELECT oid::regprocedure AS entry,
  has_function_privilege('anon', oid, 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', oid, 'EXECUTE') AS authenticated_execute,
  has_function_privilege('service_role', oid, 'EXECUTE') AS service_execute,
  prosecdef AS security_definer, proconfig
FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname IN (
  'save_formula_with_years', 'save_formula_with_components', '_save_formula_components_legacy',
  'check_color_formula_years', 'enforce_formula_years'
);
SELECT relrowsecurity FROM pg_class WHERE oid = 'public.formula_years'::regclass;
SELECT roles, cmd, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'formula_years';

-- 应返回零行：自定义非空，逐年完整包含在颜色范围内。
SELECT f.id AS conflicting_formula FROM public.formulas f WHERE f.year_mode = 'custom' AND (
  NOT EXISTS (SELECT 1 FROM public.formula_years fy WHERE fy.formula_id = f.id)
  OR EXISTS (SELECT 1 FROM public.formula_years fy,
    LATERAL generate_series(fy.year, COALESCE(fy.year_end, fy.year)) y
    WHERE fy.formula_id = f.id AND NOT EXISTS (
      SELECT 1 FROM public.color_years cy WHERE cy.color_id = f.color_id
      AND y BETWEEN cy.year AND COALESCE(cy.year_end, cy.year)
    ))
);
COMMIT;

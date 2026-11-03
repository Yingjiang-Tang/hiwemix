-- 增量迁移：不回填历史适用年份，不改配方 ID、比例或克重。
-- 整份脚本在同一事务执行；先迁移并验证旧版兼容，再发布应用。
BEGIN;

ALTER TABLE public.formulas ADD COLUMN IF NOT EXISTS year_mode text NOT NULL DEFAULT 'inherit'
  CHECK (year_mode IN ('inherit', 'custom'));

CREATE TABLE IF NOT EXISTS public.formula_years (
  formula_id text NOT NULL REFERENCES public.formulas(id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year BETWEEN 1900 AND 2100),
  year_end integer CHECK (year_end BETWEEN year AND 2100),
  PRIMARY KEY (formula_id, year)
);
ALTER TABLE public.formula_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS formula_years_read ON public.formula_years;
CREATE POLICY formula_years_read ON public.formula_years FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.formula_years FROM anon, authenticated;
GRANT SELECT ON public.formula_years TO authenticated;
GRANT ALL ON public.formula_years TO service_role;

-- 逐年检查覆盖范围，不能通过颜色年份的空档。返回所有冲突配方供管理员处理。
CREATE OR REPLACE FUNCTION public.check_color_formula_years(p_color_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_conflicts text;
BEGIN
  SELECT string_agg(f.id, ', ' ORDER BY f.id) INTO v_conflicts
  FROM public.formulas f
  WHERE f.color_id = p_color_id AND f.year_mode = 'custom' AND (
    NOT EXISTS (SELECT 1 FROM public.formula_years fy WHERE fy.formula_id = f.id)
    OR EXISTS (
      SELECT 1 FROM public.formula_years fy,
        LATERAL generate_series(fy.year, COALESCE(fy.year_end, fy.year)) y
      WHERE fy.formula_id = f.id AND NOT EXISTS (
        SELECT 1 FROM public.color_years cy WHERE cy.color_id = p_color_id
          AND y BETWEEN cy.year AND COALESCE(cy.year_end, cy.year)
      )
    )
  );
  IF v_conflicts IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '配方年份与颜色范围冲突：' || v_conflicts;
  END IF;
END;
$$;

-- 保留旧事务入口和原签名；两种应用都先锁颜色，再写配方。
DO $$ BEGIN
  IF to_regprocedure('public._save_formula_components_legacy(text,text,text,text,text,text,text,jsonb,text,boolean)') IS NULL THEN
    ALTER FUNCTION public.save_formula_with_components(text,text,text,text,text,text,text,jsonb,text,boolean)
      RENAME TO _save_formula_components_legacy;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.save_formula_with_components(
  p_id text, p_color_id text, p_variant_id text, p_version text, p_paint_system text,
  p_formula_type text, p_notes text, p_components jsonb, p_image_url text DEFAULT NULL,
  p_is_new boolean DEFAULT false
) RETURNS SETOF public.formulas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM id FROM public.colors WHERE id IN (
    p_color_id, (SELECT color_id FROM public.formulas WHERE id = p_id)
  ) ORDER BY id FOR UPDATE;
  RETURN QUERY SELECT * FROM public._save_formula_components_legacy(
    p_id, p_color_id, p_variant_id, p_version, p_paint_system, p_formula_type,
    p_notes, p_components, p_image_url, p_is_new
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.save_formula_with_years(
  p_id text, p_color_id text, p_variant_id text, p_version text, p_paint_system text,
  p_formula_type text, p_notes text, p_components jsonb, p_image_url text DEFAULT NULL,
  p_is_new boolean DEFAULT false, p_year_mode text DEFAULT NULL, p_years jsonb DEFAULT NULL
) RETURNS SETOF public.formulas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_existing boolean;
BEGIN
  -- 与颜色保存的主行锁一致；范围检查期间颜色年份不能被并发缩小。
  PERFORM id FROM public.colors WHERE id IN (
    p_color_id, (SELECT color_id FROM public.formulas WHERE id = p_id)
  ) ORDER BY id FOR UPDATE;
  SELECT EXISTS (SELECT 1 FROM public.formulas WHERE id = p_id) INTO v_existing;
  IF p_year_mode IS NULL AND p_years IS NULL THEN
    IF p_is_new OR NOT v_existing THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '配方年份设置必须明确选择';
    END IF;
    -- 旧编辑请求完全缺少年份字段时，保留原模式及所有年份。
  ELSIF p_year_mode IS NULL OR p_year_mode NOT IN ('inherit', 'custom')
    OR p_years IS NULL OR jsonb_typeof(p_years) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '配方年份设置格式错误';
  ELSIF (p_year_mode = 'custom' AND jsonb_array_length(p_years) = 0)
    OR (p_year_mode = 'inherit' AND jsonb_array_length(p_years) <> 0) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '配方年份设置与模式不一致';
  END IF;

  PERFORM public.save_formula_with_components(p_id, p_color_id, p_variant_id, p_version,
    p_paint_system, p_formula_type, p_notes, p_components, p_image_url, p_is_new);
  IF p_year_mode IS NOT NULL THEN
    UPDATE public.formulas SET year_mode = p_year_mode WHERE id = p_id;
    DELETE FROM public.formula_years WHERE formula_id = p_id;
    INSERT INTO public.formula_years(formula_id, year, year_end)
      SELECT p_id, (e->>'year')::integer, (e->>'year_end')::integer FROM jsonb_array_elements(p_years) e;
  END IF;
  PERFORM public.check_color_formula_years(p_color_id);
  RETURN QUERY SELECT * FROM public.formulas WHERE id = p_id;
END;
$$;

-- 延迟到事务最终状态检查，使删旧插新的年份同步保持原子性。
-- 同时保护旧版 RPC 的颜色范围调整和配方换色操作。
CREATE OR REPLACE FUNCTION public.enforce_formula_years() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_color_id text;
BEGIN
  IF TG_TABLE_NAME = 'color_years' THEN
    v_color_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.color_id ELSE NEW.color_id END;
  ELSIF TG_TABLE_NAME = 'formulas' THEN
    v_color_id := NEW.color_id;
  ELSE
    SELECT color_id INTO v_color_id FROM public.formulas
      WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.formula_id ELSE NEW.formula_id END;
  END IF;
  PERFORM id FROM public.colors WHERE id = v_color_id FOR UPDATE;
  PERFORM public.check_color_formula_years(v_color_id);
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS formula_years_valid ON public.formulas;
CREATE CONSTRAINT TRIGGER formula_years_valid AFTER INSERT OR UPDATE ON public.formulas
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.enforce_formula_years();
DROP TRIGGER IF EXISTS formula_years_valid ON public.formula_years;
CREATE CONSTRAINT TRIGGER formula_years_valid AFTER INSERT OR UPDATE OR DELETE ON public.formula_years
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.enforce_formula_years();
DROP TRIGGER IF EXISTS formula_years_valid ON public.color_years;
CREATE CONSTRAINT TRIGGER formula_years_valid AFTER INSERT OR UPDATE OR DELETE ON public.color_years
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.enforce_formula_years();

-- 新旧所有写入口及内部辅助函数，仅服务器 service_role 可执行。
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace = 'public'::regnamespace
    AND proname IN ('save_formula_with_years', 'save_formula_with_components', '_save_formula_components_legacy',
      'check_color_formula_years', 'enforce_formula_years')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;

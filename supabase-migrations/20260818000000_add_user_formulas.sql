-- 个人保存的配方（2.1 二期功能：保存即拷贝，源配方删除后快照仍展示）
CREATE TABLE IF NOT EXISTS public.user_formulas (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formula_id TEXT REFERENCES public.formulas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  formula_json JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, formula_id)
);

CREATE INDEX IF NOT EXISTS idx_user_formulas_user_id ON public.user_formulas(user_id);

ALTER TABLE public.user_formulas ENABLE ROW LEVEL SECURITY;

-- 简单 user_id 匹配策略（绝不自引用）
CREATE POLICY "Users can manage own saved formulas" ON public.user_formulas
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

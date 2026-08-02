-- ================================================================
-- HIWE Formula Search — Phase 1: user_favorites（收藏配方）
-- 请在 Supabase SQL Editor 中执行此脚本
-- 新表：记录哪个用户收藏了哪个配方；快照字段用于列表页免 join 展示
-- ================================================================

CREATE TABLE IF NOT EXISTS public.user_favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formula_id TEXT NOT NULL REFERENCES public.formulas(id) ON DELETE CASCADE,
  -- 快照字段：冗余展示，避免列表页多次 join
  color_code TEXT,
  color_name TEXT,
  make_name TEXT,
  formula_type TEXT,
  paint_system TEXT,
  version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, formula_id)
);

-- 索引：按用户查询收藏
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);

-- 启用 RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- RLS：用户只能读写自己的收藏（简单 auth.uid() = user_id，不引 profiles，避免递归）
CREATE POLICY "Users can manage own favorites"
  ON public.user_favorites
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

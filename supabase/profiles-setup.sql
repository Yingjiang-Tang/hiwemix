-- ================================================================
-- HIWE Formula Search — Supabase Auth 迁移 SQL
-- 请在 Supabase SQL Editor 中执行此脚本
-- 执行路径：Supabase Dashboard → SQL Editor → 粘贴并运行
-- ================================================================

-- 1. 创建 profiles 表（关联 auth.users，存储业务字段）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 启用 Row Level Security（保护 profiles 数据）
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS 策略：用户可读自己的 profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- 4. RLS 策略：管理员可读所有 profiles（用 service_role 查询绕过 RLS，此策略备用）
CREATE POLICY "Admin can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. 新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- 6. 绑定触发器到 auth.users 表
-- 删除可能存在的旧触发器，避免重复
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. 为已有用户补建 profile（如果 auth.users 中已有用户但 profiles 中没有记录）
INSERT INTO public.profiles (id, role)
SELECT id, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 8. 将第一个注册用户设为管理员（可选：后续在 Dashboard 中手动改 role）
-- UPDATE public.profiles SET role = 'admin' WHERE id = '替换为你的用户UUID';

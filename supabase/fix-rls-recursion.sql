-- 修复 profiles 表的 RLS 无限递归错误

-- 1. 删除有问题的"管理员读所有"策略（它会无限递归）
DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;

-- 2. 保留"用户读自己"的策略（无递归问题），如果不存在则创建
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;
END
$$;

SELECT '✅ RLS fix applied' AS status;

-- ⚠️ 已废弃 — 请勿在此文件中插入或修改任何内容 ⚠️
-- ================================================================
-- 本文件是遗留认证方案的脚本（HAIWEN MIX 的 users 表 + bcrypt 密码 + admin123 种子）。
-- 项目已全面切换到 Supabase Auth（auth.users + public.profiles），
-- 对应代码 src/lib/db.ts 已删除（无任何调用方）。
-- 本文件保留仅为审计历史；其中包含硬编码默认密码（admin123），
-- 若误执行会在库中留下一个已知密码的账号，属安全隐患。
-- 如需重新初始化用户表，请改用 Supabase Auth + profiles-setup.sql。
-- 不要在未获明确指示的情况下运行本脚本。
-- ================================================================
-- HAIWEN MIX 用户表
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 启用行级安全（RLS）。写操作走 service_role（默认 BYPASSRLS），公开角色一律拒绝
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 仅 service_role 可完全访问（显式声明；service_role 默认 BYPASSRLS，不受影响）
DROP POLICY IF EXISTS "service_role_all" ON public.users;
CREATE POLICY "service_role_all" ON public.users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 显式拒绝 anon / authenticated 任何访问（双保险，防止公开角色越权读 users）
DROP POLICY IF EXISTS "deny_public" ON public.users;
CREATE POLICY "deny_public" ON public.users
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- 撤销 anon / authenticated 对 users 表的权限（保留 service_role / postgres，不影响登录）
REVOKE ALL ON public.users FROM anon, authenticated;

-- 插入默认管理员账号（密码：admin123）
INSERT INTO public.users (username, password_hash, role)
VALUES ('admin', '$2b$10$xq5ADBjJwyv9lCTbGgtZQ.QFo4nF0oATwQ84HcNM7g7MUcsxVq5H6', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 创建更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

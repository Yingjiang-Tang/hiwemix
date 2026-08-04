-- 行为分析事件表（轻量埋点，不追踪个人身份）
-- 记录匿名访问者（visitor_id cookie）产生的行为事件，用于 admin「数据分析」页。
-- 原则：不存邮箱/IP/账号 ID，只存"谁(匿名ID)+何时+做了什么"，规避 GDPR 个人数据采集。

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  visitor_id TEXT NOT NULL,               -- 匿名访客 ID（hiwe_visitor_id cookie，随机 UUID）
  event_type TEXT NOT NULL,               -- 'page_view' | 'search' | 'formula_view' | 'color_view'
  event_data JSONB NOT NULL DEFAULT '{}', -- 事件详情：如 {code:"040", name:"...", make:"BMW"}
  lang TEXT NOT NULL DEFAULT 'en',        -- 事件发生时用户语言（从 site-language cookie 读取）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 常见查询索引：按类型+时间（admin 统计页按天聚合用）
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_time
  ON public.analytics_events (event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_time
  ON public.analytics_events (created_at);

-- 启用 RLS：公开角色一律拒绝；只允许 service_role（BYPASSRLS）写入/读取。
-- 埋点 API 用 admin client（secret key）插入，前端永远无法直接读写该表。
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_service_role_all" ON public.analytics_events;
CREATE POLICY "analytics_service_role_all" ON public.analytics_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_deny_public" ON public.analytics_events;
CREATE POLICY "analytics_deny_public" ON public.analytics_events
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

REVOKE ALL ON public.analytics_events FROM anon, authenticated;

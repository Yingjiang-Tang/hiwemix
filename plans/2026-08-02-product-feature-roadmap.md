# HIWE MIX 配方检索网站 — 产品功能增强方案

## Context

HIWE MIX 是一个汽车修补漆配方检索网站（Next.js 16 + TypeScript + Tailwind + Supabase），对标 kapcimix.com/FormulaSearch。当前已具备：品牌/年份/色码搜索、按品牌分组的颜色卡片墙、配方抽屉（克重表 + 总量计算器 + 打印/复制）、色母库、应用指南、13 语言 i18n、暗色主题、admin 数据管理后台。

用户是配方网站运营方，希望让**客户（汽修喷漆师 / 调漆店）**用起来更方便、对网站依赖度更高。用户已选定三个增强方向：

1. **核心实用功能** — 收藏、搜索历史、小量混合、单位换算
2. **账户 + 工作流** — 个人配方、调漆工单、打印标签、分享
3. **库存 + 报表 + 知识库** — 色母库存、用量统计、成本核算、TDS/MSDS、施工指引

本方案基于对现有代码库的全面探索 + 竞品调研（AkzoNobel MIXIT、Kapci Smart Mix、PPG），给出分三期的可执行路线图。

---

## 竞品功能对照表（调研来源：Firecrawl 检索）

| 功能 | HIWE 现状 | AkzoNobel MIXIT | Kapci Smart Mix | PPG | 价值 |
|---|---|---|---|---|---|
| 配方收藏 | ❌ | ✅ 跨设备同步 | ✅ | — | ★★★★★ |
| 搜索历史 | ❌ | ✅ | — | — | ★★★★ |
| 重量↔体积换算 | ⚠️ 有 g/kg/ml/l | ✅ 双向 | ✅ | ✅ | ★★★★★ |
| 小量混合 (30ml) | ❌ 最低 0.1kg | ⚠️ 用户抱怨 | ✅ | — | ★★★★★ |
| 配方对比 | ❌ | ✅ | — | — | ★★★★ |
| 调漆工单 | ❌ | ✅ 完整+PDF | — | ✅ | ★★★★★ |
| 打印标签 | ❌ | ✅ mixlabel | — | ✅ | ★★★★ |
| 配方分享链接 | ❌ | ✅ 云分享 | — | — | ★★★★ |
| 库存管理 | ❌ | ✅ 库存+补货 | — | ✅ 智能补货+扫码 | ★★★★★ |
| 用量/成本报表 | ❌ | ✅ dashboard | — | ✅ | ★★★★ |
| TDS/MSDS 文档 | ❌ 空占位 | ✅ | ✅ | ✅ | ★★★ |
| 施工指引/百科 | ⚠️ 静态指南 | ✅ | — | ✅ | ★★★ |

**北极星原则**：依赖度最高 = 收藏、小量混合、工单+库存闭环、分享链接；便利度最高 = 搜索历史、小量预设、打印标签、配方对比。

---

## 全局约束（每期必须遵守）

- **读写分层**：读用 `getSupabase()`（anon+RLS），写用 `getSupabaseAdmin()`（service_role，只在 API 路由内）——见 [supabase-client.ts](src/lib/supabase-client.ts)、[supabase-server.ts](src/lib/supabase-server.ts)
- **鉴权复用**：新 API 统一用 `requireSupabaseAuth()` / `checkSupabaseAdmin()`（[auth.ts](src/lib/auth.ts)）+ `applyRateLimit`（新建 `USER_LIMIT` 120/min）
- **middleware 白名单**：新页面若非公开则不加 `exactPublic`（自动受保护）；新 API 若非公开则不加 `prefixPublic`
- **i18n 联动**：新增任一文案 key 必须同时改 `_helpers.ts`（I18nDict + `dict()` 默认值）+ 全部 13 个语言文件，否则 TS 构建失败——每期预留此成本
- **RLS 陷阱**：`profiles` 有自引用递归问题（[fix-rls-recursion.sql](supabase/fix-rls-recursion.sql)）。新表策略一律用简单 `auth.uid() = user_id`，**绝不自引用**
- **迁移方式**：遵循 `supabase-migrations/` 时间戳命名，每期一个独立可粘贴 SQL
- 数据一律挂在 `auth.users` 的 UUID 上（与 `profiles` 一致）；遗留 `users` 表（[db.ts](src/lib/db.ts)）不用
- **UI 设计约束（用户明确要求）**：所有新页面、按钮、图标、对话框、标签**严格复用项目现有 `src/components/ui/*` 的 Shadcn 组件**（Button/Input/Card/Tabs/Dialog/Badge/Select/Popover 等），不引入任何新 UI 库；新页面布局参考现有页面（color-library / SearchResults / FormulaDrawer）的间距、字号、卡片风格，保持视觉完全一致

---

## 第一期：核心实用功能（1-2 周）— 面向所有访客，匿名可用

目标：把"查一次配方"变成"每天打开的工具"。一期功能全部匿名可用，登录后自动同步。

### 1.1 收藏配方 Favorites（依赖度 ★★★★★）

**新表** `user_favorites`：`user_id`(FK auth.users) + `formula_id`(FK formulas) + 快照字段(color_code/color_name/make_name/formula_type/paint_system/version)，`UNIQUE(user_id, formula_id)`，RLS `auth.uid()=user_id`。

- [db-favorites.ts](src/lib/db-favorites.ts)（新）— `getSupabaseAdmin()` 增删查
- [api/favorites/route.ts](src/app/api/favorites/route.ts)（新）— GET/POST/DELETE + `requireSupabaseAuth` + USER_LIMIT
- [FavoritesContext.tsx](src/components/FavoritesContext.tsx)（新）— 匿名写 localStorage(`hiwe-favorites`)，登录后拉 API 双向合并，用 `useAuth()` 监听切换
- [FormulaDrawer.tsx](src/components/FormulaDrawer.tsx) — header 加 ♥ 切换按钮
- [favorites/page.tsx](src/app/favorites/page.tsx)（新）— 收藏列表（复用 SearchResults 卡片/照片模式，点击开 Drawer）
- middleware：`/favorites` 加 `exactPublic`（匿名可见）；`/api/favorites` 不加（API 内鉴权）

### 1.2 搜索历史（便利度 ★★★★★）

纯 localStorage（key `hiwe-search-history`），最多 10 条，`{ params, label, ts }`，去重、最近优先。无 DB、无 API。

- [SearchPanel.tsx](src/components/SearchPanel.tsx) — 表单下方渲染历史 chips，点击即 `onSearch(params)`；加清空。`handleSubmit` 里写入

### 1.3 小量混合（依赖度 ★★★★★，行业痛点核心）

**现状缺陷**：`KapciFormulaTable.tsx` 的 `handleVolumeChange` 有 `Math.max(0.1, ...)` 下限；`UNIT_MULTIPLIER` 把 ml/l 与 g/kg 等价（density 恒为 1），30ml 场景被卡且换算不准。

改造（分两步，核心不依赖密度数据）：

**第 1 步 — 小量混合（核心，零依赖，立即可用）**
1. [KapciFormulaTable.tsx](src/components/KapciFormulaTable.tsx)：克/公斤单位移除 0.1 下限（允许 30g / 5g）；总量栏加小量预设 chips：30g / 50g / 100g（对标 MIXIT 痛点）
2. 调漆行业标准量法就是克称，配方表本身就是「每 100 克配方的色母克数」——小量混合用克实现，不需要密度

**第 2 步 — 毫升换算（用户明确要求尽量精确，分级精度）**
3. `toners` 加 `density NUMERIC(8,3)` 列（可空）；[types/index.ts](src/types/index.ts) `Toner` 加 `density?: number`
4. [units.ts](src/lib/units.ts)（新，纯函数）：`blendedDensity(components)` 质量加权调和平均、`gramsToVolume`/`volumeToGrams`
5. **分级精度策略（按数据可得性从准到粗，不依赖单一近似值）**：
   - **L1 最准**：色母级精确 density（从 TDS 规格书抄录，或实测）→ 存 `toners.density`，换算用它
   - **L2 较准**：分类典型密度 → 按色母 category（2K_BASECOAT / 1K_BASECOAT / 1K_SILVER / 1K_PEARL / SUPPLEMENTARY）给典型值（如溶剂型底漆 ≈0.9-1.0、珠光 ≈1.1-1.2 g/ml），写死为常量表
   - **L3 兜底**：确实无分类信息的，用 1.0 g/ml
   - 换算时对配方里每个色母按 L1→L2→L3 取密度，再质量加权调和平均，**宁可分级也不统一近似**
6. 密度数据来源（可选，客户以后可自己补）：① 色母厂家 TDS 产品规格书；② 自行实测（量 100ml 称重，克÷100=密度，约 5 分钟/个）

> **密度不阻塞小量混合**：核心功能完全用「克」实现，毫升换算只是附加便利，缺数据时自动兜底。

**估算**：收藏 1.5d + 小量混合 1d（含可选毫升换算） + 搜索历史 0.5d + i18n/接线 0.5d ≈ **3.5-4 人天**。i18n 约 25 个 key。

---

## 第二期：账户 + 工作流（2-4 周）— 登录用户成为"工作台"

前置：一期打通的登录态 + FavoritesContext 同步机制直接复用。

### 2.1 个人配方保存（依赖度 ★★★★）

- 新表 `user_formulas`：`user_id, formula_id(ON DELETE SET NULL), name, formula_json JSONB(完整快照), notes, created_at, updated_at`，RLS 同款
- **存 JSONB 快照而非外键**：管理后台改配方不影响用户已存配方
- [db-user-formulas.ts](src/lib/db-user-formulas.ts) + [api/user-formulas/route.ts](src/app/api/user-formulas/route.ts)（新）
- FormulaDrawer 加"保存到我的配方"；[my-formulas/page.tsx](src/app/my-formulas/page.tsx)（新，快照直接渲染 KapciFormulaTable）
- 对标 Kapci Smart Mix 客户自定义配方

### 2.2 调漆工单 Work Orders（依赖度 ★★★★★，对开店客户最强绑定）

- 新表 `work_orders`：`wo_no`(WO-YYYYMMDD-NNNN，BIGSERIAL+触发器)、`status(draft|mixed|done|cancelled)`、customer/plate/car_model/vehicle_type、total_grams/density/notes
- 新表 `work_order_items`：`work_order_id FK, formula_id, color_code/name, make_name, formula_type, paint_system, version, batch_grams, components JSONB`（色母克数快照）
- RLS：items 用 `EXISTS (SELECT 1 FROM work_orders wo WHERE wo.id=work_order_id AND wo.user_id=auth.uid())` 子查询（不引 profiles）
- [db-work-orders.ts](src/lib/db-work-orders.ts) + [api/work-orders/route.ts](src/app/api/work-orders/route.ts) + [api/work-orders/[id]/route.ts](src/app/api/work-orders/[id]/route.ts)（状态流转 POST）
- FormulaDrawer：选批次量(30ml~5kg) → 新建工单 → 表单 → 提交
- [work-orders/page.tsx](src/app/work-orders/page.tsx)（列表）+ [work-orders/[id]/page.tsx](src/app/work-orders/[id]/page.tsx)（详情+标签+状态推进）
- **复用**：批次量计算调用一期的 `units.ts`

### 2.3 打印标签（便利度 ★★★★★）

- [LabelPrint.tsx](src/components/LabelPrint.tsx)（新）：标签卡片（工单号+颜色+批次量+色母克数表+日期/客户），`@media print` 只显示打印区
- 独立打印路由 [work-orders/[id]/print/page.tsx](src/app/work-orders/[id]/print/page.tsx)，避免全屏 Sheet 里 `window.print()` 可见性问题
- 二维码二期按需（内联 QR ~100 行或 `qrcode` 包）

### 2.4 分享配方链接（便利度 ★★★★★）

- FormulaDrawer header 加"复制链接"：`/?f=<formulaId>`
- [page.tsx](src/app/page.tsx) 用 `useSearchParams()` 读 `?f=`，数据加载后定位 SearchResult 并 `setDrawerResult/setDrawerFormulaId`（FormulaDrawer 已支持 `formulaId` prop，直接复用）
- 加固：[api/formulas/route.ts](src/app/api/formulas/route.ts) GET 加 `?id=` 过滤

### 2.5 配方对比（便利度 ★★★★）

- [CompareContext.tsx](src/components/CompareContext.tsx)（新，localStorage 篮子）
- FormulaDrawer 加"加入对比"；[compare/page.tsx](src/app/compare/page.tsx)（新）— 并排表格，标"只出现在 A/B"的色母 + 百分比差。数据已全量加载，**零 API**

### 2.6 导航

- [SiteHeader.tsx](src/components/SiteHeader.tsx) navItems + Footer 加"我的配方/工单"（登录才显示，复用 admin 链接显隐模式）
- 新页面（/my-formulas、/work-orders、/compare）不加 `exactPublic` → 自动受保护
- **估算**：工单 5-7d + 标签 2d + 个人配方 2d + 分享 1d + 对比 2d + i18n/nav 1d ≈ **2-3 周**。i18n 约 40 个 key

---

## 第三期：库存 + 报表 + 知识库（1-2 月）— 把整套站当"店铺后台"

### 3.1 色母库存 + 补货提醒（依赖度 ★★★★★）

- 新表 `inventory_items`：`toner_code FK toners, qty_on_hand, unit, reorder_point, unit_cost`，`UNIQUE(user_id, toner_code)`
- 新表 `inventory_transactions`：`item_id FK, delta(正入负出), reason(adjustment|use|receive|work_order), work_order_id`
- **关键联动**：工单状态 → `done` 时按 `components JSONB` 自动生成负向 delta（reason=work_order），库存实时减少；低于 reorder_point 出现补货徽标
- [db-inventory.ts](src/lib/db-inventory.ts) + [api/inventory/route.ts](src/app/api/inventory/route.ts) + [api/inventory/transactions/route.ts](src/app/api/inventory/transactions/route.ts) + [inventory/page.tsx](src/app/inventory/page.tsx)
- 扣减在服务端原子处理（[work-orders/[id]/route.ts](src/app/api/work-orders/[id]/route.ts) done 分支），避免客户端自减漂移

### 3.2 用量统计 + 成本核算（依赖度 ★★★★）

- [db-stats.ts](src/lib/db-stats.ts) + [api/stats/route.ts](src/app/api/stats/route.ts)：按月聚合 work_order_items.components 色母用量(克)，乘 unit_cost 出成本；Top 颜色/Top 色母/月度成本趋势
- [reports/page.tsx](src/app/reports/page.tsx)：表格 + 简单柱状（纯 div/Tailwind，**不引图表库**）
- 单店数据量级，DB 层 JS 聚合即可

### 3.3 知识库：TDS/MSDS、百科、FAQ（补上 FormulaDrawer 空 Tab）

**现状**：FormulaDrawer 的 `tabColorDocs`/`tabPlasticParts` 是空占位（[FormulaDrawer.tsx:238-244](src/components/FormulaDrawer.tsx#L238-L244)）。

- **推荐方案**：扩展现有 `guides` 表加 `doc_type TEXT DEFAULT 'article'` 列（`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`），新内容直接进 guides，比新建 documents 表更省
- [api/guides/route.ts](src/app/api/guides/route.ts) 加 doc_type 过滤；[api/admin/guides/route.ts](src/app/api/admin/guides/route.ts) 支持 doc_type
- [GuidesPanel.tsx](src/app/admin/data/components/GuidesPanel.tsx) 加 doc_type 下拉
- FormulaDrawer：`tabColorDocs` 按色母 codes 拉 TDS/MSDS；`tabPlasticParts` 拉 plastic 指南
- [application-guide/page.tsx](src/app/application-guide/page.tsx)：分类栏加 doc_type 过滤

### 3.4 可选：PWA 离线（便利度 ★★★，三期尾）

- [manifest.ts](src/app/manifest.ts) + [sw.js](src/public/sw.js) + layout 注册；缓存静态资源 + `/api/formulas` 数据快照实现离线配方查询（对标 MIXIT 离线混合）

### 3.5 估算

库存+扣减联动 5d + 报表成本 3d + 文档/admin 4d + 指南过滤 1d + 补货提醒 1d + PWA 2d(可选) ≈ **3-4 周**。i18n 约 50 个 key。

---

## 三期依赖关系

```
一期（可独立交付，价值最高）
  └─ 二期（复用：登录态、units.ts、favorites 同步、formulaId 深链）
       └─ 三期（复用：work_order_items 扣库存、guides 表扩展、admin CRUD 模板）
```

每期交付同步交付：迁移 SQL + RLS + API + 页面 + i18n 全量 key + `npm run lint && npm run build` 通过。

---

## 推荐优先做（如果只做一件事）

**第一期 1.1 收藏 + 1.3 小量混合** — 改动集中在 3 个文件、约 2.5 人天，但对客户是"每天打开"级别的价值提升，且是后续工单/库存闭环的基础。

---

## 关键文件索引

- [KapciFormulaTable.tsx](src/components/KapciFormulaTable.tsx) — 小量混合/密度换算改造核心
- [FormulaDrawer.tsx](src/components/FormulaDrawer.tsx) — 收藏/保存/工单/分享/对比/TDS 入口汇聚点
- [db-formula.ts](src/lib/db-formula.ts) — 新增各 db-*.ts 数据层对照模板
- [auth.ts](src/lib/auth.ts) — 新 API 统一复用 requireSupabaseAuth/checkSupabaseAdmin
- [_helpers.ts](src/lib/i18n/_helpers.ts) — 所有新文案 key 的唯一类型约束入口，13 语言联动
- [profiles-setup.sql](supabase/profiles-setup.sql) — 新表 SQL/RLS 的写法模板

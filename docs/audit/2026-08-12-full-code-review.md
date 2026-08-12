# 全项目代码走查报告（Code Review Audit）

- **日期**：2026-08-12
- **范围**：全项目（src 137 文件 / 18,584 行 + 21 个 SQL 文件 + 配置）
- **方式**：只读走查，未修改任何代码
- **验证**：`npm run lint`（🔴 失败，9 errors） + `npm run build`（✅ 通过）
- **分阶段**：安全 → 数据正确性 → 可维护性 → 性能

---

## 一、执行摘要

### 总体评价

这是一个**工程质量明显高于平均水平的中小型全栈项目**。以下几点做得很好，值得肯定：

| 已做好的事项 | 位置 |
|---|---|
| 全站登录门禁（proxy + RLS authenticated 读 **双防线**） | `src/proxy.ts` + `20260811000000_require_auth_for_content_read.sql` |
| 认证鉴权集中在 `auth.ts`，admin API 100% 走 `checkSupabaseAdmin` | `src/lib/auth.ts` |
| 基于 IP 的滑动窗口限流 + 预设策略 | `src/lib/rate-limit.ts` |
| favorites 严格用验证后的 `user.id` 过滤，无 IDOR | `src/app/api/favorites/route.ts` + `db-favorites.ts` |
| 所有查询走 Supabase 参数化，无 SQL 注入面 | 全部 API |
| 内容表无任何 anon 写权限；SECURITY DEFINER 函数设了 `search_path=''` | 21 个 SQL 文件审计 |
| auth/callback 开放重定向防护到位 | `src/app/auth/callback/route.ts` |
| 克重全链路强制从 `percentage` 派生，无"算错克重"路径 | `db-formula.ts:251,519` |

### 最需要关注的 3 件事（按紧急度）

1. **🔴 配方写入无事务 + 并发静默覆盖**（`db-formula.ts:490-532`）——管理员保存配方时，若组件插入失败，旧组件已被删光 → **配方变空壳、数据丢失**；两个管理员并发新建同名配方 → **后者静默覆盖前者全部数据**。这是唯一可能造成"数据永久丢失"的问题。
2. **🟠 `npm run lint` 当前是红的（9 errors）**——Vercel 部署只跑 build 不跑 lint，红灯被静默忽略；且无 CI，合并前零自动检查。
3. **🟠 公共 GET API 只有 proxy 一道路由级门禁**——当前 RLS 第二道防线有效，但纵深不足；API 层加一行 `requireSupabaseAuth` 成本极低。

---

## 二、发现清单（按优先级）

### 🔴 P0 — 数据完整性（建议立即处理）

#### F1. `saveFormula` 无事务 + "先删后插" → 组件全丢
- **位置**：`src/lib/db-formula.ts:506-532`
- **问题**：保存配方 = `upsert 主行 → delete 全部 formula_components → insert 新组件` 三步，无事务。第 3 步 insert 失败（约束违反等）时主行已保存、旧组件已删光。
- **影响**：配方变空壳，数据永久丢失。
- **建议**：将三步包进 Postgres RPC 事务（`rpc()` 单事务 SQL），或 insert 失败时回滚删除前的旧组件。

#### F2. `saveFormula` 并发撞 ID → 静默覆盖
- **位置**：`src/lib/db-formula.ts:490-502`（对比 `saveColor` 在 411-414 有 23505 显式报错）
- **问题**：POST 新建配方用 `upsert`，两个管理员基于同一份列表并发新建时 `generateUniqueFormulaId` 生成相同 ID → 静默覆盖既有配方的主行与全部组件，无任何冲突提示。
- **影响**：管理员数据被静默覆盖。
- **建议**：POST 用 `.insert().select()` 并捕获 23505 返回冲突错误；PUT 才允许 upsert。

### 🟠 P1 — 安全纵深 / 事务 / 校验

#### F3. 公共 GET API 路由内零鉴权（单点门禁）
- **位置**：`src/app/api/{brands,colors,formulas,settings,toners,tds}/route.ts`（`regions` 无路由内鉴权但有限流）
- **问题**：仅依赖 `src/proxy.ts` 全站门禁，路由内无 `requireSupabaseAuth`。当前读走 `createClient()`（受 RLS 保护）是有效的第二道防线，但 proxy 被绕过（matcher 失效、部署差异、未来新增路径）即裸奔。
- **建议**：这些 GET handler 各加一行 `requireSupabaseAuth`（登录即可），成本极低，纵深拉满。

#### F4. 内部错误信息回传客户端
- **位置**：`src/lib/api-error.ts:24`（safeJson）、`src/app/api/favorites/route.ts:29,73,93`、`src/app/api/regions/route.ts`、`src/app/api/tds/route.ts`、`admin/{colors,tds,tds-categories,tds-upload,toners}/route.ts`
- **问题**：把 DB/Postgrest 原始错误消息直接返回给客户端，泄露表结构、约束名、存储细节。公共端点（favorites/regions/tds）普通登录用户即可触发。
- **建议**：统一 `jsonError` 只回通用文案（如"服务器内部错误"），真实错误仅进 `console.error` 服务端日志。

#### F5. 其他写函数均无事务
- **位置**：`src/lib/db-formula.ts:383-479`（saveColor）、`:84-102`（saveColorYears）、`:312-374`（saveFormulaType）
- **问题**：均为多步"先删后插/多表顺序写"，中途失败留半成品（丢变体关联 / 丢年份 / 半迁移状态）。
- **建议**：与 F1 一并引入事务 RPC；`saveColorYears` 并入 `saveColor`。

#### F6. `validateFormula` 校验漏洞
- **位置**：`src/app/api/admin/formulas/route.ts:7-38`
- **问题**：Three Stages 配方**不要求两组都非空**——允许"只有 Pearl Paint、没有 Ground Paint"或"空组件列表"通过；而 UI（`FormulasPanel.tsx:81-85`）要求两组都 =100，**两端校验不一致**。
- **建议**：Three Stages 强制每组非空且各 =100，空组件列表直接拒绝。

#### F7. 遗留默认密码明文泄露
- **位置**：`supabase-schema.sql:27-29`
- **问题**：硬编码 bcrypt 哈希 + 注释明文写出默认密码 `admin123`。虽然 `users` 表已被 Supabase Auth 取代（遗留资产），脚本仍在仓库，误执行即产生已知密码账号。
- **建议**：删除该文件或标注废弃，并确认真实库中 `public.users` 表未被使用。

#### F8. `npm run lint` 已红（9 errors）
- **位置**：8 个 `no-require-imports`（`ColorFormFields.tsx` 等）+ 1 个 ESLint 配置内部错误（`ColorFormFields.tsx:67:61 "This value cannot be modified"`）；43 个 warnings
- **问题**：退出码 1，但 Vercel 部署只跑 build 不跑 lint，红灯被静默忽略。
- **建议**：修复 9 个 error + 在 `lint` script 加 `--max-warnings=0` 或 CI 兜底（见 F9）。

#### F9. 无 CI，合并前零自动检查
- **位置**：无 `.github/workflows/`，Vercel 部署即唯一 build 闸门
- **影响**：lint 红、无测试，代码质量问题只会在生产 build 失败时暴露（历史提交里已出现过一次部署失败）。
- **建议**：加 GitHub Actions：`pnpm install → lint → typecheck → build`（可加 Dependabot）。

### 🟡 P2 — 健壮性 / 可维护性

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| F10 | favorites 快照字段无长度限制，普通用户可写超大字符串污染表 | `db-favorites.ts:52-57` | 服务端 trim + 长度上限 |
| F11 | tds-upload 图片存**公开 bucket** `tds-images`，URL 匿名可访问、无内容审核 | `admin/tds-upload/route.ts:6,53` | 换私有 bucket + 签名 URL，或接受设计并标注 |
| F12 | auth/callback 登录失败重定向的 origin 取自请求 Host 头，存在 Host 头注入面（Vercel 托管风险低，自托管需注意） | `src/app/auth/callback/route.ts` | 用配置的 `NEXT_PUBLIC_SITE_URL` 代替 |
| F13 | `grams_per_100g` 与 `percentage` 冗余列：读路径完全忽略前者，绕过 saveFormula 直接改库会造成两列不一致且被掩盖 | `db-formula.ts:251` | 加 DB CHECK `grams_per_100g = percentage` 或去掉冗余列 |
| F14 | `getFormulas` 组件子查询无 ORDER BY，展示顺序无契约 | `db-formula.ts:130` | 显式 `.order("id")` |
| F15 | `KapciFormulaTable` 精度分层不统一（calcWeight 3 位 / handleWeightChange 1 位 / volume 3 位），手工改克重后 Total 与换算值漂移 0.001-0.005 | `KapciFormulaTable.tsx:38-134` | 把按比例缩放逻辑抽进 `units.ts` 统一精度 |
| F16 | `KapciFormulaTable` useEffect 依赖 `formula.components`（引用），FormulaDrawer 无关重渲染会重算权重、覆盖用户正在编辑的克重 | `KapciFormulaTable.tsx:93-100` | 依赖改为 `formula.id` + JSON 序列化或 memo |
| F17 | `color_years` 残留：API 仅当请求带 `years` 字段才调用 saveColorYears，漏传则旧年份不清理 | `admin/colors/route.ts:34-36,65-67` | 缺省 `years: []`，年份 sync 并入 saveColor 事务 |
| F18 | 大文件：`color-library/page.tsx`（995）、`SearchResults.tsx`（619）、`db-formula.ts`（563）、`SearchPanel.tsx`（443） | 各文件 | 按职责拆组件/模块（P3 基建里一并规划） |
| F19 | 死代码：`src/lib/db.ts` 整文件（106 行 users 表 CRUD 零调用方）；`color-photo.ts` 2 个导出零调用；`i18n/nl.ts` 未注册孤儿文件；`auth/me` DELETE 为 no-op 零调用 | 多文件 | 删除；`supabase-schema.sql` 中 users 表相关同步标注废弃 |
| F20 | README 过时：写"Material-UI + JWT/bcrypt"，实际 shadcn/base-ui + Supabase Auth | `README.md` | 更新技术栈/认证说明 |
| F21 | 游离 SQL 未归拢：根目录 10 个 `supabase-*.sql` 不在 `supabase-migrations/`；迁移注释要求"Dashboard SQL Editor 手工执行"，无版本化管理、无 CI 校验 | 根目录 | 归拢进 `supabase-migrations/`，标注已应用历史脚本 |
| F22 | TS 严格度未开：`noUnusedLocals` / `noUncheckedIndexedAccess` / `noImplicitReturns` 未启用；ESLint unused-vars 仅 warn | `tsconfig.json` / `eslint.config.mjs` | 逐个开启并修复 |
| F23 | 无 Prettier，格式靠手写约定 | — | 引入 Prettier + editorconfig |
| F24 | 公共读 API 全量拉取：`getColors`/`getFormulas` 全表全列、无分页，客户端每次搜索全量 fetch 再本地过滤 | `db-formula.ts:106-146`、`src/app/page.tsx:38-47` | 读接口加列裁剪/分页或服务端过滤 |

### 🟢 P3 — 信息级 / 优化

| # | 问题 | 位置 | 说明 |
|---|---|---|---|
| F25 | 零测试基础设施 | 全项目无 test/spec 文件 | 渐进补：先给纯逻辑（`units.ts`/`id-generator.ts`/`rate-limit.ts`/`formula-utils.ts`）加 vitest 单测，再组件测试 |
| F26 | `roundTo` 用 `Math.round(n*p)/p`，浮点边界值（如 1.005）有经典误差 | `units.ts:69-72` | 低危；若要精确可用 `toFixed` 或乘除法归一 |
| F27 | profiles 表无 UPDATE/DELETE 策略（用户无法改自己的 profile） | `profiles-setup.sql` | 当前是安全的（防改 role）；未来如需"改昵称"需加策略，注意与 role 更新区分 |
| F28 | analytics POST 设计为公开埋点，但 proxy 门禁实际要求登录，未登录用户的埋点全部被 401 丢弃 | `src/proxy.ts` / `api/analytics/route.ts` | 行为不一致：埋点数据缺失或 proxy 白名单需加 `/api/analytics` |
| F29 | `framer-motion` 仅首页装饰动画（ShinyText/SplitText）使用，包体积不小 | `package.json` | 评估是否值得保留，可换 CSS 动画 |
| F30 | `docs/adr/` 空目录：有 ADR 规范但无任何记录 | `docs/adr/` | 把本次重大决策（如事务 RPC 方案）记一条 ADR 起步 |
| F31 | proxy 注入的 `x-user-id`/`x-user-email` header 无任何下游消费（下游全用 `getUser()` 验证） | `src/proxy.ts:61-63` | 冗余但无害；可保留或移除 |

---

## 三、与行业标准做法的对照

你最初问"行业标准做法 + 针对本项目推荐"。本次走查结果印证了之前的建议，对照如下：

| 行业标准做法 | 项目现状 | 推荐落地 |
|---|---|---|
| **自动化静态分析 + CI 门禁**（lint→typecheck→test→build） | ❌ 无 CI；lint 已红（9 errors）被静默 | **最高优先**：GitHub Actions + lint/typecheck 修复 |
| **PR 代码评审 / AI 第二双眼睛** | 单人开发，无评审环节 | 本次走查即"AI 第二双眼睛"的实例；结论按优先级整改 |
| **事务性写入**（ACID） | ❌ 4 个写函数均无事务 | 紧接优先：saveFormula 事务 RPC |
| **纵深防御**（路由层 + 数据层双防线） | 🟡 proxy + RLS 双防线已在，但公共 API 路由内无鉴权 | 公共 GET API 加 `requireSupabaseAuth` |
| **输入校验规范化**（服务端为准） | 🟡 UI 与 API 校验不一致（F6） | 校验收敛到服务端 |
| **敏感信息治理**（密钥/口令不入库、不留注释） | 🟡 `admin123` 明文注释残留 | 清理遗留脚本 |
| **架构决策记录（ADR）** | ❌ `docs/adr/` 空目录 | 事务方案/死代码清理各记一条 |
| **统一格式化（Prettier）** | ❌ 无 | 低成本，与 lint 一并引入 |
| **测试金字塔** | ❌ 零测试 | 渐进：纯逻辑单测起步，不要求一步到位 |
| **依赖安全扫描**（Dependabot/Snyk） | ❌ 无 | 开 GitHub 内置 Dependabot |

---

## 四、建议整改路线图

按"风险优先、每步可独立落地"排序：

1. **本周（数据安全）**：F1/F2 —— `saveFormula` 事务化 + POST 防覆盖（RPC 事务 SQL + insert 冲突检测）
2. **本周（纵深）**：F3/F4 —— 公共 GET API 加鉴权；错误信息统一脱敏
3. **本周（门禁）**：F8/F9 —— 修复 lint 9 errors + 建 GitHub Actions（lint+typecheck+build）
4. **两周内（数据一致性）**：F5/F6/F7/F17 —— 其余写函数事务化、validateFormula 补全、遗留脚本清理
5. **两周内（可维护性）**：F19/F20/F21/F22/F23 —— 死代码删除、README 更新、SQL 归拢、TS 严格度
6. **一个月内（性能/测试）**：F24 读接口分页；F25 纯逻辑单测起步；F18 大文件拆分

每项整改完成后，建议回 `npm run lint` + `npm run build` 验证，并更新本报告对应条目状态。

## 六、已修复项（2026-08-12 当日完成）

> 经用户确认，本次整改从 P0/门禁开始，修复结果如下：

| 原条目 | 状态 | 修复内容 |
|---|---|---|
| F1（saveFormula 无事务） | ✅ 已修复 | 新增 RPC `save_formula_with_components`（`supabase-migrations/20260812000000_save_formula_transaction.sql`），主行+组件同步收进单个 DB 事务；`saveFormula` 改调 RPC（`src/lib/db-formula.ts`） |
| F2（并发撞 ID 静默覆盖） | ✅ 已修复 | RPC `p_is_new=true` 时 `INSERT ON CONFLICT DO NOTHING` + 撞 ID 抛 23505；POST 路由返回 **409 冲突**（`src/app/api/admin/formulas/route.ts`） |
| F5 部分（admin/formulas 缺 try/catch） | ✅ 已修复 | POST/PUT 加 try/catch，错误统一转 JSON 500，不再返回默认 HTML 500 |
| F8（lint 红：9 errors） | ✅ 已修复 | ESLint ignores 排除 `.firecrawl/`、`_tmp_extract/` 工具目录；`idManuallyEdited` prop 改名 `idManuallyEditedRef` 通过 react-hooks/immutability 规则。现 **0 errors / 42 warnings** |
| F9（无 CI） | ✅ 已修复 | 新增 `.github/workflows/ci.yml`：push/PR 跑 `npm ci → lint → typecheck → build` |
| F22 部分（无 typecheck script） | ✅ 已修复 | package.json 新增 `typecheck: tsc --noEmit` |
| F3（公共 GET API 零鉴权） | ✅ 已修复 | 新增轻量 `requireLogin()`（`src/lib/auth.ts`），7 个公共 GET 路由（brands/colors/formulas/settings/toners/tds/regions）均加路由级纵深防御 |
| F4（内部错误回传客户端） | ✅ 已修复 | `jsonError` 中心化脱敏为通用文案；admin/colors、admin/tds、admin/tds-categories、admin/tds-upload、admin/toners、regions、tds、favorites 全部改为仅 console.error + 通用文案（业务错误如"ID 已存在"保留回传） |
| F5 部分（saveColor/saveColorYears 无事务） | ✅ 已修复 | 新增 RPC `save_color_with_components`（`supabase-migrations/20260812000001_save_color_transaction.sql`），主行+变体映射+年份收进单个事务；`saveColorYears` 并入 RPC 后删除；POST/PUT 撞 ID 走 23505 → 409/500 脱敏。**待执行迁移后生效** |
| F9 年份残留 | ✅ 已修复 | `saveColor` 新增 `years` 参数，缺省空数组 → 事务内清空旧年份（不再残留） |
| F6（validateFormula 校验漏洞） | ✅ 已修复 | Three Stages 强制 Pearl/Ground 两组非空且各 =100；非 Three Stages 空组件列表直接拒绝（`src/app/api/admin/formulas/route.ts`，与 FormulasPanel UI 校验对齐） |
| F7（遗留 admin123 明文泄露） | ✅ 已修复 | `supabase-schema.sql` 文件头加醒目废弃标注（遗留认证方案，含已知密码；禁止误执行），文件保留供审计 |
| F20（README 过时） | ✅ 已修复 | 技术栈更正为 shadcn/ui + Base UI + Supabase Auth；Node 20+；环境变量对齐 `.env.example` 并注明 service_role 严禁进客户端 |
| F19（死代码） | ✅ 已修复 | 删除 `src/lib/db.ts`（106 行 users CRUD）、`src/lib/i18n/nl.ts`（未注册孤儿语言）、`color-photo.ts` 的 2 个零调用导出（保留 `getColorPhotoCandidates`）、`auth/me` 的 no-op DELETE |
| F5 剩余（saveFormulaType 无事务） | ✅ 已修复 | 新增 RPC `save_variant_with_relink`（`supabase-migrations/20260812000002_save_variant_transaction.sql`），变体重命名 5 步引用迁移收进单个事务；`saveFormulaType` 改调 RPC。**待执行迁移后生效** |
| F21（游离 SQL 未归拢） | ✅ 已修复 | 新建 `supabase/sql-index.md` 索引：10 个游离脚本逐一标注状态（活跃/已应用/废弃）、幂等性、备注；新变更一律走 `supabase-migrations/` |

**遗留待办**（后续批次）：F23 Prettier（一次性全项目格式化，diff 噪音大）、F24 读接口分页/列裁剪（数据量增长后的性能）、F25 测试起步（纯逻辑单测）、F10 favorites 快照长度上限（低优先）。

**注意**：第二批修复（颜色事务）需在 Supabase 执行迁移 `supabase-migrations/20260812000001_save_color_transaction.sql` 后生效（线上库跑一次即可，函数幂等可重复执行）。

---

## 五、方法说明

- 安全：亲读 `src/proxy.ts`、`src/lib/auth.ts`、`rate-limit.ts`、`db-favorites.ts`、supabase 客户端层；派代理全覆盖 22 个 API 路由与 21 个 SQL 文件的权限面
- 数据：派代理通读 `db-formula.ts`（563 行）+ `KapciFormulaTable`/`SearchResults` 展示链路；亲读纯逻辑（`units.ts`/`id-generator.ts`/`formula-utils.ts`）
- 可维护性：死代码扫描 + i18n 13 语言 key 完整性核对 + 前端 API 引用一一对应验证
- 性能：查询模式分析（无 N+1、全量拉取）、依赖体积抽查
- 未修改任何代码；`lint`/`build` 仅用于验证

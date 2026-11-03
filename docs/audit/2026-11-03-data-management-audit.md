# Data Management 完整筛查报告

检查日期：2026-11-03（Asia/Shanghai）。代码基准：`164761888948a6c422fd2372cae5b383cf99ba30`。

结论：发现 **13 项已复现的问题，以及 3 项由代码/SQL 确认的操作风险**。优先处理管理员进入后台的跳转竞争、创建操作覆盖旧记录、图片上传串记录，以及品牌删除的级联告警。此次只检查并生成报告，没有修改业务代码、执行线上写入或重新部署。

## 范围、证据与限制

- 覆盖品牌/产地、颜色、配方类型、配方、文档/分类、分析中心六个页面，全部 13 个 admin API 路由，以及相关认证、数据库映射、事务 RPC 和 Storage 清理逻辑。
- 使用实际 Next.js 页面、API handler 和数据库访问代码，在 `localhost:3005` 连接隔离的 Supabase HTTP 测试替身；测试写入只发生在内存夹具中。浏览器请求竞争、表单交互、请求参数和响应均来自实际业务代码。
- 线上 Supabase 仅执行 SELECT、计数和 OpenAPI 元数据读取。没有创建账号、发送邮件、修改权限、调用写入 RPC、上传文件或删除业务数据。
- 真实 PostgreSQL 的外键/事务性删除没有在线上执行；这部分明确列为代码/SQL 风险，隔离 HTTP 替身不能证明生产数据库约束、触发器或并发事务行为。
- Chrome/Chromium 检查了 375、414、768、1024px 下六个页面的切换、基础渲染和页面水平溢出，共 24 个组合。具体表单复现主要在桌面视口完成，不能理解为每个断点的每条 CRUD 路径均已完整验收。

## 验证结果

| 检查 | 结果 |
|---|---|
| 单元测试 | 11 个文件，39/39 通过 |
| 现有浏览器测试 | 桌面/移动端 28/28 通过；使用临时配置接入隔离测试环境，未改仓库测试配置 |
| TypeScript | `npm run typecheck` 通过 |
| 页面基础检查 | 24 个页面/视口组合未发现页面级水平溢出或未捕获 JS 异常 |
| 匿名访问管理 API | 对全部 13 个路由各抽取一个支持的方法，均返回 401；并非逐一枚举每个 HTTP 方法 |
| 普通用户授权 | 实际 `checkSupabaseAdmin` 在隔离依赖下返回 403 |
| 管理 RPC | 仓库存在撤销普通角色执行权限的迁移；线上匿名 OpenAPI 不暴露三个写入 RPC，service role 元数据可见。未尝试线上写调用 |
| 构建与 Lint | 同一业务代码在本聊天前面的发布步骤中构建通过；Lint 为 0 errors、43 warnings。本次未重复构建和 Lint |

现有自动化测试通过不代表后台没有 bug：目前两个 E2E 文件主要覆盖登录、注册、找回密码，单元测试也没有覆盖后台 CRUD 组件和写入路由。

线上只读快照：30 个品牌、136 条颜色、132 条配方、28 份文档、8 个文档分类、3 个配方类型。统计值会随时间和业务数据变化。

## 已复现的问题

### B01 · P1 · 管理员直接打开或刷新后台，会被提前重定向

**触发方式**：已有有效管理员会话，直接打开 `/admin/data`；让浏览器查询 `profiles.role` 延迟 300ms。

**实际结果**：服务端 layout 已通过管理员检查，但客户端先把用户设为 `role: "user"` 并结束 loading。后台 effect 随即执行 `/login` 跳转，之后登录页还可能把已有会话的用户送回首页。隔离浏览器两次分别观察到最终落到登录页/首页。从首页等待角色加载完成，再点击 Data Management 则可以进入。

**原因与位置**：[AuthContext.tsx](/D:/Projects/hiwe-formula-search/src/components/AuthContext.tsx:21) 早于异步角色查询结束 loading；[data/page.tsx](/D:/Projects/hiwe-formula-search/src/app/admin/data/page.tsx:69) 将角色尚未确认当作非管理员。

**建议**：区分“会话已加载”和“角色已确认”；授权未完成时不重定向。也可由已校验的服务端用户初始化后台状态。保留服务端 layout 和 API 权限检查。

### B02 · P1 · “新增”遇到重复 ID，会覆盖旧记录

**触发方式**：新建品牌、文档或文档分类，提交已存在的 ID。相同名称自动生成相同 slug，也是正常界面中可达的触发方式。

**实际结果**：三个 POST 路径均返回 201；隔离夹具中的旧品牌名称/产地、文档正文、分类名称被新值替换。文档未提供的内容字段还会被写成空内容。请求实际使用了 Supabase 的 merge/upsert 语义。

**位置**：[saveBrand](/D:/Projects/hiwe-formula-search/src/lib/db-formula.ts:276)、[saveGuideCategory](/D:/Projects/hiwe-formula-search/src/lib/db-tds.ts:49)、[saveGuide](/D:/Projects/hiwe-formula-search/src/lib/db-tds.ts:72)。配方类型创建 RPC 同样使用冲突更新，具有相同风险。颜色和配方的创建路径已有防覆盖保护，不能将此问题扩大到所有创建接口。

**建议**：POST 使用 INSERT，重复主键返回 409；编辑使用 UPDATE，并验证目标存在。不要只依靠客户端查重。

### B03 · P1 · 上传图片时切换配方，会把图片填入另一条记录

**触发方式**：选择配方 A，开始上传图片；请求返回前点击配方 B，再释放上传响应。

**实际结果**：当前配方 ID 为 B，图片框却填入 A 的图片 URL。上传期间“保存配方”仍然可点击。此时保存会把图片关联到 B；也可能在上传尚未完成时保存旧 URL。

**位置**：[FormulasPanel.handleUploadImage](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/FormulasPanel.tsx:149) 回调直接更新当时的当前表单，没有核对发起上传的记录。文档封面上传也使用相同回调方式，需要一并修复和回归。

**建议**：上传任务绑定记录和请求版本；切换记录后丢弃旧响应。上传期间禁用保存，或明确等待上传完成。

### B04 · P2 · 配方“适用年份”选择后不会保存

**触发方式**：表单选 2024 年，保存后重新读取配方。

**实际结果**：请求体有 `year: 2024`，实际 RPC 参数没有任何 year 字段，GET 映射也不返回 year。隔离往返读取变为无年份；线上只读检查确认 `formulas.year` 当前不存在，查询返回 42703。

**位置**：[FormulasPanel 年份输入](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/FormulasPanel.tsx:467)、[saveFormula](/D:/Projects/hiwe-formula-search/src/lib/db-formula.ts:390)、[mapFormulaRow](/D:/Projects/hiwe-formula-search/src/lib/db-formula.ts:258)。[searchFormulas](/D:/Projects/hiwe-formula-search/src/lib/search-formulas.ts:68) 也按颜色年份展开，没有限制每条配方的年份。

**建议**：先确定业务规则：若年份仅属于颜色，移除配方年份控件；若每份配方确实有自己的适用年份，则补齐数据库、RPC、读回和搜索过滤。只修表单状态无法解决。

### B05 · P2 · 配方类型允许自由改名，但配方接口只接受三个固定名称

**触发方式**：在“配方类型”中将 `Two Stages` 改为“双层配方”，再在 1K 配方中选择该名称。

**实际结果**：类型管理保存成功，配方表单也允许选择；提交配方时返回 400：`1K 体系只能选择 Two Stages 或 Three Stages`。数据库定义也将 formula_type 限为固定值。

**位置**：[VariantsPanel.handleSave](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/VariantsPanel.tsx:42)、[配方类型选项](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/FormulasPanel.tsx:486)、[validateFormula](/D:/Projects/hiwe-formula-search/src/app/api/admin/formulas/route.ts:18)。

**建议**：使用稳定业务代码保存 Single/Two/Three Stage，显示名称独立管理；短期可以限制三个内置类型的名称和删除，避免管理界面制造不可保存的选项。

### B06 · P2 · 配方 API 未完整验证组件结构和数值

**触发方式与实际结果**：

- 提交两条组件，percentage 分别为 -20 和 120，总和 100：实际 API 返回 201，并向保存 RPC 发送这两个数值。
- 提交合法 id/color_id 但缺少 components：在 `.some()` 处抛异常，实际 API 返回无结构化错误的 500。

**位置**：[validateFormula](/D:/Projects/hiwe-formula-search/src/app/api/admin/formulas/route.ts:18)。UI 将单项限制在 0–100，但服务器不能依赖 UI；UI 总和容差为 0.01，API 为 1，也不一致。

**建议**：在任何属性访问前验证对象/数组结构；逐项验证有限数值、范围、色母代码和分组，统一容差。不合法请求返回 400。此次只验证了路由放行和 RPC 参数，没有往生产库写入非法比例。

### B07 · P2 · 颜色表单允许冲突年份，最终保存失败且错误提示错误

**触发方式**：同一颜色先添加单年 2020，再添加区间 2020–2025。浏览器确认两项都可以加入。

**原因**：前端只按“起始年 + 结束年”去重；实际表主键为 `(color_id, year)`，两项起始年相同就冲突。事务插入会遇到 23505。[saveColor](/D:/Projects/hiwe-formula-search/src/lib/db-formula.ts:348) 又把所有 23505 都翻译成“颜色 ID 已存在，无法重复新增”，即使正在编辑旧颜色。

**位置**：[addYearEntry](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/ColorsPanel.tsx:218)、[主键定义](/D:/Projects/hiwe-formula-search/supabase-formula-schema.sql:251)。线上只读元数据确认 year 是复合主键成员；数据库错误转译也通过实际函数隔离调用复现。

**建议**：前后端按实际主键阻止同起始年重复，或规范化合并年份区间；按具体约束区分年份冲突与颜色 ID 冲突。原有事务机制可避免这次保存留半成品。

### B08 · P2 · 编辑文档会把原有排序清零

**触发方式**：打开 sort_order=7 的文档，不修改排序，直接保存。

**实际结果**：真实页面提交 `sortOrder: 0`，隔离数据库请求写入 `sort_order: 0`。线上 28 份文档中有 22 份原本非零排序，因此这个问题会影响现有内容顺序。

**位置**：[TdsPanel.handleSave](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/TdsPanel.tsx:186)。表单状态没有保留原有 sortOrder。

**建议**：编辑时携带原排序，或服务端更新未提供排序时保持旧值。是否增加排序编辑入口可以另行决定。

### B09 · P2 · 分析中心统计被结果条数上限截断，已影响线上数字

**验证方式**：以真实数据库为只读数据源，调用当前 `getEventTypeCounts(90)` 和 `getUniqueVisitors(90)`；再按每页 1,000 条完整分页，对同一时间窗口重新汇总。

**快照结果**：

| 90 天指标 | 当前代码结果 | 完整分页对账 |
|---|---:|---:|
| 页面访问 | 589 | 1,306 |
| 搜索 | 257 | 630 |
| 配方查看 | 154 | 347 |
| 配方操作 | 未计入 | 2 |
| 独立访客 | 78 | 128 |
| 用于各事件计数的记录总数 | 1,000 | 2,285 |

这是检查时的快照；90 天滚动窗口会随时间移动，后续复查数字可以略有变化。更早的只读查询也观察到 2,290 条匹配事件仅返回 1,000 条。

**位置**：[getUniqueVisitors](/D:/Projects/hiwe-formula-search/src/lib/db-analytics.ts:126)、[getEventTypeCounts](/D:/Projects/hiwe-formula-search/src/lib/db-analytics.ts:136)。其他统计部分使用 `.limit(5000)`，但没有完整分页；不能据此认为统计完整。

**建议**：在数据库内做 count/distinct/group by 聚合；若临时采用客户端汇总，必须完整分页并保持稳定排序。数据库查询失败也应显式返回错误，不能用 0 和空数组表示“没有业务数据”。

### B10 · P2 · 分析中心切换天数时，旧响应可覆盖新结果

**触发方式**：先点 90 天并延迟响应，随后点 7 天，让 7 天先返回，再释放 90 天请求。

**实际结果**：标签显示“独立访客（7天）”，数值却来自 90 天响应；页面访问和搜索次数同样被覆盖。

**位置**：[AnalyticsPanel.fetchData](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/AnalyticsPanel.tsx:101)。没有 AbortController 或请求版本判断。

**建议**：取消旧请求或只接纳最新请求结果，并让 loading/error 同样受请求版本控制。

### B11 · P2 · 多个列表加载失败，会伪装成空数据库

**触发方式**：让颜色列表接口返回 500。

**实际结果**：页面显示 `Found 0`，不显示失败原因或重试入口。品牌、配方类型、配方和文档列表也有同样的 `if (res.ok) ...; catch {}` 结构；关联选项请求失败还会变成空下拉框。

**位置**：[ColorsPanel.fetchColors](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/ColorsPanel.tsx:79)、[FormulasPanel.fetchFormulas](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/FormulasPanel.tsx:104)、[TdsPanel.fetchGuides](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/TdsPanel.tsx:85)。

**建议**：区分加载中、真正空数据、请求失败。显示可重试错误；编辑依赖数据未成功加载时，不允许误以为空列表继续保存。

### B12 · P2 · 移动端触摸尺寸不符合项目约定

**实测**：375/414px 下，后台菜单和新增按钮为 36×36px，列表编辑/删除/翻页按钮多为 32×32px；文档分类选择器高 32px。项目要求至少 44×44px。

**位置示例**：[后台菜单](/D:/Projects/hiwe-formula-search/src/app/admin/data/page.tsx:99)、[品牌移动新增按钮](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/BrandsPanel.tsx:395)、[配方分页按钮](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/FormulasPanel.tsx:426)。

**建议**：仅用 `max-md:` 扩大交互区域，保持桌面基础样式；补齐无文字图标按钮的 aria-label。没有发现页面级水平溢出，不应将触摸尺寸问题描述成页面整体不可用。

### B13 · P2 · 删除共享图片时，没有检查其他配方引用

**触发方式**：两份配方手工填写同一个 Storage URL，删除其中一份。

**实际结果**：隔离 API 调用确认，另一份配方仍保存该 URL，接口却已向 Storage 发送 `DELETE shared.png`。替换图片后的客户端清理也没有检查其他记录引用。

**位置**：[配方删除后的图片清理](/D:/Projects/hiwe-formula-search/src/app/api/admin/formulas/route.ts:152)、[替换图片后的旧图删除](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/FormulasPanel.tsx:212)。

**建议**：清理前检查引用，或让图片具有明确的单记录所有权。线上只读快照有 14 条带图配方，当前未发现共用 URL；这是可复现的条件性 bug，不代表线上已经出现图片丢失。

## 代码/SQL 确认的操作风险

### R01 · P1 · 删除品牌没有提示颜色和配方的级联影响

品牌表单只确认“确定删除品牌……吗”，API 随即删除品牌。仓库 SQL 定义的链路为品牌 → 颜色 → 配方 → 色母组件逐级 CASCADE。相比之下，颜色删除已有查询配方清单并二次确认的保护。

线上只读核查发现，关联最多的一个品牌有 **41 条颜色、48 条配方**。按仓库外键定义，一次品牌删除可影响这些记录。没有在线上执行删除，也没有通过数据库管理通道逐条核验生产约束。

位置：[handleDeleteBrand](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/BrandsPanel.tsx:139)、[deleteBrand](/D:/Projects/hiwe-formula-search/src/lib/db-formula.ts:286)、[颜色外键](/D:/Projects/hiwe-formula-search/supabase-formula-schema.sql:59)。

建议：与颜色删除一样，返回关联数量和预览，再显式确认；或者业务上禁止删除仍有关联数据的品牌。

### R02 · P2 · 文档分类删除提示与外键策略不匹配

提示说“该分类下的文档不会被删除”，但 category_id 非空且 ON DELETE RESTRICT。有关联文档时，按仓库 SQL 无法删除分类，API 仅回通用“删除失败”。

位置：[handleDeleteCategory](/D:/Projects/hiwe-formula-search/src/app/admin/data/components/TdsPanel.tsx:240)、[分类外键](/D:/Projects/hiwe-formula-search/supabase-formula-schema.sql:205)。

建议：提前显示引用数量，并要求先迁移文档或只允许删除空分类。此项没有在线上执行外键删除验证。

### R03 · P2 · 删除配方类型只删目录，旧镜像和引用仍保留

创建/改名会维护 formula_types 与 color_variants 两套数据；删除却只删 formula_types。隔离实际 API 路径确认，目录中的类型消失后，color_variants 镜像及旧配方的 variant_id 仍保留。未在生产库执行类型删除，也未排除仓库之外另有数据库触发器的可能。

位置：[deleteFormulaType](/D:/Projects/hiwe-formula-search/src/lib/db-formula.ts:309)。

建议：先决定这两套概念是否确实需要分开；删除时用事务统一处理引用，或禁止删除正在使用的内置类型。不能简单级联清空历史配方来消除残留。

## 优化建议

1. **保存和离开行为**：各编辑器增加 saving 状态，避免重复提交；切换记录、Tab、返回或关闭弹窗前提示未保存修改。上传任务的身份与离开行为一起设计。
2. **数据加载和性能**：列表现在全量拉取后在浏览器分页。当前 132 条配方尚不大，但达到数据库行数上限后，可能漏记录、漏搜索、生成碰撞 ID。逐步改成服务端分页/搜索，关联选择器按需搜索；先修统计完整性，再做查询优化。
3. **表单查找体验**：配方搜索提示“代码或名称”，实现仅查配方 ID 和颜色代码，未查颜色名称。文档类型筛选缺少“全部类型”选项，选过具体类型后无法在该控件内清除。可作为小范围体验修正。
4. **响应式与规范**：品牌编辑、颜色编辑、色母下拉仍使用 `window.matchMedia` 做 UI 分支，与项目 CSS-only 规范不一致；动态旋转/缩放后也可能保留旧交互状态。优先消除这些分支，并仅在移动前缀下调整尺寸。组件中散落的 interface 和既有 Lint warnings 可分批清理，不需要在修 bug 时顺带重构整个模块。
5. **图片生命周期**：补齐取消上传、重复替换、删除颜色/品牌后的孤儿文件清理。清理应建立在引用/所有权规则上，避免修空间浪费时误删仍在使用的图片。
6. **后台测试覆盖**：新增管理员角色延迟、POST 重复 ID、年份往返、非法组件、图片上传切换、排序保持、颜色年份冲突、统计分页和请求乱序、级联删除确认等回归测试。现有认证测试继续保留。

## 建议修复顺序与验收

| 批次 | 内容 | 最小验收 |
|---|---|---|
| 1 | B01、B02、B03、R01 | 后台直达/刷新稳定；重复创建返回 409 且旧数据完整；上传不串记录；品牌删除前能看到关联影响 |
| 2 | B04–B08、R02、R03 | 明确年份归属并完成往返；内置类型可用；非法数据返回 400；年份冲突提示正确；文档顺序保持；分类/类型删除符合业务规则 |
| 3 | B09–B13 | 统计与数据库聚合一致；只展示最后一次查询；加载失败可重试；375/414px 触摸目标达标且桌面不变；共享图片仍可访问 |
| 4 | 其余优化 | 按需分页/搜索、未保存提示、后台 CRUD 测试纳入 CI |

此次发现的问题均未自动修复。报告没有提交到 GitHub，也没有变更生产部署。

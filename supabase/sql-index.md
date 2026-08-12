# 根目录游离 SQL 脚本索引

> 背景：这些脚本不在 `supabase-migrations/`（时间戳迁移）内，是历史手工脚本（Dashboard → SQL Editor 执行）。
> 本索引标注每个脚本的**状态 / 用途 / 幂等性**，避免重复执行或误执行。

## 状态图例

- 🟢 **活跃**：当前建表/工作流仍会用到，可安全重复执行
- ⚪ **已应用**：一次性迁移/回填/修复，历史已执行，**请勿再次执行**
- 🔴 **已废弃**：遗留方案，禁止执行

## 清单

| 文件 | 状态 | 用途 | 幂等 | 备注 |
|---|---|---|---|---|
| `supabase-formula-schema.sql` | 🟢 活跃 | 配方核心建表（brands/colors/color_variants/formulas/formula_components/guides/settings 等） | ✅ 幂等（IF NOT EXISTS） | 仍被 `data-management-setup-guide.html` 作为活工作流（追加新表） |
| `supabase-analytics-schema.sql` | 🟢 活跃 | `analytics_events` 埋点事件表 | ✅ 幂等 | 匿名埋点，不含个人身份 |
| `supabase-seed-20-colors.sql` | 🟡 种子 | 20 个示例颜色 + 配方 + 色母组件（仅演示/测试用） | ✅ 幂等 | `DATABASE-UPDATE-GUIDE.md` 引用；生产库无需执行 |
| `supabase-migrate-color-type-array.sql` | ⚪ 已应用 | `color_type` 从单值 TEXT 改为 TEXT[] 数组 | — | 库中该迁移已完成（color_type 已是数组） |
| `supabase-migrate-color-years.sql` | ⚪ 已应用 | 从 `color_variants.year_range` 迁移到 `color_years` 表 | — | `color_years` 表已存在 |
| `supabase-backfill-variant-names.sql` | ⚪ 已应用 | 一次性回填被写坏的变体名/年份 | — | 存量数据已修复 |
| `supabase-fix-hex-preview.sql` | ⚪ 已应用 | `hex_preview` 修正第一波 | — | 已执行 |
| `supabase-fix-hex-preview-2.sql` | ⚪ 已应用 | `hex_preview` 第二波（白色变体/细微色差） | — | 已执行 |
| `supabase-fix-hex-preview-3.sql` | ⚪ 已应用 | `hex_preview` 第三波（OEM 标准 hex） | — | 已执行 |
| `supabase-schema.sql` | 🔴 已废弃 | 遗留 HAIWEN MIX `users` 表 + bcrypt 密码（含默认密码 admin123） | — | **禁止执行**，详见文件头废弃标注 |

## 后续迁移入口

新的数据库变更请一律放入 `supabase-migrations/`（时间戳命名），并在此处同步更新对应条目的状态（🟢→⚪ 表示已并入正式迁移体系）。

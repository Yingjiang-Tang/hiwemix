# HIWE Formula Search

汽车修补漆配方检索网站，帮助汽修喷漆师快速找到对应的调漆配方。

## 功能特性

- 🔍 按车辆品牌/年份/颜色代码搜索配方
- 🎨 颜色库浏览和筛选
- 📋 详细的色母配方表（克重比例）
- 📱 响应式设计，支持移动端
- 🔐 用户认证和管理后台
- 🌐 多语言支持（13 种语言）

## 技术栈

- **前端**: Next.js 16 App Router + TypeScript + Tailwind CSS v4
- **UI 组件**: shadcn/ui + Base UI（Tailwind CSS）
- **后端**: Supabase (PostgreSQL)
- **认证**: Supabase Auth（邮箱验证 / 密码重置，profile 存于 `public.profiles`）
- **部署**: Vercel

## 快速开始

### 环境要求

- Node.js 20+
- Supabase 项目（需要配置环境变量）

### 安装和运行

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 Supabase 配置

# 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 环境变量

在 `.env.local` 中配置以下变量（参照 `.env.example`）：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SECRET_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret
NEXT_PUBLIC_SITE_URL=https://your-site.example.com
```

> 注意：`SUPABASE_SECRET_KEY`（service_role key）只能用于服务端（`getSupabaseAdmin()`），严禁出现在客户端代码或暴露给浏览器。

## 项目结构

```
src/
├── app/           # 页面路由
│   ├── api/       # API 路由
│   ├── admin/     # 管理后台
│   └── ...        # 前端页面
├── components/    # 可复用组件
├── lib/           # 工具函数和数据库操作
├── types/         # TypeScript 类型定义
└── data/          # 静态数据
```

## 开发指南

- 组件使用 `function` 关键字定义
- 所有 TypeScript 接口放在 `src/types/index.ts`
- 数据库操作封装在 `src/lib/db.ts` 和 `src/lib/db-formula.ts`
- 使用 Tailwind CSS 进行样式管理
- 中文注释说明业务逻辑

## 部署

推荐使用 Vercel 部署：

```bash
npm run build
npm run start
```

或直接连接 Git 仓库到 Vercel 进行自动部署。

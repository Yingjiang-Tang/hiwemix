<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
# AGENTS.md

## Project
汽车修补漆配方检索网站（Formula Search），对标 kapcimix.com/FormulaSearch。
技术栈：Next.js 16 App Router + TypeScript + Tailwind CSS + Supabase。

## 产品定位
帮助汽修喷漆师，通过输入车辆品牌/年份/颜色代码，快速找到对应的调漆配方（各色母克重比例）。
当前阶段：全栈应用，使用 Supabase 作为后端数据库，支持用户认证和数据管理。

## 目录结构约定
- src/app/           页面路由
- src/components/    可复用组件
- src/lib/           工具函数、类型定义、数据库操作
- src/types/         TypeScript 类型

## 代码规范
- 组件用 function 关键字，不用箭头函数
- 所有 interface 放 src/types/index.ts
- 数据库操作放 src/lib/db.ts 和 src/lib/db-formula.ts
- Tailwind 类名不要超过一行，超过时抽成 cn() 变量
- 中文注释说明业务逻辑

## 移动端 UI 开发规范

### 核心原则：CSS-only 响应式，零 JS 视口检测

**绝对禁止**使用 `useMediaQuery`、`useIsMobile`、`useViewport` 或任何 JS 视口判断 hook 来做 UI 分支。原因：
1. SSR 首屏闪烁：服务端不知道客户端视口尺寸，hydrate 时会跳变
2. 与 CSS 媒体查询脱钩：同一视口可能出现 JS 和 CSS 判断结果不一致
3. 组件与视口耦合：组件变成"只能在特定视口工作"，丧失复用性

**正确做法**：所有响应式逻辑编码在 CSS 层面，让浏览器原生媒体查询保证一致性。

**🔴 铁律：修改移动端 UI 时，桌面端 UI 必须保持像素级不变。** 移动端样式一律用 `max-md:` 前缀或 `@media (max-width: 767.98px)` 块包裹，**禁止**修改无前缀的基础样式或 `md:` / `lg:` 前缀的桌面端样式。如果某个改动需要在移动端和桌面端都生效，应先在移动端单独验证，确认桌面端无变化后再合并。

### 两条通道：何时用哪个

| 通道 | 场景 | 示例 |
|------|------|------|
| **JSX 内 Tailwind 前缀**（首选） | 单个元素的显示/隐藏、尺寸、间距变化 | `max-md:hidden`、`md:flex-row`、`md:text-[80px]` |
| **globals.css @media 块**（仅必要时） | 深层后代选择器、表格列宽、`nth-child` 等 Tailwind class 无法表达的场景 | `.formula-drawer [data-slot="table"] th` |

**选择逻辑**：能用 Tailwind class 写 → 写在 JSX 里。需要 `[data-slot="..."]` 选择器、伪元素、`nth-child` 计算 → 保留在 globals.css。

### 断点体系

项目使用 Tailwind v4 默认断点（CSS-first 配置，无需 tailwind.config.ts）：

| 前缀 | 断点 | 含义 | 使用场景 |
|------|------|------|----------|
| 无前缀 | 0px+ | 移动端默认样式（mobile-first） | 所有元素的基础样式 |
| `sm:` | 640px+ | 小屏以上 | 网格从 2 列变 3 列 |
| `md:` | 768px+ | 平板/桌面 | 导航从汉堡变水平、边栏可见、两栏布局 |
| `lg:` | 1024px+ | 宽桌面 | 三栏布局（如 TDS 页面） |
| `max-sm:` | <640px | 仅小手机 | 极窄屏特殊处理 |
| `max-md:` | <768px | 仅手机/小平板 | **移动端专属样式首选** |
| `max-lg:` | <1024px | 非宽桌面 | 较少使用 |

**关键约定：`max-md:` 是"移动端专用"的标准写法。** 用 `max-md:hidden` 而不是 `block md:hidden`，语义更清晰——看一个 class 就知道它"在移动端做什么"。

### 响应式显隐模式（按场景查表）

```html
<!-- 仅桌面端可见（如导航链接、侧边栏、装饰元素） -->
<nav class="max-md:hidden">

<!-- 仅移动端可见（如汉堡按钮、折叠触发条） -->
<button class="md:hidden">

<!-- 移动端堆叠，桌面端并排 -->
<div class="flex flex-col md:flex-row">

<!-- 移动端全宽，桌面端定宽 -->
<div class="w-full md:w-64">

<!-- 移动端隐藏装饰/视频，桌面端恢复 -->
<video class="hidden md:block">
```

### 容器内边距阶梯（全站约定）

```
移动端（默认）:  px-6      (24px)
sm 以上:         sm:px-8   (32px)
md 以上（桌面）:  md:px-[60px] (60px)
```

**全站所有主内容区域统一使用此阶梯。** Header 因其特殊性也保持 `px-6 sm:px-8 md:px-[60px]`。

新增页面/组件时，直接复用此阶梯，不要自创新的 padding 值。

### 触摸目标最小 44px（Apple HIG / Material Design 标准）

所有可交互元素在移动端必须满足 **44×44px** 最小触摸区域。优先保障的入口：

1. **导航项**：顶部汉堡菜单项、侧栏导航项
2. **CTA 按钮**：登录、注册、搜索提交
3. **表单控件**：checkbox、radio、select 触发器
4. **筛选/切换**：品牌筛选药丸、分类 tabs

```html
<!-- Footer 社交图标：移动端 44px，桌面端 36px -->
<a class="inline-flex size-11 items-center justify-center md:size-9">

<!-- 筛选药丸：移动端 40px（h-10），桌面端 36px（h-9） -->
<TabsTrigger class="h-9 max-md:h-10">
```

### Sheet/Drawer 宽度约定

| Sheet 类型 | 宽度 | 说明 |
|------------|------|------|
| **导航类**（汉堡菜单、侧栏过滤） | `w-[min(80vw,320px)]` | 不占满屏幕，保留右侧背景暗示可关闭 |
| **全屏内容类**（配方详情） | 全屏 `w-screen` | 内容密集，需要最大空间 |
| **UI 组件默认** | `w-3/4 sm:max-w-sm` | sheet.tsx 基类默认值 |

**全站所有导航类 Sheet 必须统一使用 `w-[min(80vw,320px)]`。** 这个值保证：
- 80vw 防止在 320px 宽手机上溢出
- 320px 上限防止在平板上过宽

### Z-Index 层级

```css
/* 全站 z-index 尺度（数字越大越靠前） */
z-50      → Sheet 遮罩层 + Sheet 内容（Base UI 默认）
z-[100]   → Dropdown / Popover 弹出内容
z-[200]   → Sticky 元素（表格表头等）
z-[1100]  → SiteHeader（fixed 定位）
z-[1300]  → Dialog 模态框
z-[2000]  → FormulaDrawer 全屏 Sheet + Toast 通知
z-[2100]  → Select 下拉内容（最高层级）
```

**规则**：新增叠加层时在此尺度中选层，不要随意使用任意 `z-[N]` 值。如果两个组件在同一层冲突，检查是否应该拆分层级。

### 移动端性能优化

**移动端自动降级的元素**（用 `max-md:hidden` 或 `hidden md:block`）：

1. **`<video>` 背景**：移动端用静态 poster 图替代，不加载视频文件，节省带宽和 CPU
2. **复杂 CSS 装饰**：大尺寸 SVG、多层 gradient、clip-path 动画
3. **低价值装饰 DOM**：仅用于桌面端视觉美化的元素

```tsx
{/* 移动端不加载视频，只显示 poster 静态图 */}
<video className="hidden md:block absolute inset-0 h-full w-full object-cover" />
```

### 新增移动端样式的正确流程

1. **判断能否用 Tailwind class** → 是 → 直接在 JSX 中加 `max-md:xxx` 或 `md:xxx`
2. **判断是否需要后代选择器**（如 `[data-slot="table"] th`）→ 是 → 在 globals.css 末尾新增一个 `@media (max-width: 767.98px)` 块，写好注释说明覆盖原因
3. **验证**：`npm run build` 零错误 + Chrome DevTools 四个断点（375/414/768/1024px）逐页检查 + 桌面端像素级无变化

### 反模式（不要这样做）

```tsx
// ❌ 用 JS 判断视口做 UI 分支
const [isMobile, setIsMobile] = useState(false)
useEffect(() => { /* resize listener */ }, [])

// ❌ 两个 class 组合表达"移动端隐藏"
<nav className="hidden md:flex">   // → 改用 max-md:hidden

// ❌ 移动端样式写在 globals.css 但本可以用 Tailwind class
// 如果只是隐藏/显示/改变尺寸，应该直接写在 JSX 里

// ❌ 新页面自创 padding 值
<div className="px-4 md:px-[80px]">   // → 用约定值 px-6 + md:px-[60px]

// ❌ 导航类 Sheet 用固定像素宽度
<SheetContent className="w-[224px]">  // → 用 w-[min(80vw,320px)]
```

### Done when（移动端额外检查）
- 页面在 localhost:3000 无报错渲染
- 所有交互用真实数据库正常响应
- TypeScript 无类型错误
- Chrome DevTools 375px / 414px / 768px / 1024px 四个断点下逐页可用
- 所有可交互元素触摸区域 ≥44px（移动端视口下检查）
- 桌面端 UI 与改动前像素级一致（≥768px 视口下确认无变化）
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Hero 鼠标交互优化

**日期**: 2026-08-01
**目标文件**: `src/components/HeroSection.tsx`

## 用户决策摘要

| 问题 | 决策 |
|---|---|
| 1. mode 锁定 | **保持现状**(不动) |
| 2. 重复赋值 `modeRef.current = "none"` | 改(纯清理) |
| 3. RAF 节流 | 改 → raf 调度 + 坐标缓存 |
| 4. clip-path 风格不统一 | 改(纯清理) |
| 5. -translate-y-[220px] | 改 → 比例定位 |
| 测试 | 不加测试 |

## 任务清单(2-5 分钟每项)

### T1. 清理重复赋值(line 139-140)
- 删除第二个 `modeRef.current = "none"`
- 验证:`grep -n 'modeRef.current = "none"'` 只剩一处

### T2. 修复 RAF 节流滞后(行 173-188)
当前逻辑:每帧跑完才调度下一帧。改为:**每个 pointermove 直接调度一次 RAF**,RAF 内部读最新坐标。重复调度由 `rafIdRef.current` 守护去重。

```ts
// 改前
if (!rafIdRef.current && !animatingRef.current) {
  rafIdRef.current = requestAnimationFrame(tick);
}

// 改后:每次 pointermove 都尝试调度,tick 内部置 0
```

`handleTouchMove` 同步修改。

### T3. 统一 clip-path 风格(行 91-113)
当前:`bule` 用空字符串清除,`shy/pink` 用零区域多边形。
改为:三个图层都明确用 `polygon(0 0, 100% 0, 100% 100%, 0 100%)` 表示"全屏",`polygon(0 0, 0 0, 0 0, 0 0)` 表示"零区域"。无歧义。

### T4. -translate-y-[220px] → 比例定位(行 249)
当前:`-translate-y-[220px]` 硬偏移。
改为:把内容层从 `flex items-center justify-center` 改为 `flex items-start pt-[10%]`(或类似比例),移除硬偏移。视觉上仍是"车身上方留出空间给文字"。

### T5. 验证
- 重启 dev server,首页 GET 200
- 浏览器刷新,检查 hero 区:
  - 鼠标在车身 → 出现 SHY 或 PINK 渐变分割线
  - 快速移动 → 分割线跟手无卡顿
  - 离开车身 → 平滑恢复全屏 BULE
- TypeScript 编译无错
- dev server 后台日志无 ERROR

## 不动

- mode 锁定逻辑(用户决定保持)
- 遮罩图检测 `isInMask`
- 整体动画时长 300ms / cubic ease-out

## 风险

- T4 改比例定位后,标题位置视觉上会有变化,需用户在浏览器确认
- T2 改 RAF 调度可能让某些低端设备更耗 CPU,但收益(无滞后)大于风险
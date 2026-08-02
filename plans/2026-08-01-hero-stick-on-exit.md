# Hero 鼠标交互:划一次保持状态

**日期**: 2026-08-01 (追加)
**目标文件**: `src/components/HeroSection.tsx`
**前置**: 已应用 2026-08-01 T1-T3,T4 已回滚

## 目标

把 `animateExit` 的"平滑回弹到原色"改成"保持当前状态"。

## 用户决策

| 决策点 | 选择 |
|---|---|
| 锁什么 | 锁模式不锁位置(车漆类型 SHY/PINK 锁定,分割线停在离开点) |
| 重划时机 | 随时可重划,无冷却 |
| 反馈 | 仅保持车漆状态,不动效、无按钮 |

## 当前逻辑回顾

```ts
} else if (modeRef.current !== "none") {
  // 离开范围 → 平滑恢复
  animateExit();
}
```

`animateExit` 把分割线滑向 0/100 然后清空状态。

## 新逻辑

1. 离开车身时,**不要调用 animateExit**。
2. `splitXRef.current` 保留(分割线位置停在最后一次)。
3. `modeRef.current` 保留(车漆类型保留)。
4. 鼠标重新进入车身:已有 `modeRef.current !== "none"` 分支,会继续调 `applyClip(coords.xPercent, modeRef.current)` —— 完美。
5. 跨中线:你之前选了"保持现状",所以跨中线也不切模式,跟原行为一致。

## 改动清单

### T1. 删除 `animateExit` 调用

`src/components/HeroSection.tsx` 的 `tick` 函数(line 166-169):
```ts
// 改前
} else if (modeRef.current !== "none") {
  // 离开范围 → 平滑恢复
  animateExit();
}

// 改后
} else if (modeRef.current !== "none") {
  // 离开车身 → 保持当前车漆状态,等待鼠标再次进入
  // (不调用 animateExit,不再回弹)
}
```

### T2. 处理 `handlePointerLeave` / `handleTouchEnd`

这两个事件在完全离开 hero 区时触发。原代码也是调 animateExit。

新逻辑:**保留同样的"保持"行为**。鼠标完全离开 hero 区也保持当前车漆,因为 modeRef 已经被锁定,不需要再做任何事。

```ts
// handlePointerLeave:改前
const handlePointerLeave = useCallback(() => {
  if (modeRef.current !== "none" && !animatingRef.current) animateExit();
}, [animateExit]);

// 改后:什么都不做(状态保留)
const handlePointerLeave = useCallback(() => {
  // 鼠标完全离开 hero 区:状态保留,不再回弹
}, []);
```

`handleTouchEnd` 同处理。

### T3. 清理无用的 `animateExit`

`animateExit` 现在没人调了,但函数本身还有用 —— 等等,以后可能还想加回弹功能,先**保留**函数定义,只**不调用**它。不动函数体。

## 不动

- `modeRef.current = "none"` 首次进入逻辑(保留"按中线判定")
- 跨中线不切模式(用户决定)
- `tick` 末尾清 rafId
- `FULL` / `EMPTY` 常量

## 验证步骤

1. `tsc --noEmit` 0 错
2. dev server 热更新成功(看日志 `✓ Compiled`)
3. 浏览器刷新 [http://localhost:3000](http://localhost:3000)
4. 鼠标进入车身 → 出现分割线 + SHY/PINK 渐变 ✅
5. 鼠标**滑出车身** → 分割线**停在离开位置**,车漆**保持不变** ✅(不回到蓝色)
6. 鼠标再次进入车身 → 分割线继续跟随 ✅
7. 鼠标滑出 → 又保持 ✅
8. F5 刷新 → 车漆回到默认蓝色 ✅(初始状态正确)

## 风险

- 如果以后想加"重划按钮"或"自动回弹",需要把 animateExit 接回来。本次不做。
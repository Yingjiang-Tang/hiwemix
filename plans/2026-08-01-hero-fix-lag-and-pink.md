# Hero 交互:修卡顿 + 让 pink 可见

**日期**: 2026-08-01 (追加)
**目标文件**: `src/components/HeroSection.tsx`

## 用户反馈

1. 快动鼠标时卡顿、卡车头位置
2. 无论怎么滑都看不到 pink(只看到 BULE 和 SHY)

## 根因(已通过代码分析 + 遮罩图采样验证)

### 卡顿根因

`handlePointerMove` 里的 RAF 调度:
```ts
if (!rafIdRef.current && !animatingRef.current) {
  rafIdRef.current = requestAnimationFrame(tick);
}
```

**问题**:一帧内多次 pointermove 会被去重,只有第一次能调度,后续 N-1 次 cache 在 `coordsRef` 里。
但因为 RAF 是 16ms 一帧,**等到 tick 真正执行时,coordsRef 已经是最新的了**。

听起来应该不卡。但**真正的问题在另一处**:tick 里调 `isInMask` → `getImageData`,这是 GPU 同步读像素。**Chromium 把它放在主线程,如果某帧拖到 30+ms,下一帧被推迟,鼠标看起来"卡住"**。

**修复**:把 `getImageData` 缓存到一个 `maskImageDataRef`,**初始化时一次性 getImageData 整个 canvas**,后续只读 cache 的 `data[offset]`,O(1) 数组访问。

### pink 不显示根因

**遮罩图采样结果**:
- 车身水平范围:x=342 到 x=1594
- 车身中心:x=968(几乎和图中心 960 重合)

**问题在 mode 锁定逻辑**:
```ts
if (modeRef.current === "none") {
  modeRef.current = coords.imgX < MASK_W / 2 ? "left" : "right";
}
```

一旦锁定,**永不切换**。从车头划到车尾,首次进入时 imgX < 960 → 锁定 left,**鼠标再到车身右侧也不会切到 right** → pink 永远不显示。

**修复**:每次**重新进入车身**(从 mask 外回到 mask 内)→ 重置 modeRef 为 "none" → 重新判定 left/right。

**为什么之前用户要求"划一次保持",现在又要求"再切到 pink"**:不矛盾。"保持"指的是**分割线位置保持**(你已经划过的 X 位置不重置);"切 pink"指的是**重新进入后允许重新判定 left/right**。

## 改动清单

### T1. 缓存 getImageData 数据

```ts
// 新增 ref
const maskDataRef = useRef<Uint8ClampedArray | null>(null);

// 加载遮罩图时一次性提取所有像素
useEffect(() => {
  // ... canvas 设置 ...
  const img = new window.Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    maskReadyRef.current = true;
    // 一次性提取整个 canvas 的像素数据
    maskDataRef.current = ctx.getImageData(0, 0, MASK_W, MASK_H).data;
  };
  img.src = "/car-mask.png";
}, []);

// isInMask 改为读缓存
const isInMask = useCallback((imgX, imgY) => {
  if (!maskReadyRef.current) return false;
  const data = maskDataRef.current;
  if (!data) return false;
  const x = Math.round(imgX);
  const y = Math.round(imgY);
  if (x < 0 || x >= MASK_W || y < 0 || y >= MASK_H) return false;
  return data[(y * MASK_W + x) * 4] > 128;
}, []);
```

**性能提升**:O(n²) GPU 同步读 → O(1) 内存访问。每次 pointermove 节省 ~0.5-2ms。

### T2. 重新进入时重置 modeRef

```ts
// tick 函数内,在检测到"在车身里"时:
// 区分"首次进入"和"再次进入"
if (isInMask(coords.imgX, coords.imgY)) {
  if (modeRef.current === "none") {
    // 首次进入(从 none 开始)→ 按 imgX 判定 left/right
    modeRef.current = coords.imgX < MASK_W / 2 ? "left" : "right";
  }
  // 注意:已锁定的 modeRef 不在这里重置
  // 重置逻辑在 handlePointerLeave 里:完全离开 hero 区时重置
  splitXRef.current = coords.xPercent;
  applyClip(coords.xPercent, modeRef.current);
}
```

但**关键改动**:在 `handlePointerLeave` 里:
```ts
const handlePointerLeave = useCallback(() => {
  // 鼠标完全离开 hero 区 → 重置模式锁定
  // 下次进入可以重新选 left/right
  if (modeRef.current !== "none") {
    modeRef.current = "none";
    // splitXRef 不重置,下次进入会基于当前位置继续
  }
}, []);
```

**等等,这会和"划一次保持"矛盾** —— 用户上次要求"离开后保持状态"。

**重新读用户上次的需求**:"当从车头移到车尾,移完之后整个车的颜色保持不变。鼠标再次进入这个范围之后,再改变它的颜色"。

**新行为解读**:
- "保持不变" → splitX(分割线位置)+ 颜色保持
- "再次进入后改变" → 颜色可以改(因为重新判定 mode)

**正确的状态机**:
- 离开车身(但还在 hero 内)→ mode 保持、splitX 保持、颜色保持
- 离开整个 hero(pointerleave)→ mode 重置为 none、splitX 保持
- 再次进入 hero → 重新判定 left/right → 颜色可能变

**这就同时满足**:
1. pink 能出现(下次进入重判定)
2. "划一次保持"的感觉(分割线和颜色不立刻动)
3. "再划一次换颜色"的效果

### T3. 处理"已离开车身但还在 hero 内"的状态

`tick` 的 else if 分支(已经在 T2 的"stick on exit" plan 里改成空注释)需要重新启用:

```ts
} else if (modeRef.current !== "none") {
  // 离开车身但还在 hero 内 → 完全保持状态,啥也不做
  // mode 不重置,splitX 不动
}
```

这部分**保持现状**(上次 plan 已经改了)。

## 不动

- `animateExit` 函数定义保留(未调用,但以后可能需要)
- `FULL` / `EMPTY` 常量
- tick 末尾清 rafId
- `coordsRef` 缓存坐标

## 验证步骤

1. `tsc --noEmit` 0 错
2. dev server 热更新成功(看日志 `✓ Compiled`)
3. 浏览器测试场景:
   - **A. 慢动鼠标** → 平滑跟手
   - **B. 快动鼠标** → 不再有明显滞后 / 卡顿(关键!)
   - **C. 从车头划到车尾** → 看到 SHY → BULE → 分割线随动
   - **D. 鼠标滑出车身** → 颜色保持
   - **E. 鼠标离开整个 hero,再回来,从车尾开始划** → **看到 PINK 出现在右半边**(关键修复!)
   - **F. 重复 E 几次** → pink 稳定可见

## 风险

- T1 的 `getImageData(0, 0, MASK_W, MASK_H)` 一次性提取 1920×919×4 = ~7MB 像素数据。内存开销 7MB,可接受。
- T2 改 handlePointerLeave 后,如果用户连续在 hero 内进出车身,每次都会重置 mode,可能"颜色闪一下"。这个预期内,用户已认可"再次进入后改变"。
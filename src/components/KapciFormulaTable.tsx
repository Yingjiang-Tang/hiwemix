"use client";

import { useState, useEffect, useRef } from "react";
import type { Formula, FormulaComponent, ComponentGroup } from "@/types";
import { useLang } from "@/components/LanguageContext";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { blendedDensity, gramsToVolume, volumeToGrams } from "@/lib/units";

// 重量/体积单位：千克、毫升、克、升
const UNIT_OPTIONS = ["kg", "ml", "g", "L"] as const;
type Unit = (typeof UNIT_OPTIONS)[number];

const GRAM_UNITS: Unit[] = ["g", "kg"];

interface KapciFormulaTableProps {
  formula: Formula;
  activeGroup?: ComponentGroup;
  onGroupChange?: (group: ComponentGroup) => void;
  showGroupToggle?: boolean;
}

function calcWeight(gramsPer100g: number, totalGrams: number): number {
  // 3 位小数：1 位小数在微小总量（如 0.1ml）下会把各色母全部舍成 0，导致 Total 显示 0.0
  return Math.round((gramsPer100g / 100) * totalGrams * 1000) / 1000;
}

function parsePositiveNumber(raw: string): number | null {
  if (raw === "") return null;
  const num = Number(raw);
  if (isNaN(num) || num < 0) return null;
  return Math.round(num * 10) / 10;
}

// Volume 输入框专用：保留 4 位小数精度（kg 单位下 0.0001kg = 0.1g），
// 不能用 parsePositiveNumber——它强制 1 位小数会把 0.05kg 吞成 0.1kg
function parseVolumeNumber(raw: string): number | null {
  if (raw === "") return null;
  const num = Number(raw);
  if (isNaN(num) || num < 0) return null;
  return Math.round(num * 10000) / 10000;
}

function massToneColor(comp: FormulaComponent): string {
  const { rgb_r, rgb_g, rgb_b } = comp;
  if (rgb_r != null && rgb_g != null && rgb_b != null) {
    return `rgb(${rgb_r}, ${rgb_g}, ${rgb_b})`;
  }
  // 无 RGB 数据时的占位色：跟随主题（浅色浅灰 / 深色深灰），避免暗色下刺眼的亮块
  return "var(--muted)";
}

export default function KapciFormulaTable({ formula, activeGroup = "Pearl Paint", onGroupChange, showGroupToggle = false }: KapciFormulaTableProps) {
  const { t } = useLang();
  const [volume, setVolume] = useState(1);
  // 输入框草稿：允许清空/自由输入过程，有效数字才提交到 volume（否则受控组件会把旧值回填，导致"删不掉"）
  const [volumeDraft, setVolumeDraft] = useState("1");
  const [unit, setUnit] = useState<Unit>("kg");
  const [weights, setWeights] = useState<number[]>([]);
  const isManualEditRef = useRef(false);

  // 当前显示配方的混合密度（质量加权调和平均）；毫升换算用它，缺数据自动回退分类典型值/1.0
  const density = blendedDensity(formula.components);

  // 单位 → 总克数：重量单位直接乘倍数；体积单位按混合密度换算（UI 的 "L" 对应 units.ts 的 "liter"）
  function volumeToTotalGrams(v: number, u: Unit): number {
    if (GRAM_UNITS.includes(u)) return v * (u === "kg" ? 1000 : 1);
    return volumeToGrams(v, density, u === "L" ? "liter" : "ml");
  }

  function totalGramsToVolume(grams: number, u: Unit): number {
    if (GRAM_UNITS.includes(u)) return grams / (u === "kg" ? 1000 : 1);
    return gramsToVolume(grams, density, u === "L" ? "liter" : "ml");
  }

  const totalGrams = volumeToTotalGrams(volume, unit);

  useEffect(() => {
    if (isManualEditRef.current) {
      isManualEditRef.current = false;
      return;
    }
    const next = formula.components.map((c) => calcWeight(c.grams_per_100g, totalGrams));
    setWeights(next);
  }, [formula.id, formula.components, totalGrams]);

  function handleVolumeChange(raw: string) {
    // 草稿先行：空串/非法输入不提交，仅更新草稿，允许用户清空或输入中间态（如 "1."、"0.0"）
    setVolumeDraft(raw);
    const num = parseVolumeNumber(raw);
    if (num === null) return;
    isManualEditRef.current = false;
    // 放开小量下限：允许 0.1g 级别微调，微小修补场景不浪费漆
    setVolume(Math.max(0.0001, Math.round(num * 10000) / 10000));
  }

  function handleWeightChange(idx: number, raw: string) {
    const num = parsePositiveNumber(raw);
    if (num === null) return;

    const changedPercentage = formula.components[idx].grams_per_100g;
    if (changedPercentage <= 0) return;

    const newTotalGrams = Math.round((num / changedPercentage) * 100 * 10) / 10;
    const next = formula.components.map((c) =>
      calcWeight(c.grams_per_100g, newTotalGrams)
    );
    next[idx] = num;

    isManualEditRef.current = true;
    setWeights(next);

    const newVolume = totalGramsToVolume(newTotalGrams, unit);
    setVolume(Math.round(newVolume * 1000) / 1000);
    // 反向联动：weight 编辑导致总克数变化时，volume 草稿跟随刷新
    setVolumeDraft(String(Math.round(newVolume * 1000) / 1000));
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  // 合计随所选单位换算显示：统一保留 3 位小数，避免小量配方（如 0.1ml）显示成 0.0
  const totalInUnit = totalGramsToVolume(totalWeight, unit);
  const totalDisplay = totalInUnit.toFixed(3);

  return (
    <div>
      {/* 总量控制栏 */}
      <div className="mb-5 flex flex-col flex-wrap items-stretch gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between md:mb-4 print:mb-1 print:p-1">
        {/* 左侧：配方属性
            桌面端 ml-[47px] 对齐表格数字列；移动端去掉偏移靠左排列 */}
        <span className="flex items-center gap-2 text-[15px] font-semibold text-foreground md:ml-[47px] max-md:hidden">
          <span>{t.version} {formula.version}</span>
          <span aria-hidden="true">|</span>
          <span>{formula.paint_system}</span>
          <span aria-hidden="true">|</span>
          <span>{formula.formula_type}</span>
        </span>

        {/* 右侧：Volume 计算器（移动端 Custom 左 / 输入控件右；桌面端维持原布局） */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-row sm:items-center max-md:w-full">
          <span className="text-[15px] font-semibold text-foreground md:hidden">Custom</span>
          <div className="flex items-center gap-2 max-md:ml-auto">
            <Input
              type="number"
              value={volumeDraft}
              onChange={(e) => handleVolumeChange(e.target.value)}
              className="h-8 w-[72px] rounded-md text-center text-[16px] font-semibold md:w-[90px]"
              min={0.0001}
              step={0.01}
            />
            <span className="text-[16px] font-semibold text-muted-foreground">×</span>
            <Select value={unit} onValueChange={(v) => { setUnit((v as Unit) || "kg"); setVolumeDraft(String(volume)); }}>
              <SelectTrigger className="h-8 w-16 rounded-lg text-[14px] font-semibold md:w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pearl Paint/Ground Paint 切换按钮 */}
        {showGroupToggle && (formula.formula_type === "Three Stages" || (formula.formula_type as string) === "Pearl Paint") && (
          <div className="flex gap-1 flex-shrink-0">
            {(["Pearl Paint", "Ground Paint"] as ComponentGroup[]).map((g) => (
              <button
                key={g}
                onClick={() => onGroupChange?.(g)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeGroup === g
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {g === "Pearl Paint" ? t.pearlPaintLabel : t.groundPaintLabel}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 配方用量表 */}
      <div className="overflow-x-auto rounded-lg border border-border text-[16px]">
        <Table className="text-inherit table-fixed w-full">
          <caption className="sr-only">Formula components and weights</caption>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-1/5 py-2.5 text-2xs uppercase font-semibold text-center">{t.tonerCode}</TableHead>
              <TableHead className="w-1/5 py-2.5 text-2xs uppercase font-semibold text-center">{t.tonerName}</TableHead>
              <TableHead className="w-1/5 py-2.5 text-2xs uppercase font-semibold text-center">{t.weight}</TableHead>
              <TableHead className="w-1/5 py-2.5 text-2xs uppercase font-semibold text-center">{t.accum}</TableHead>
              <TableHead className="w-1/5 py-2.5 text-2xs uppercase font-semibold text-center">{t.massTone}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formula.components.map((comp, idx) => {
              let running = 0;
              for (let i = 0; i <= idx; i++) running += weights[i] ?? 0;

              return (
                <TableRow key={`${comp.toner_code}-${idx}`} className="even:bg-muted/30">
                  <TableCell className="w-1/5 py-2.5 text-center font-semibold truncate">
                    {comp.toner_code}
                  </TableCell>
                  <TableCell className="w-1/5 py-2.5 text-center truncate">
                    {comp.toner_name}
                  </TableCell>
                  <TableCell className="w-1/5 py-2.5">
                    <Input
                      type="number"
                      value={weights[idx] ?? ""}
                      onChange={(e) => handleWeightChange(idx, e.target.value)}
                      className="h-8 w-full border-0 bg-transparent px-1 text-center font-sans font-semibold tabular-nums shadow-none focus-visible:ring-1 focus-visible:ring-ring/30"
                      min={0}
                      step={0.1}
                    />
                  </TableCell>
                  <TableCell className="w-1/5 py-2.5 text-center font-semibold tabular-nums">
                    {running.toFixed(3)}
                  </TableCell>
                  <TableCell className="w-1/5 py-2.5">
                    <div
                      role="img"
                      aria-label={`${comp.toner_name} ${t.massTone}`}
                      className="mx-auto h-5 w-10 rounded-sm border border-border/60"
                      style={{ backgroundColor: massToneColor(comp) }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="py-4" />
              <TableCell className="w-1/5 py-4 text-center text-[18px]">
                {/* Total 标签与单位：深灰 + 降一级字重；中间数字保持黑色加粗以突出 */}
                <span className="font-semibold text-foreground/60">{t.totalWeightLabel}</span>
                &nbsp;&nbsp;&nbsp;
                <span className="font-bold text-foreground">{totalDisplay}</span>
                &nbsp;
                <span className="font-semibold text-foreground/60">{unit}</span>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}

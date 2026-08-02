"use client";

import { useState, useEffect, useRef } from "react";
import type { Formula, FormulaComponent, ComponentGroup } from "@/types";
import { useLang } from "@/components/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const UNIT_OPTIONS = ["g", "kg", "ml", "liter"] as const;
type Unit = (typeof UNIT_OPTIONS)[number];

const UNIT_MULTIPLIER: Record<Unit, number> = { g: 1, kg: 1000, ml: 1, liter: 1000 };

interface KapciFormulaTableProps {
  formula: Formula;
  activeGroup?: ComponentGroup;
  onGroupChange?: (group: ComponentGroup) => void;
  showGroupToggle?: boolean;
}

function calcWeight(gramsPer100g: number, totalGrams: number): number {
  return Math.round((gramsPer100g / 100) * totalGrams * 10) / 10;
}

function parsePositiveNumber(raw: string): number | null {
  if (raw === "") return null;
  const num = Number(raw);
  if (isNaN(num) || num < 0) return null;
  return Math.round(num * 10) / 10;
}

function massToneColor(comp: FormulaComponent): string {
  const { rgb_r, rgb_g, rgb_b } = comp;
  if (rgb_r != null && rgb_g != null && rgb_b != null) {
    return `rgb(${rgb_r}, ${rgb_g}, ${rgb_b})`;
  }
  return "#E2E8F0";
}

export default function KapciFormulaTable({ formula, activeGroup = "Pearl Paint", onGroupChange, showGroupToggle = false }: KapciFormulaTableProps) {
  const { t } = useLang();
  const [volume, setVolume] = useState(1);
  const [unit, setUnit] = useState<Unit>("kg");
  const [weights, setWeights] = useState<number[]>([]);
  const isManualEditRef = useRef(false);

  const totalGrams = volume * UNIT_MULTIPLIER[unit];

  useEffect(() => {
    if (isManualEditRef.current) {
      isManualEditRef.current = false;
      return;
    }
    const next = formula.components.map((c) => calcWeight(c.grams_per_100g, totalGrams));
    setWeights(next);
  }, [formula.id, formula.components, totalGrams]);

  function handleVolumeChange(raw: string) {
    const num = parsePositiveNumber(raw);
    if (num === null) return;
    isManualEditRef.current = false;
    setVolume(Math.max(0.1, Math.round(num * 10) / 10));
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

    const newVolume = newTotalGrams / UNIT_MULTIPLIER[unit];
    setVolume(Math.round(newVolume * 10) / 10);
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* 总量控制栏 */}
      <div className="mb-4 flex flex-col flex-wrap items-stretch gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
        {/* 左侧：配方属性 */}
        <span className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <span>{t.version} {formula.version}</span>
          <span aria-hidden="true">|</span>
          <span>{formula.paint_system}</span>
          <span aria-hidden="true">|</span>
          <span>{formula.formula_type}</span>
        </span>

        {/* 右侧：Volume 计算器 */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-row sm:items-center">
          <Input
            type="number"
            value={volume}
            onChange={(e) => handleVolumeChange(e.target.value)}
            className="h-8 w-[72px] rounded-md text-center text-[16px] font-semibold md:w-[90px]"
            min={0.1}
            step={0.1}
          />
          <span className="text-[16px] font-semibold text-muted-foreground">×</span>
          <Select value={unit} onValueChange={(v) => setUnit((v as Unit) || "kg")}>
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
                    {running.toFixed(1)}
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
              <TableCell colSpan={4} className="py-[14px]" />
              <TableCell className="w-1/5 py-[14px] text-center font-bold text-red-500">
                {t.totalWeightLabel}&nbsp;&nbsp;&nbsp;{totalWeight.toFixed(1)} g
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}

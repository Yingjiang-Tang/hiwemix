"use client";

import { useState, useEffect, useCallback } from "react";
import type { SearchResult, Formula, FormulaComponent, ComponentGroup } from "@/types";
import { colorSwatchStyle } from "@/lib/utils";
import { useLang } from "@/components/LanguageContext";
import KapciFormulaTable from "./KapciFormulaTable";
import Toast from "./Toast";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { X, Printer, Copy } from "lucide-react";

interface FormulaDrawerProps {
  result: SearchResult | null;
  onClose: () => void;
  initialFormulaIdx?: number;
  formulaId?: string;
  initialYear?: number;
}

function formatComponents(components: FormulaComponent[]): string[] {
  const lines: string[] = ["Toner Code  |  Toner Name       |    %  |  g/100g", "-".repeat(50)];
  for (const c of components) {
    lines.push(`${c.toner_code.padEnd(12)}|  ${c.toner_name.padEnd(17)}|  ${String(c.percentage).padStart(4)}% |  ${String(c.grams_per_100g).padStart(6)}g`);
  }
  return lines;
}

function formatFormulaAsText(result: SearchResult, activeFormula: Formula, makeName: string): string {
  const lines: string[] = [];
  lines.push("=".repeat(50));
  lines.push(`HIWE Formula - ${result.color.color_name}`);
  lines.push(`Color Code: ${result.color.color_code}`);
  lines.push(`Make: ${makeName}`);
  lines.push(`Type: ${result.color.color_type}`);
  lines.push(`Process: ${activeFormula.formula_type}`);
  lines.push(`Paint System: ${activeFormula.paint_system}`);
  lines.push(`Version: ${activeFormula.version}`);
  lines.push("-".repeat(50));

  if (activeFormula.formula_type === "Three Stages") {
    lines.push("[Pearl Paint]");
    lines.push(...formatComponents(activeFormula.components.filter((c) => c.component_group === "Pearl Paint")));
    lines.push("");
    lines.push("[Ground Paint]");
    lines.push(...formatComponents(activeFormula.components.filter((c) => c.component_group === "Ground Paint")));
  } else {
    lines.push(...formatComponents(activeFormula.components));
  }
  lines.push("-".repeat(50));
  if (activeFormula.notes) lines.push(`Notes: ${activeFormula.notes}`);
  lines.push(`Updated: ${activeFormula.updated_at}`);
  lines.push("=".repeat(50));
  return lines.join("\n");
}

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function parseHexInput(raw: string, fallback: string): string {
  const t = raw.trim();
  if (!HEX_RE.test(t)) return fallback;
  return t.startsWith("#") ? t : `#${t}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline border-b border-border/40 py-1.5 last:border-b-0">
      <span className="w-28 flex-shrink-0 text-xs font-medium text-foreground/70 md:text-sm">{label}</span>
      <span className="min-w-0 flex-1 break-words text-sm md:text-base">{value}</span>
    </div>
  );
}

export default function FormulaDrawer({ result, onClose, initialFormulaIdx, formulaId, initialYear }: FormulaDrawerProps) {
  const { t } = useLang();
  const [activeFormulaIdx, setActiveFormulaIdx] = useState(0);
  const [brands, setBrands] = useState<{ id: string; name: string; region: string }[]>([]);
  const [hexInput, setHexInput] = useState("");
  const [activeGroup, setActiveGroup] = useState<ComponentGroup>("Pearl Paint");
  const [infoTab, setInfoTab] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/brands").then((r) => r.ok ? r.json() : []).then((d) => setBrands(d)).catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (result) {
      if (formulaId) {
        const idx = result.formulas.findIndex((f) => f.id === formulaId);
        setActiveFormulaIdx(idx >= 0 ? idx : 0);
      } else {
        setActiveFormulaIdx(initialFormulaIdx ?? 0);
      }
      setHexInput(result.color.hex_preview);
      setActiveGroup("Pearl Paint");
      setInfoTab(0);
    }
  }, [result, initialFormulaIdx, formulaId]);

  const handleClose = useCallback(() => { onClose(); }, [onClose]);

  function handlePrint() { window.print(); }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") handleClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  if (!result) return null;

  const { color, formulas } = result;
  const make = brands.find((m) => m.id === color.make_id)?.name ?? color.make_id;
  const origin = brands.find((m) => m.id === color.make_id)?.region ?? "-";
  const activeFormula = formulas[activeFormulaIdx];
  const previewColor = parseHexInput(hexInput, color.hex_preview);

  let displayedFormula: Formula | null = activeFormula ?? null;
  const isGroupedType = activeFormula?.formula_type === "Three Stages";
  if (activeFormula && isGroupedType) {
    displayedFormula = {
      ...activeFormula,
      components: activeFormula.components.filter((c) => c.component_group === activeGroup),
    };
  }

  function handleCopy() {
    if (!activeFormula) return;
    navigator.clipboard.writeText(formatFormulaAsText(result!, activeFormula, make)).then(
      () => setToastMsg(t.copySuccess),
      () => setToastMsg(t.copyFail),
    );
  }

  const currentYear = initialYear?.toString() || "-";

  return (
    <>
      <Sheet open onOpenChange={(v) => { if (!v) handleClose(); }}>
        <SheetContent side="right" className="!fixed !inset-0 !w-screen !max-w-full !translate-x-0 !rounded-none p-0 gap-0 overflow-y-auto bg-white z-[2000]">
          {/* Header Bar: 品牌/颜色代码/名称/元数据 + 操作按钮 */}
          <div className="sticky top-0 z-10 border-b border-border bg-white px-3 py-3 sm:px-5 sm:py-4">
            <div className="flex items-start gap-3 sm:gap-4">
              {/* 标题：配方代码 | 颜色名称 */}
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-heading text-xl font-bold leading-tight text-foreground sm:text-2xl">
                  {color.color_code}
                  <span className="mx-2 text-muted-foreground/40" aria-hidden="true">|</span>
                  {color.color_name}
                </h2>
              </div>

              {/* 右侧操作按钮 */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button onClick={handlePrint} variant="outline" size="sm" className="hidden sm:inline-flex">
                  <Printer className="size-4" />
                  {t.print}
                </Button>
                <Button onClick={handlePrint} size="icon-sm" variant="ghost" className="inline-flex sm:hidden">
                  <Printer className="size-4" />
                </Button>
                <Button onClick={handleCopy} variant="default" size="sm" className="hidden sm:inline-flex">
                  <Copy className="size-4" />
                  {t.copy}
                </Button>
                <Button onClick={handleCopy} size="icon-sm" className="inline-flex sm:hidden">
                  <Copy className="size-4" />
                </Button>
                <Button onClick={handleClose} variant="ghost" size="icon-sm">
                  <X className="size-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Body: 两栏布局 */}
          <div className="flex flex-col md:flex-row flex-1">
            {/* 左侧：配方详情 (~62.5%) */}
            <div className="flex-1 overflow-auto border-b border-border p-4 sm:p-5 md:flex-[62.5%] md:border-b-0 md:border-r">
              {activeFormula && displayedFormula && (
                <div>
                  <KapciFormulaTable
                    key={`${activeFormula.id}-${activeGroup}`}
                    formula={displayedFormula}
                    activeGroup={activeGroup}
                    onGroupChange={setActiveGroup}
                    showGroupToggle={true}
                  />

                  {activeFormula.notes && (
                    <div className="mt-4 rounded-xl border border-amber-200/60 bg-amber-50/30 p-3">
                      <span className="text-xs font-semibold text-amber-700">{t.notesLabel}</span>
                      <p className="mt-1 text-xs text-amber-600">{activeFormula.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 右侧：颜色预览+信息 (~37.5%) */}
            <div className="flex-shrink-0 overflow-auto md:flex-[37.5%]">
              {/* 颜色预览 */}
              <div className="p-4 sm:p-5">
                <div
                  className="h-[50px] rounded-xl border border-border/60 sm:h-[80px]"
                  style={colorSwatchStyle(previewColor)}
                />
              </div>

              <Separator />

              {/* Tab Switcher: shadcn 胶囊式 Tabs */}
              <Tabs value={infoTab} onValueChange={(v) => setInfoTab(Number(v))}>
                <TabsList variant="default" className="mx-4 mt-2 w-[calc(100%-2rem)] sm:mx-5 sm:mt-3 sm:w-[calc(100%-2.5rem)]">
                  <TabsTrigger value={0} className="text-xs md:text-sm">{t.tabColorInfo}</TabsTrigger>
                  <TabsTrigger value={1} className="text-xs md:text-sm">{t.tabColorDocs}</TabsTrigger>
                  <TabsTrigger value={2} className="text-xs md:text-sm">{t.tabPlasticParts}</TabsTrigger>
                </TabsList>

                <TabsContent value={0} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-2 md:gap-3">
                    <InfoRow label={t.manufacturerLabel} value={make} />
                    <InfoRow label={t.originLabel} value={origin} />
                    <InfoRow label={t.codeLabel} value={color.color_code} />
                    <InfoRow label={t.colorName} value={color.color_name} />
                    <InfoRow label={t.carModelLabel} value={color.car_model || "-"} />
                    <InfoRow label={t.yearsLabel} value={currentYear} />
                    <InfoRow label={t.processLabel} value={activeFormula?.formula_type || "-"} />
                    <InfoRow label={t.versionLabel} value={activeFormula?.version || "-"} />
                  </div>
                </TabsContent>

                <TabsContent value={1} className="py-8 text-center">
                  <p className="text-xs text-muted-foreground">{t.emptyState}</p>
                </TabsContent>

                <TabsContent value={2} className="py-8 text-center">
                  <p className="text-xs text-muted-foreground">{t.emptyState}</p>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </>
  );
}

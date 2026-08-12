"use client";

import type { Dispatch, MutableRefObject, PointerEvent as ReactPointerEvent, RefObject, SetStateAction } from "react";
import type { CarMake, Color, ColorType, ColorVariant, YearEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ColorPickerField from "@/components/ColorPickerField";
import { X } from "lucide-react";
import { formatYearEntry } from "@/lib/formula-utils";
import type { I18nDict } from "@/lib/i18n";
import type { ColorForm } from "./ColorsPanel";

export interface ColorFormFieldsProps {
  form: ColorForm;
  setForm: Dispatch<SetStateAction<ColorForm>>;
  brands: CarMake[];
  allVariants: ColorVariant[];
  variantIds: string[];
  setVariantIds: Dispatch<SetStateAction<string[]>>;
  yearEntries: YearEntry[];
  yearMode: "single" | "range";
  setYearMode: Dispatch<SetStateAction<"single" | "range">>;
  yearInput: string;
  setYearInput: Dispatch<SetStateAction<string>>;
  yearEndInput: string;
  setYearEndInput: Dispatch<SetStateAction<string>>;
  error: string;
  editing: Color | null;
  idManuallyEditedRef: MutableRefObject<boolean>;
  colorTypeScrollRef: RefObject<HTMLDivElement | null>;
  colorTypeDrag: MutableRefObject<{ startX: number; scrollLeft: number; moved: boolean; pointerId: number } | null>;
  suppressChipClick: MutableRefObject<boolean>;
  COLOR_TYPES: readonly ColorType[];
  toggleColorType: (t: ColorType) => void;
  toggleVariant: (id: string) => void;
  addYearEntry: () => void;
  removeYearEntry: (entry: YearEntry) => void;
  handleChipPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handleChipPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  endChipDrag: (e: ReactPointerEvent<HTMLDivElement>) => void;
  t: I18nDict;
}

export function ColorFormFields({
  form, setForm, brands, allVariants, variantIds, setVariantIds,
  yearEntries, yearMode, setYearMode, yearInput, setYearInput, yearEndInput, setYearEndInput,
  error, editing, idManuallyEditedRef, colorTypeScrollRef, colorTypeDrag, suppressChipClick,
  COLOR_TYPES, toggleColorType, toggleVariant, addYearEntry, removeYearEntry,
  handleChipPointerDown, handleChipPointerMove, endChipDrag, t,
}: ColorFormFieldsProps) {
  return (
    <div className="flex flex-col gap-5">
            {/* 基本信息卡片 */}
            <div className="rounded-xl border border-border p-5">
              <h3 className="mb-4 text-base font-semibold text-foreground/80 border-b border-border/50 pb-3">基本信息</h3>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium text-foreground/80">ID</Label>
                  <Input value={form.id} onChange={(e) => { idManuallyEditedRef.current = true; setForm({ ...form, id: e.target.value }); }} disabled={!!editing} className="h-9 rounded-lg" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium text-foreground/80">品牌</Label>
                  <Select value={form.make_id} onValueChange={(v) => setForm({ ...form, make_id: v || "" })}>
                    <SelectTrigger className="h-9 w-full rounded-lg"><SelectValue placeholder="请选择品牌" /></SelectTrigger>
                    <SelectContent className="z-[100] max-h-[200px]">{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium text-foreground/80">颜色代码</Label>
                    <Input value={form.color_code} onChange={(e) => setForm({ ...form, color_code: e.target.value })} className="h-9 rounded-lg" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium text-foreground/80">颜色名称</Label>
                    <Input value={form.color_name} onChange={(e) => setForm({ ...form, color_name: e.target.value })} className="h-9 rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium text-foreground/80">类型</Label>
                    <Select multiple value={form.color_type} onValueChange={(v) => setForm((prev) => ({ ...prev, color_type: (Array.isArray(v) ? v : (v ? [v] : [])) as ColorType[] }))}>
                      <SelectTrigger className="h-9 w-full rounded-lg px-2 py-1.5">
                        <div
                          ref={colorTypeScrollRef}
                          className="flex flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                          style={{ touchAction: "pan-y" }}
                          onPointerDown={handleChipPointerDown}
                          onPointerMove={handleChipPointerMove}
                          onPointerUp={endChipDrag}
                          onPointerCancel={endChipDrag}
                        >
                          {form.color_type.map((t) => (
                            <span
                              key={t}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!suppressChipClick.current) toggleColorType(t); }}
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              className="inline-flex shrink-0 cursor-grab touch-none select-none items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-sm text-blue-700 active:cursor-grabbing hover:border-blue-300"
                            >
                              {t}
                              <X className="size-3 text-blue-400 hover:text-blue-600" />
                            </span>
                          ))}
                          {form.color_type.length === 0 && <span className="text-sm leading-none text-muted-foreground">请选择类型</span>}
                        </div>
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {COLOR_TYPES.map((t) => (
                          <SelectItem
                            key={t}
                            value={t}
                            className={form.color_type.includes(t) ? "bg-accent text-accent-foreground" : ""}
                          >
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium text-foreground/80">预览色</Label>
                    <ColorPickerField
                      value={form.hex_preview}
                      onChange={(hex) => setForm({ ...form, hex_preview: hex })}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium text-foreground/80">车型</Label>
                  <Input value={form.car_model} onChange={(e) => setForm({ ...form, car_model: e.target.value })} placeholder="例如 Camry / Corolla" className="h-9 rounded-lg" />
                </div>
              </div>
            </div>

            {/* 适用年份卡片 */}
            <div className="rounded-xl border border-border p-5">
              <h3 className="mb-4 text-base font-semibold text-foreground/80 border-b border-border/50 pb-3">适用年份</h3>

              {/* 第一排：模式切换 + 输入 + 添加（全部一行） */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 模式切换：单年 / 区间 */}
                <div className="inline-flex rounded-lg border border-border p-0.5">
                  <button
                    onClick={() => setYearMode("single")}
                    className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                      yearMode === "single"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.yearSingle}
                  </button>
                  <button
                    onClick={() => setYearMode("range")}
                    className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                      yearMode === "range"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.yearRange}
                  </button>
                </div>

                <Input
                  type="number"
                  placeholder={yearMode === "single" ? "年份 (1900-2100)" : "起始年份"}
                  className="h-9 w-28 rounded-lg"
                  min={1900}
                  max={2100}
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addYearEntry(); }}
                />
                {yearMode === "range" && (
                  <span className="text-muted-foreground">—</span>
                )}
                {yearMode === "range" && (
                  <Input
                    type="number"
                    placeholder="结束年份"
                    className="h-9 w-28 rounded-lg"
                    min={1900}
                    max={2100}
                    value={yearEndInput}
                    onChange={(e) => setYearEndInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addYearEntry(); }}
                  />
                )}
                <Button variant="outline" size="sm" className="h-9 rounded-lg text-sm" onClick={addYearEntry}>添加</Button>
              </div>

              {/* 已添加年份列表 */}
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">已添加年份</p>
                {yearEntries.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                    暂无年份，请在上方添加
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {yearEntries.map((entry) => (
                      <span key={`${entry.year}-${entry.year_end ?? 's'}`} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                        {formatYearEntry(entry)}
                        <button onClick={() => removeYearEntry(entry)} className="size-4 text-blue-400 hover:text-blue-600"><X className="size-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 关联配方类型卡片 */}
            <div className="rounded-xl border border-border p-5">
              <h3 className="mb-4 text-base font-semibold text-foreground/80 border-b border-border/50 pb-3">关联配方类型</h3>
              <div className="max-h-[220px] overflow-auto rounded-lg border border-border">
                {allVariants.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">暂无配方类型</p>
                ) : (
                  <div className="flex flex-col">
                    {allVariants.map((v) => {
                      const checked = variantIds.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50 ${
                            checked ? "bg-primary/5 dark:bg-primary/10" : ""
                          } ${v.id !== allVariants[0].id ? "border-t border-border/60" : ""}`}
                        >
                          <span
                            className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                              checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input bg-transparent"
                            }`}
                            aria-hidden="true"
                          >
                            {checked && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1.5 5.5l2.5 2.5 4.5-6" />
                              </svg>
                            )}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleVariant(v.id)}
                            className="sr-only"
                          />
                          <span className="flex flex-1 items-baseline justify-between gap-2">
                            <span className="text-sm text-foreground">{v.name}</span>
                            {v.year_range && <span className="text-sm text-muted-foreground">{v.year_range}</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

    </div>
  );
}

"use client";

import { fetchAdminJson } from "@/lib/admin-fetch";
import DataLoadError from "./DataLoadError";

import { useState, useEffect, useCallback, useRef, useMemo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Formula, FormulaComponent, FormulaType, ComponentGroup, Color, ColorVariant } from "@/types";
import type { Toner, CarMake } from "@/types";
import { generateUniqueFormulaId } from "@/lib/id-generator";
import { effectiveFormulaYears, formatYears, formulaYearMode, yearsContainedBy, yearsOverlap } from "@/lib/formula-years";
import { validateFormulaYears } from "@/lib/admin-validation";
import type { YearEntry } from "@/types";
import { hexToRgb, filterTonersBySystem, matchingToners, matchingColors } from "./formula-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Search, Plus, Trash2, Upload } from "lucide-react";

const PAINT_SYSTEMS = ["1K", "2K"] as const;
const AUTO_2K_TYPE: FormulaType = "Single Stage";
const PEARL_GROUPS: ComponentGroup[] = ["Pearl Paint", "Ground Paint"];

const EMPTY_COMPONENT: FormulaComponent = { toner_code: "", toner_name: "", percentage: 0, grams_per_100g: 0 };

export default function FormulasPanel() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [formulaTypes, setFormulaTypes] = useState<ColorVariant[]>([]);
  const [toners, setToners] = useState<Toner[]>([]);
  const [brands, setBrands] = useState<CarMake[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [yearMode, setYearMode] = useState<"" | "inherit" | "custom">("");
  const [years, setYears] = useState<YearEntry[]>([]);
  const [form, setForm] = useState({ id: "", color_id: "", variant_id: "", version: "v1", paint_system: "2K" as Formula["paint_system"], formula_type: AUTO_2K_TYPE, notes: "", image_url: "" });
  const editorRevision = useRef(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => () => { editorRevision.current++; }, []);
  function resetPending() { editorRevision.current++; setUploadingImage(false); setSaving(false); }
  const [uploadingImage, setUploadingImage] = useState(false);
  const [components, setComponents] = useState<FormulaComponent[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const idManuallyEdited = useRef(false);
  const [formulaSearch, setFormulaSearch] = useState("");
  const [formulaPage, setFormulaPage] = useState(0);
  const FORMULAS_PER_PAGE = 10;
  const [pctInputs, setPctInputs] = useState<Record<number, string>>({});
  const [colorQuery, setColorQuery] = useState("");
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const colorBlurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 色母搜索下拉
  const [tonerDropdownFor, setTonerDropdownFor] = useState<number | null>(null);
  const [tonerQuery, setTonerQuery] = useState("");
  const tonerBlurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  // 色母下拉脱离表格横向滚动容器，避免被 overflow 裁剪。
  const [tonerDropdownPos, setTonerDropdownPos] = useState<{ left: number; top: number; width: number } | null>(null);
  // 移动端：编辑模式开关
  const [isEditing, setIsEditing] = useState(false);
  function closeEditor() { resetPending(); setIsEditing(false); }

  const percentageSums = useMemo(() => {
    const filled = components.filter((c) => c.toner_code.trim() !== "");
    if (form.formula_type === "Three Stages") {
      return {
        "Pearl Paint": filled.filter((c) => c.component_group === "Pearl Paint").reduce((s, c) => s + c.percentage, 0),
        "Ground Paint": filled.filter((c) => c.component_group === "Ground Paint").reduce((s, c) => s + c.percentage, 0),
      } as Record<ComponentGroup, number>;
    }
    return { all: filled.reduce((s, c) => s + c.percentage, 0) };
  }, [components, form.formula_type]);

  const percentageValid = useMemo(() => {
    const filled = components.filter((c) => c.toner_code.trim() !== "");
    if (filled.length === 0) return false;
    if (form.formula_type === "Three Stages") {
      const sums = percentageSums as Record<ComponentGroup, number>;
      return Math.abs((sums["Pearl Paint"] ?? 0) - 100) < 0.01 && Math.abs((sums["Ground Paint"] ?? 0) - 100) < 0.01;
    }
    return Math.abs(((percentageSums as { all: number }).all) - 100) < 0.01;
  }, [percentageSums, form.formula_type, components]);

  useEffect(() => { if (!selectedId && !idManuallyEdited.current && form.color_id && form.version) setForm((prev) => ({ ...prev, id: generateUniqueFormulaId(form.color_id, form.variant_id, form.version, formulas.map((f) => f.id)) })); }, [form.color_id, form.variant_id, form.version, selectedId, formulas]);

  const fetchFormulas = useCallback(async () => {
    setLoading(true);
    try {
      const [nextFormulas, nextToners, nextColors, nextTypes, nextBrands] = await Promise.all([
        fetchAdminJson<Formula[]>("/api/admin/formulas"), fetchAdminJson<Toner[]>("/api/toners"),
        fetchAdminJson<Color[]>("/api/admin/colors"), fetchAdminJson<ColorVariant[]>("/api/admin/variants"),
        fetchAdminJson<CarMake[]>("/api/admin/brands"),
      ]);
      setFormulas(nextFormulas); setToners(nextToners); setColors(nextColors); setFormulaTypes(nextTypes); setBrands(nextBrands);
      setLoadError(false);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void fetchFormulas(); }, [fetchFormulas]);

  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);

  function selectFormula(formula: Formula) {
    resetPending();
    setSelectedId(formula.id);
    setYearMode(formulaYearMode(formula));
    setYears((formula.years ?? []).map((entry) => ({ ...entry })));
    setForm({ id: formula.id, color_id: formula.color_id, variant_id: formula.variant_id, version: formula.version, paint_system: formula.paint_system, formula_type: formula.formula_type, notes: formula.notes, image_url: formula.image_url ?? "" });
    setComponents(formula.components.map((c) => ({ ...c, grams_per_100g: c.percentage })));
    setPctInputs({});
    setError(""); setMessage("");
    const color = colors.find((c) => c.id === formula.color_id);
    if (color) { const bName = brandMap.get(color.make_id) ?? color.make_id; setColorQuery(`${color.color_code} - ${color.color_name} (${bName})`); } else { setColorQuery(formula.color_id); }
    setIsEditing(true);
  }

  function newFormula() {
    resetPending();
    setYearMode(""); setYears([]);
    setSelectedId(null); setForm({ id: "", color_id: "", variant_id: "", version: "v1", paint_system: "2K", formula_type: AUTO_2K_TYPE, notes: "", image_url: "" });
    setComponents([]); setPctInputs({}); setError(""); setMessage(""); setColorQuery(""); idManuallyEdited.current = false;
    setIsEditing(true);
  }

  // 上传图片到 Supabase Storage 公开桶 formula-images；返回 { url, path }
  async function uploadFormulaImage(file: File): Promise<{ url: string; path: string }> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/formula-upload", { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || "上传失败");
    }
    return res.json();
  }

  async function handleUploadImage(file: File) {
    const revision = ++editorRevision.current;
    setUploadingImage(true);
    setError("");
    try {
      const { url } = await uploadFormulaImage(file);
      if (revision === editorRevision.current) setForm((prev) => ({ ...prev, image_url: url }));
    } catch (e) {
      if (revision === editorRevision.current) setError(e instanceof Error ? e.message : "上传失败");
    } finally {
      if (revision === editorRevision.current) setUploadingImage(false);
    }
  }

  function handleRemoveImage() {
    resetPending();
    setForm((prev) => ({ ...prev, image_url: "" }));
  }

  function handlePaintSystemChange(next: "1K" | "2K") {
    setForm((prev) => {
      if (next === "2K") return { ...prev, paint_system: next, formula_type: AUTO_2K_TYPE };
      const availableTypes = formulaTypes.map((v) => v.name).filter((n) => n === "Two Stages" || n === "Three Stages") as FormulaType[];
      return { ...prev, paint_system: next, formula_type: availableTypes.includes(prev.formula_type as FormulaType) ? prev.formula_type : (availableTypes[0] || "Two Stages") };
    });
    setComponents((prev) => prev.map((c) => {
      const cleared = { ...c, toner_code: "", toner_name: "", percentage: 0, grams_per_100g: 0, rgb_r: undefined, rgb_g: undefined, rgb_b: undefined };
      if (next === "2K") { const { component_group: _, ...rest } = cleared; return rest; }
      return cleared;
    }));
  }

  function handleFormulaTypeChange(next: FormulaType) {
    setForm((prev) => ({ ...prev, formula_type: next }));
    if (next !== "Three Stages") setComponents((prev) => prev.map((c) => { const { component_group: _, ...rest } = c; return rest; }));
    else setComponents((prev) => prev.map((c) => (!c.component_group ? { ...c, component_group: "Pearl Paint" as ComponentGroup } : c)));
  }

  function addComponent(group?: ComponentGroup) {
    const newComp: FormulaComponent = { ...EMPTY_COMPONENT, uid: crypto.randomUUID() };
    if (group) newComp.component_group = group;
    setComponents((prev) => [...prev, newComp]);
  }

  function updateComponent(index: number, field: keyof FormulaComponent, value: string | number | undefined) {
    setComponents((prev) => prev.map((c, i) => (i === index ? ({ ...c, [field]: value } as FormulaComponent) : c)));
  }

  function removeComponent(index: number) {
    setComponents((prev) => prev.filter((_, i) => i !== index));
    setPctInputs((prev) => { const next: Record<number, string> = {}; Object.entries(prev).forEach(([k, v]) => { const ki = Number(k); if (ki < index) next[ki] = v; if (ki > index) next[ki - 1] = v; }); return next; });
  }

  async function handleSave() {
    if (uploadingImage || saving) return;
    const revision = editorRevision.current;
    setError(""); setMessage("");
    if (!form.id || !form.color_id) { setError("配方 ID 和关联颜色不能为空"); return; }
    const yearError = validateFormulaYears({ year_mode: yearMode, years: yearMode === "inherit" ? [] : years }, true);
    if (yearError) { setError(yearError); return; }
    const selectedColor = colors.find((color) => color.id === form.color_id);
    if (yearMode === "custom" && !yearsContainedBy(years, selectedColor?.years ?? [])) {
      setError("自定义年份必须完整包含在颜色适用年份内，不能跨越空档"); return;
    }
    const comps = components.filter((c) => c.toner_code.trim()).map((c) => ({ ...c, grams_per_100g: c.percentage }));
    // 变体保留：编辑时沿用已有 variant_id；新建时不关联变体（"" → null）
    const payload: Formula = { ...form, year_mode: yearMode as "inherit" | "custom", years: yearMode === "inherit" ? [] : years, variant_id: form.variant_id, components: comps, updated_at: "", image_url: form.image_url || undefined };
    setSaving(true);
    try {
      const res = await fetch("/api/admin/formulas", { method: selectedId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (revision !== editorRevision.current) return;
      if (res.ok) {
        setMessage("保存成功");
        fetchFormulas(); setSelectedId(payload.id); closeEditor();
      }
      else { const data = await res.json(); setError(data.error || "保存失败"); }
    } catch { if (revision === editorRevision.current) setError("网络错误，请重试"); }
    finally { if (revision === editorRevision.current) setSaving(false); }
  }

  async function handleDelete() {
    if (!selectedId) return;
    if (!confirm(`确定删除配方「${selectedId}」吗？`)) return;
    try {
      const res = await fetch("/api/admin/formulas", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedId }) });
      if (res.ok) { newFormula(); fetchFormulas(); closeEditor(); } else { setError("删除失败"); }
    } catch { setError("网络错误，请重试"); }
  }

  const tonerPool = useMemo(() => filterTonersBySystem(form.paint_system, toners), [form.paint_system, toners]);
  const filteredFormulas = useMemo(() => {
    const q = formulaSearch.toLowerCase().trim();
    if (!q) return formulas;
    return formulas.filter((f) => { if (f.id.toLowerCase().includes(q)) return true; const cc = colors.find((c) => c.id === f.color_id)?.color_code ?? ""; return cc.toLowerCase().includes(q); });
  }, [formulas, formulaSearch, colors]);

  useEffect(() => {
    setFormulaPage(0);
  }, [formulas, formulaSearch]);

  const formulaTotalPages = Math.max(1, Math.ceil(filteredFormulas.length / FORMULAS_PER_PAGE));
  const visibleFormulas = filteredFormulas.slice(formulaPage * FORMULAS_PER_PAGE, formulaPage * FORMULAS_PER_PAGE + FORMULAS_PER_PAGE);

  const INPUT_CLASS = "w-full border border-input rounded-lg px-3 py-2 h-[38px] text-sm outline-none transition-colors focus:border-primary focus:ring-[3px] focus:ring-primary/10";

  const selectedColor = colors.find((color) => color.id === form.color_id);
  const currentYears = effectiveFormulaYears({ year_mode: yearMode || "inherit", years }, selectedColor ?? {});
  const overlapping = yearMode && selectedColor ? formulas.filter((other) => other.id !== selectedId && other.color_id === form.color_id &&
    other.paint_system === form.paint_system && other.formula_type === form.formula_type && yearsOverlap(currentYears, effectiveFormulaYears(other, selectedColor))) : [];

  function updateYear(index: number, key: keyof YearEntry, value: string) {
    setYears((prev) => prev.map((entry, i) => i === index ? { ...entry, [key]: value === "" ? undefined : Number(value) } : entry));
  }

  function renderComponentTable(group?: ComponentGroup) {
    const title = group ?? "色母组件";
    const filtered = group ? components.filter((c) => c.component_group === group) : components;
    return (
      <div key={group ?? "regular"}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <Button onClick={() => addComponent(group)} variant="outline" size="sm" className="rounded-lg text-sm"><Plus className="size-4" /> 添加色母</Button>
        </div>

        {/* 表格保持最小可读宽度，空间不足时在表内横向滚动；色母下拉固定定位避免裁剪。 */}
        <div className="rounded-lg border border-border [&_div[data-slot='table-container']]:overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-muted/80">
                <TableHead className="w-[22%] py-2 text-xs font-semibold text-muted-foreground uppercase">色母编号</TableHead>
                <TableHead className="w-[28%] py-2 text-xs font-semibold text-muted-foreground uppercase">名称</TableHead>
                <TableHead className="w-[15%] py-2 text-xs font-semibold text-muted-foreground uppercase">百分比</TableHead>
                <TableHead className="w-[25%] py-2 text-xs font-semibold text-muted-foreground uppercase">RGB</TableHead>
                <TableHead className="w-[10%] py-2 text-xs font-semibold text-muted-foreground uppercase"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm italic text-muted-foreground">暂无色母，点击「+ 添加色母」开始</TableCell></TableRow>
              )}
              {filtered.map((c, rowIndex) => {
                const globalIndex = components.indexOf(c);
                return (
                  <TableRow key={c.uid ?? globalIndex} className="border-b border-border/50 last:border-b-0 hover:bg-muted/50">
                    <TableCell className="py-2 px-2 relative">
                      <input
                        type="text" value={c.toner_code}
                        onChange={(e) => { updateComponent(globalIndex, "toner_code", e.target.value); setTonerQuery(e.target.value); setTonerDropdownFor(globalIndex); }}
                        onFocus={(e) => {
                          setTonerQuery(e.target.value); setTonerDropdownFor(globalIndex);
                          // 记录锚点位置，让下拉与色母输入框对齐。
                          const r = e.currentTarget.getBoundingClientRect();
                          setTonerDropdownPos({ left: r.left, top: r.bottom, width: r.width });
                        }}
                        onBlur={() => { tonerBlurRef.current = setTimeout(() => { setTonerDropdownFor(null); setTonerDropdownPos(null); }, 180); }}
                        className={INPUT_CLASS}
                      />
                      {tonerDropdownFor === globalIndex && (() => {
                        const hits = matchingToners(tonerQuery, tonerPool);
                        if (hits.length === 0) return null;
                        return (
                          <div
                            className="fixed left-[var(--toner-left)] top-[var(--toner-top)] z-[100] mt-1 max-h-40 w-[var(--toner-width)] overflow-auto rounded-lg border border-border bg-card shadow-lg"
                            style={tonerDropdownPos ? { "--toner-left": `${tonerDropdownPos.left}px`, "--toner-top": `${tonerDropdownPos.top}px`, "--toner-width": `${tonerDropdownPos.width}px` } as CSSProperties : undefined}
                          >
                            {hits.map((t) => (
                              <button
                                key={t.code}
                                onMouseDown={() => {
                                  updateComponent(globalIndex, "toner_code", t.code);
                                  updateComponent(globalIndex, "toner_name", t.nameZh || t.tradeName);
                                  updateComponent(globalIndex, "rgb_r", t.rgb_r);
                                  updateComponent(globalIndex, "rgb_g", t.rgb_g);
                                  updateComponent(globalIndex, "rgb_b", t.rgb_b);
                                  setTonerDropdownFor(null);
                                }}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-blue-50"
                              >
                                <div className="size-4 rounded-full border border-border flex-shrink-0" style={{ backgroundColor: `#${t.hex.replace(/^#/, "")}` }} />
                                <span className="font-medium w-20 flex-shrink-0">{t.code}</span>
                                <span className="text-muted-foreground truncate">{t.nameZh || t.tradeName}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <input type="text" value={c.toner_name} onChange={(e) => updateComponent(globalIndex, "toner_name", e.target.value)} className={INPUT_CLASS} />
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <input
                        type="text" inputMode="decimal"
                        value={globalIndex in pctInputs ? pctInputs[globalIndex] : (c.percentage || "")}
                        onChange={(e) => { const raw = e.target.value; if (raw !== "" && !/^[\d.]*$/.test(raw)) return; setPctInputs((prev) => ({ ...prev, [globalIndex]: raw })); }}
                        onBlur={() => { const raw = pctInputs[globalIndex]; if (raw === undefined) return; if (raw === "" || raw === ".") updateComponent(globalIndex, "percentage", 0); else { const num = parseFloat(raw); if (!isNaN(num)) { const clamped = Math.round(Math.min(100, Math.max(0, num)) * 100) / 100; updateComponent(globalIndex, "percentage", clamped); } } setPctInputs((prev) => { const n = { ...prev }; delete n[globalIndex]; return n; }); }}
                        placeholder="0" className={INPUT_CLASS} style={{ width: "100%", maxWidth: 130 }}
                      />
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <div className="flex gap-2">
                        <input type="number" value={c.rgb_r ?? ""} onChange={(e) => updateComponent(globalIndex, "rgb_r", e.target.value === "" ? undefined : Number(e.target.value))} placeholder="R" className={INPUT_CLASS} style={{ width: "31%", padding: "8px 6px", textAlign: "center" }} />
                        <input type="number" value={c.rgb_g ?? ""} onChange={(e) => updateComponent(globalIndex, "rgb_g", e.target.value === "" ? undefined : Number(e.target.value))} placeholder="G" className={INPUT_CLASS} style={{ width: "31%", padding: "8px 6px", textAlign: "center" }} />
                        <input type="number" value={c.rgb_b ?? ""} onChange={(e) => updateComponent(globalIndex, "rgb_b", e.target.value === "" ? undefined : Number(e.target.value))} placeholder="B" className={INPUT_CLASS} style={{ width: "31%", padding: "8px 6px", textAlign: "center" }} />
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <Button onClick={() => removeComponent(globalIndex)} variant="ghost" size="sm" className="h-8 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="size-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filtered.length > 0 && (() => {
          const sum = group ? (percentageSums as Record<ComponentGroup, number>)[group] ?? 0 : (percentageSums as { all: number }).all ?? 0;
          const isValid = Math.abs(sum - 100) < 0.01;
          return (
            <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isValid ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-destructive/10 border border-destructive/20 text-destructive'}`}>
              {isValid ? '✓' : '⚠'} 百分比总和：{sum.toFixed(2)}% {!isValid && '（必须等于 100%）'}
            </div>
          );
        })()}
      </div>
    );
  }

  if (loadError) return <DataLoadError onRetry={fetchFormulas} />;
  if (loading) return <div className="flex justify-center py-4"><Spinner /></div>;

  return (
    <div className="flex flex-col gap-4 lg:flex-row min-h-[calc(100vh-140px)]">
      {/* 左栏：配方列表 */}
      <div className={`lg:w-64 flex-shrink-0 flex flex-col max-h-[calc(100vh-220px)] ${isEditing ? "max-md:hidden" : ""}`}>
        {/* 桌面端：文字按钮 + 搜索框 上下两排 */}
        <Button onClick={newFormula} variant="outline-primary" className="rounded-lg mb-3 max-md:hidden">
          <Plus className="size-4" /> 新增配方
        </Button>
        {/* 移动端：搜索框 + 圆形 + 按钮合为一排 */}
        <div className="md:hidden flex items-center gap-3 mb-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="搜索配方代码或名称..." value={formulaSearch} onChange={(e) => setFormulaSearch(e.target.value)} className="h-9 rounded-lg pl-9 text-sm" />
          </div>
        </div>
        {/* 移动端新增按钮通过 Portal 渲染到顶部汉堡栏 */}
        {mounted &&
          createPortal(
            <button
              type="button"
              onClick={newFormula}
              aria-label="新增配方"
              className="inline-flex size-9 items-center justify-center text-foreground transition-colors hover:bg-muted"
            >
              <Plus className="size-5" />
            </button>,
            document.getElementById("mobile-brand-action-portal")!
          )}
        {/* 桌面端：搜索框独立一行 */}
        <div className="relative mb-3 max-md:hidden">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索配方代码或名称..." value={formulaSearch} onChange={(e) => setFormulaSearch(e.target.value)} className="h-9 rounded-lg pl-9 text-sm" />
        </div>
        <div className="flex-1 overflow-auto rounded-lg border border-border min-h-0">
          {visibleFormulas.map((f) => {
            const isSel = selectedId === f.id;
            return (
              <button key={f.id} onClick={() => selectFormula(f)}
                className={`w-full text-left px-3 py-3 border-b border-border/50 text-sm transition-colors ${isSel ? 'bg-blue-50/60 font-semibold text-primary' : 'text-foreground/80 hover:bg-muted'}`}
              >
                <span className="block font-semibold text-foreground">{colors.find((c) => c.id === f.color_id)?.color_code || f.color_id}</span>
                <span className="block text-xs text-muted-foreground">{f.id}</span>
                <span className="block text-xs text-muted-foreground">{formatYears(effectiveFormulaYears(f, colors.find((color) => color.id === f.color_id) ?? {})) || "年份未设置"} · {formulaYearMode(f) === "custom" ? "自定义" : "沿用颜色年份"}</span>
              </button>
            );
          })}
        </div>
        {/* 分页脚注：列表按页渲染，避免一次性展示全部配方导致页面过长 */}
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
          <p className="min-w-0 truncate text-xs font-semibold text-primary">Found {filteredFormulas.length} formulas</p>
          <div className="flex items-center gap-1.5">
            <span className="whitespace-nowrap text-2xs text-muted-foreground">{formulaPage + 1} / {formulaTotalPages}</span>
            <Button size="icon" variant="ghost" disabled={formulaPage === 0} onClick={() => setFormulaPage(formulaPage - 1)} aria-label="上一页" className="size-8 rounded-lg">‹</Button>
            <Button size="icon" variant="ghost" disabled={formulaPage >= formulaTotalPages - 1} onClick={() => setFormulaPage(formulaPage + 1)} aria-label="下一页" className="size-8 rounded-lg">›</Button>
          </div>
        </div>
      </div>

      {/* 右栏：配方编辑 */}
      <div className={`min-w-0 flex-1 rounded-xl border border-border p-6 pb-8 shadow-sm max-md:p-5 max-md:pb-6 ${!isEditing ? "max-md:hidden" : ""}`}>
        {/* 移动端编辑面板返回栏 */}
        <div className="md:hidden flex items-center gap-2 border-b border-border pb-3 mb-4 -mx-5 px-5">
          <button onClick={closeEditor} className="inline-flex size-9 items-center justify-center rounded-lg text-foreground" aria-label="返回">
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-sm font-medium">{selectedId ? "编辑配方" : "新增配方"}</span>
        </div>
        <h3 className="mb-5 text-base font-semibold text-foreground">基本信息</h3>
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2">
            <Label className="text-sm font-medium text-foreground/80">配方 ID</Label>
            <Input value={form.id} onChange={(e) => { idManuallyEdited.current = true; setForm({ ...form, id: e.target.value }); }} disabled={!!selectedId} className="h-9 rounded-lg" />
          </div>
          <div className="relative flex min-w-0 flex-col gap-2">
            <Label className="text-sm font-medium text-foreground/80">关联颜色</Label>
            <Input value={colorQuery} onChange={(e) => { setColorQuery(e.target.value); setColorDropdownOpen(true); if (colorBlurRef.current) { clearTimeout(colorBlurRef.current); colorBlurRef.current = null; } }} onFocus={() => { setColorDropdownOpen(true); if (colorBlurRef.current) { clearTimeout(colorBlurRef.current); colorBlurRef.current = null; } }} onBlur={() => { colorBlurRef.current = setTimeout(() => setColorDropdownOpen(false), 150); }} className="h-9 rounded-lg" placeholder="搜索颜色代码、名称、品牌..." />
            {colorDropdownOpen && matchingColors(colorQuery, colors, brands).length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-card shadow-lg">
                {matchingColors(colorQuery, colors, brands).map((c) => {
                  const bName = brandMap.get(c.make_id) ?? c.make_id;
                  return (
                    <button key={c.id} onMouseDown={() => { setForm((prev) => ({ ...prev, color_id: c.id, variant_id: "" })); setColorQuery(`${c.color_code} - ${c.color_name} (${bName})`); setColorDropdownOpen(false); }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted">
                      <div className="size-5 rounded border border-border" style={{ backgroundColor: c.hex_preview }} />
                      <span className="font-medium">{c.color_code}</span>
                      <span className="text-muted-foreground truncate">{c.color_name}</span>
                      <span className="ml-auto text-muted-foreground">{bName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <Label className="text-sm font-medium text-foreground/80">版本</Label>
            <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className="h-9 rounded-lg" />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label className="text-sm font-medium text-foreground/80">体系</Label>
            <Select value={form.paint_system} onValueChange={(v) => v ? handlePaintSystemChange(v as "1K" | "2K") : null}>
              <SelectTrigger className="h-9 w-full rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent data-admin-data>{PAINT_SYSTEMS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label className="text-sm font-medium text-foreground/80">配方类型</Label>
            <Select value={form.formula_type} onValueChange={(v) => v ? handleFormulaTypeChange(v as FormulaType) : null} disabled={form.paint_system === "2K"}>
              <SelectTrigger className="h-9 w-full rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent data-admin-data>
                {(form.paint_system === "2K" ? [AUTO_2K_TYPE] : formulaTypes.map((v) => v.name).filter((n) => n === "Two Stages" || n === "Three Stages")).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <fieldset className="mt-8 flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
          <legend className="px-2 text-sm font-semibold">配方适用年份</legend>
          <Label htmlFor="formula-year-mode">年份设置（必选）</Label>
          <select id="formula-year-mode" value={yearMode} onChange={(e) => setYearMode(e.target.value as typeof yearMode)} className={`${INPUT_CLASS} max-md:min-h-11`}>
            <option value="" disabled>请选择年份设置</option>
            <option value="custom">自定义年份</option>
            <option value="inherit">沿用颜色年份</option>
          </select>
          <p className="text-xs leading-relaxed text-muted-foreground">颜色适用年份：{formatYears(selectedColor?.years ?? []) || "未设置"}</p>
          {yearMode === "inherit" && <p className="text-xs leading-relaxed text-muted-foreground">随颜色年份调整；不代表已逐个核实配方适用范围。</p>}
          {yearMode === "custom" && <>
            {years.map((entry, index) => (
              <div key={index} className="flex min-w-0 items-center gap-2 max-md:flex-wrap">
                <input aria-label={`起始年份 ${index + 1}`} type="number" min={1900} max={2100} value={entry.year ?? ""} onChange={(e) => updateYear(index, "year", e.target.value)} className={`${INPUT_CLASS} min-w-0 flex-1`} />
                <span>–</span>
                <input aria-label={`结束年份 ${index + 1}`} placeholder="留空为单年" type="number" min={1900} max={2100} value={entry.year_end ?? ""} onChange={(e) => updateYear(index, "year_end", e.target.value)} className={`${INPUT_CLASS} min-w-0 flex-1`} />
                <Button type="button" variant="outline" aria-label={`删除年份 ${index + 1}`} onClick={() => setYears((prev) => prev.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" className="self-start" onClick={() => setYears((prev) => [...prev, { year: selectedColor?.years?.[0]?.year ?? new Date().getFullYear() }])}><Plus className="size-4" />添加年份或区间</Button>
            <p className="text-xs leading-relaxed text-muted-foreground">结束年份留空表示单年；可添加多个区间，不能跨越颜色年份的空档。</p>
          </>}
          {overlapping.length > 0 && <p role="status" className="text-sm text-amber-700">年份与同颜色、体系和工序的配方重叠：{overlapping.map((other) => other.id).join("、")}。允许作为备选配方保存。</p>}
        </fieldset>
        <div className="mt-6 flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground/80">施工备注</Label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[88px] w-full rounded-lg border border-border p-3 text-sm outline-none focus:border-primary" />
        </div>

        {/* 颜色参考图（OEM 车体照片）：存在则首页/抽屉/我的配方卡片优先显示，否则回退静态图 */}
        <div className="mt-6 flex flex-col gap-3">
          <Label className="text-sm font-medium text-foreground/80">颜色参考图</Label>
          <div className="flex items-start gap-4 max-md:flex-col">
            {form.image_url ? (
              <img src={form.image_url} alt="颜色参考图" className="size-24 shrink-0 rounded-md border border-border object-cover" />
            ) : (
              <div className="flex size-24 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">无</div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-3 max-md:w-full">
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://... 或下方上传" className="h-9 rounded-lg" />
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs hover:bg-muted">
                  <Upload className="size-3" />
                  {uploadingImage ? "上传中..." : form.image_url ? "替换图片" : "上传图片到 Supabase Storage"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    capture="environment"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(f); e.target.value = ""; }}
                  />
                </label>
                {form.image_url && (
                  <Button onClick={handleRemoveImage} variant="ghost" size="sm" className="h-11 text-destructive hover:bg-destructive/10">移除图片</Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 min-h-0 flex-1 overflow-visible border-t border-border pt-6">
          {form.formula_type === "Three Stages" ? (
            <div className="flex flex-col gap-6">{PEARL_GROUPS.map((g) => renderComponentTable(g))}</div>
          ) : renderComponentTable()}
        </div>

        {error && <p className="text-sm font-medium text-destructive mt-3">{error}</p>}
        {message && <p className="text-sm font-medium text-green-600 mt-3">{message}</p>}

        <div className="-mx-6 mt-6 flex justify-end gap-3 border-t border-border px-6 pt-5 max-md:-mx-5 max-md:px-5">
          {selectedId && <Button onClick={handleDelete} variant="outline" className="rounded-lg text-sm text-destructive border-destructive/20 hover:bg-destructive/10">删除配方</Button>}
          <Button onClick={handleSave} disabled={!yearMode || !percentageValid || uploadingImage || saving} className="rounded-lg bg-primary text-sm hover:bg-primary/80 disabled:bg-muted disabled:text-muted-foreground/30">保存配方</Button>
        </div>
      </div>
    </div>
  );
}

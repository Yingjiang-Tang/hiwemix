"use client";

import { useState, useEffect, useCallback, useRef, useMemo, type CSSProperties, type FocusEvent } from "react";
import type { Formula, FormulaComponent, FormulaType, ComponentGroup, Color, ColorVariant, YearEntry } from "@/types";
import type { Toner, CarMake } from "@/types";
import { generateUniqueFormulaId } from "@/lib/id-generator";
import { hexToRgb, filterTonersBySystem, matchingToners, matchingColors } from "./formula-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Search, Plus, Trash2 } from "lucide-react";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ id: "", color_id: "", variant_id: "", version: "v1", paint_system: "2K" as Formula["paint_system"], formula_type: AUTO_2K_TYPE, notes: "", year: undefined as number | undefined });
  const [components, setComponents] = useState<FormulaComponent[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const idManuallyEdited = useRef(false);
  const [formulaSearch, setFormulaSearch] = useState("");
  const [availableYears, setAvailableYears] = useState<YearEntry[]>([]);
  // 将 YearEntry[] 展开为所有包含的单年（用于下拉选项）
  const expandedYears = useMemo(() => {
    const result: number[] = [];
    for (const e of availableYears) {
      if (e.year_end == null) {
        result.push(e.year);
      } else {
        for (let y = e.year; y <= e.year_end; y++) result.push(y);
      }
    }
    return [...new Set(result)].sort((a, b) => a - b);
  }, [availableYears]);
  const [pctInputs, setPctInputs] = useState<Record<number, string>>({});
  const [colorQuery, setColorQuery] = useState("");
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const colorBlurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 色母搜索下拉
  const [tonerDropdownFor, setTonerDropdownFor] = useState<number | null>(null);
  const [tonerQuery, setTonerQuery] = useState("");
  const tonerBlurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const fetchFormulas = useCallback(async () => { try { const res = await fetch("/api/admin/formulas"); if (res.ok) setFormulas(await res.json()); } catch {} setLoading(false); }, []);
  useEffect(() => {
    const ctrl = new AbortController();
    fetchFormulas();
    fetch("/api/toners", { signal: ctrl.signal }).then((r) => r.ok ? r.json() : []).then(setToners).catch(() => {});
    fetch("/api/admin/colors", { signal: ctrl.signal }).then((r) => r.ok ? r.json() : []).then(setColors).catch(() => {});
    fetch("/api/admin/variants", { signal: ctrl.signal }).then((r) => r.ok ? r.json() : []).then(setFormulaTypes).catch(() => {});
    fetch("/api/admin/brands", { signal: ctrl.signal }).then((r) => r.ok ? r.json() : []).then(setBrands).catch(() => {});
    return () => ctrl.abort();
  }, [fetchFormulas]);

  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);

  function selectFormula(formula: Formula) {
    setSelectedId(formula.id);
    setForm({ id: formula.id, color_id: formula.color_id, variant_id: formula.variant_id, version: formula.version, paint_system: formula.paint_system, formula_type: formula.formula_type, notes: formula.notes, year: formula.year });
    setComponents(formula.components.map((c) => ({ ...c, grams_per_100g: c.percentage })));
    setPctInputs({});
    setError(""); setMessage("");
    const color = colors.find((c) => c.id === formula.color_id);
    if (color) { const bName = brandMap.get(color.make_id) ?? color.make_id; setColorQuery(`${color.color_code} - ${color.color_name} (${bName})`); } else { setColorQuery(formula.color_id); }
    setAvailableYears(color?.years || []);
  }

  function newFormula() {
    setSelectedId(null); setForm({ id: "", color_id: "", variant_id: "", version: "v1", paint_system: "2K", formula_type: AUTO_2K_TYPE, notes: "", year: undefined });
    setComponents([]); setPctInputs({}); setError(""); setMessage(""); setColorQuery(""); setAvailableYears([]); idManuallyEdited.current = false;
  }

  function handlePaintSystemChange(next: "1K" | "2K") {
    setForm((prev) => {
      if (next === "2K") return { ...prev, paint_system: next, formula_type: AUTO_2K_TYPE };
      const availableTypes = formulaTypes.map((v) => v.name).filter((n) => n !== "Single Stage") as FormulaType[];
      return { ...prev, paint_system: next, formula_type: availableTypes.includes(prev.formula_type as FormulaType) ? prev.formula_type : (availableTypes[0] || AUTO_2K_TYPE) };
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
    setError(""); setMessage("");
    if (!form.id || !form.color_id) { setError("配方 ID 和关联颜色不能为空"); return; }
    const comps = components.filter((c) => c.toner_code.trim()).map((c) => ({ ...c, grams_per_100g: c.percentage }));
    // 变体保留：selectFormula 已把已有 variant_id 写进 form；新建时由用户选择（不选则为 "" → null）
    const payload: Formula = { ...form, variant_id: form.variant_id, components: comps, updated_at: "", year: form.year };
    try {
      const res = await fetch("/api/admin/formulas", { method: selectedId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setMessage("保存成功"); fetchFormulas(); setSelectedId(payload.id); }
      else { const data = await res.json(); setError(data.error || "保存失败"); }
    } catch { setError("网络错误，请重试"); }
  }

  async function handleDelete() {
    if (!selectedId) return;
    if (!confirm(`确定删除配方「${selectedId}」吗？`)) return;
    try {
      const res = await fetch("/api/admin/formulas", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedId }) });
      if (res.ok) { newFormula(); fetchFormulas(); } else { setError("删除失败"); }
    } catch { setError("网络错误，请重试"); }
  }

  const tonerPool = useMemo(() => filterTonersBySystem(form.paint_system, toners), [form.paint_system, toners]);
  const filteredFormulas = useMemo(() => {
    const q = formulaSearch.toLowerCase().trim();
    if (!q) return formulas;
    return formulas.filter((f) => { if (f.id.toLowerCase().includes(q)) return true; const cc = colors.find((c) => c.id === f.color_id)?.color_code ?? ""; return cc.toLowerCase().includes(q); });
  }, [formulas, formulaSearch, colors]);

  const INPUT_CLASS = "w-full border border-input rounded-lg px-3 py-2 h-[38px] text-sm outline-none transition-colors focus:border-primary focus:ring-[3px] focus:ring-primary/10";

  function renderComponentTable(group?: ComponentGroup) {
    const title = group ?? "色母组件";
    const filtered = group ? components.filter((c) => c.component_group === group) : components;
    return (
      <div key={group ?? "regular"} className="mt-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <Button onClick={() => addComponent(group)} variant="outline" size="sm" className="rounded-lg text-sm"><Plus className="size-4" /> 添加色母</Button>
        </div>

        <div className="[&_div[data-slot='table-container']]:overflow-visible rounded-lg border border-border max-h-none">
          <Table>
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
                        onFocus={(e) => { setTonerQuery(e.target.value); setTonerDropdownFor(globalIndex); }}
                        onBlur={() => { tonerBlurRef.current = setTimeout(() => setTonerDropdownFor(null), 180); }}
                        className={INPUT_CLASS}
                      />
                      {tonerDropdownFor === globalIndex && (() => {
                        const hits = matchingToners(tonerQuery, tonerPool);
                        if (hits.length === 0) return null;
                        return (
                          <div className="absolute left-2 right-2 top-full z-50 mt-1 max-h-40 overflow-auto rounded-lg border border-border bg-card shadow-lg">
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

  if (loading) return <div className="flex justify-center py-4"><Spinner /></div>;

  return (
    <div className="flex flex-col gap-4 lg:flex-row min-h-[calc(100vh-140px)]">
      {/* 左栏：配方列表 */}
      <div className="lg:w-64 flex-shrink-0 flex flex-col max-h-[200px] lg:max-h-none">
        <Button onClick={newFormula} variant="outline-primary" className="rounded-lg mb-3"><Plus className="size-4" /> 新增配方</Button>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索配方代码或名称..." value={formulaSearch} onChange={(e) => setFormulaSearch(e.target.value)} className="h-9 rounded-lg pl-9 text-sm" />
        </div>
        <div className="flex-1 overflow-auto rounded-lg border border-border min-h-0">
          {filteredFormulas.map((f) => {
            const isSel = selectedId === f.id;
            return (
              <button key={f.id} onClick={() => selectFormula(f)}
                className={`w-full text-left px-3 py-3 border-b border-border/50 text-sm transition-colors ${isSel ? 'bg-blue-50/60 font-semibold text-primary' : 'text-foreground/80 hover:bg-muted'}`}
              >
                <span className="block font-semibold text-foreground">{colors.find((c) => c.id === f.color_id)?.color_code || f.color_id}</span>
                <span className="block text-xs text-muted-foreground">{f.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右栏：配方编辑 */}
      <div className="flex-1 rounded-xl border border-border p-5 pb-8 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground/80">配方 ID</Label>
            <Input value={form.id} onChange={(e) => { idManuallyEdited.current = true; setForm({ ...form, id: e.target.value }); }} disabled={!!selectedId} className="h-9 rounded-lg" />
          </div>
          <div className="relative flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground/80">关联颜色</Label>
            <Input value={colorQuery} onChange={(e) => { setColorQuery(e.target.value); setColorDropdownOpen(true); if (colorBlurRef.current) { clearTimeout(colorBlurRef.current); colorBlurRef.current = null; } }} onFocus={() => { setColorDropdownOpen(true); if (colorBlurRef.current) { clearTimeout(colorBlurRef.current); colorBlurRef.current = null; } }} onBlur={() => { colorBlurRef.current = setTimeout(() => setColorDropdownOpen(false), 150); }} className="h-9 rounded-lg" placeholder="搜索颜色代码、名称、品牌..." />
            {colorDropdownOpen && matchingColors(colorQuery, colors, brands).length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-card shadow-lg">
                {matchingColors(colorQuery, colors, brands).map((c) => {
                  const bName = brandMap.get(c.make_id) ?? c.make_id;
                  return (
                    <button key={c.id} onMouseDown={() => { setForm((prev) => ({ ...prev, color_id: c.id, variant_id: "", year: undefined })); setColorQuery(`${c.color_code} - ${c.color_name} (${bName})`); setColorDropdownOpen(false); setAvailableYears(c.years || []); }}
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
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground/80">适用年份</Label>
            <Select value={form.year?.toString() || ""} onValueChange={(v) => setForm({ ...form, year: v ? parseInt(v, 10) : undefined })} disabled={!form.color_id}>
              <SelectTrigger className="h-9 w-full rounded-lg"><SelectValue placeholder="所有年份" /></SelectTrigger>
              <SelectContent>{expandedYears.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground/80">关联变体</Label>
            <Select value={form.variant_id} onValueChange={(v) => setForm({ ...form, variant_id: v || "" })}>
              <SelectTrigger className="h-9 w-full rounded-lg"><SelectValue placeholder="不关联变体" /></SelectTrigger>
              <SelectContent>
                {(colors.find((c) => c.id === form.color_id)?.variants ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground/80">版本</Label>
            <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className="h-9 rounded-lg" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground/80">体系</Label>
            <Select value={form.paint_system} onValueChange={(v) => v ? handlePaintSystemChange(v as "1K" | "2K") : null}>
              <SelectTrigger className="h-9 w-full rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>{PAINT_SYSTEMS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground/80">配方类型</Label>
            <Select value={form.formula_type} onValueChange={(v) => v ? handleFormulaTypeChange(v as FormulaType) : null} disabled={form.paint_system === "2K"}>
              <SelectTrigger className="h-9 w-full rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(form.paint_system === "2K" ? [AUTO_2K_TYPE] : formulaTypes.map((v) => v.name).filter((n) => n !== "Single Stage")).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 mt-3">
          <Label className="text-sm font-medium text-foreground/80">施工备注</Label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[60px] w-full rounded-lg border border-border p-3 text-sm outline-none focus:border-primary" />
        </div>

        <div className="mt-2 flex-1 min-h-0 overflow-visible">
          {form.formula_type === "Three Stages" ? (
            <div className="flex flex-col gap-4">{PEARL_GROUPS.map((g) => renderComponentTable(g))}</div>
          ) : renderComponentTable()}
        </div>

        {error && <p className="text-sm font-medium text-destructive mt-3">{error}</p>}
        {message && <p className="text-sm font-medium text-green-600 mt-3">{message}</p>}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border -mx-5 -mb-5 px-5 pb-0">
          {selectedId && <Button onClick={handleDelete} variant="outline" className="rounded-lg text-sm text-destructive border-destructive/20 hover:bg-destructive/10">删除配方</Button>}
          <Button onClick={handleSave} disabled={!percentageValid} className="rounded-lg bg-primary text-sm hover:bg-primary/80 disabled:bg-muted disabled:text-muted-foreground/30">保存配方</Button>
        </div>
      </div>
    </div>
  );
}

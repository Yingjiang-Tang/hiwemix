"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { CarMake, Color, ColorVariant, YearEntry } from "@/types";
import { colorSwatchStyle } from "@/lib/utils";
import { formatYearEntry } from "@/lib/db-formula";
import { generateUniqueColorId } from "@/lib/id-generator";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Edit, Trash2, Plus, X } from "lucide-react";

import { useLang } from "@/components/LanguageContext";

const COLOR_TYPES = ["solid", "metallic", "pearl", "matte", "candy", "special"] as const;

export default function ColorsPanel() {
  const { t } = useLang();
  const [colors, setColors] = useState<Color[]>([]);
  const [brands, setBrands] = useState<CarMake[]>([]);
  const [allVariants, setAllVariants] = useState<ColorVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Color | null>(null);
  const [form, setForm] = useState({ id: "", make_id: "", color_code: "", color_name: "", color_type: "solid" as Color["color_type"], hex_preview: "#FFFFFF", car_model: "" });
  const [variantIds, setVariantIds] = useState<string[]>([]);
  const [yearEntries, setYearEntries] = useState<YearEntry[]>([]);
  const [yearMode, setYearMode] = useState<"single" | "range">("single");
  const [yearInput, setYearInput] = useState("");
  const [yearEndInput, setYearEndInput] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const idManuallyEdited = useRef(false);

  useEffect(() => {
    if (!editing && !idManuallyEdited.current && form.make_id && form.color_code) {
      const existingIds = colors.map((c) => c.id);
      setForm((prev) => ({ ...prev, id: generateUniqueColorId(form.make_id, form.color_code, form.color_type, existingIds) }));
    }
  }, [form.make_id, form.color_code, form.color_type, editing, colors]);

  const fetchColors = useCallback(async () => {
    try { const res = await fetch("/api/admin/colors"); if (res.ok) setColors(await res.json()); } catch {}
    setLoading(false);
  }, []);
  useEffect(() => {
    const ctrl = new AbortController();
    fetchColors();
    fetch("/api/brands", { signal: ctrl.signal }).then((r) => r.ok ? r.json() : []).then(setBrands).catch(() => {});
    fetch("/api/admin/variants", { signal: ctrl.signal }).then((r) => r.ok ? r.json() : []).then(setAllVariants).catch(() => {});
    return () => ctrl.abort();
  }, [fetchColors]);

  useEffect(() => { setPage(0); }, [colors, searchQuery]);

  function openCreate() {
    setEditing(null); setForm({ id: "", make_id: "", color_code: "", color_name: "", color_type: "solid", hex_preview: "#FFFFFF", car_model: "" });
    setVariantIds([]); setYearEntries([]); setYearMode("single"); setYearInput(""); setYearEndInput("");
    setError(""); idManuallyEdited.current = false; setShowModal(true);
  }
  function openEdit(c: Color) {
    setEditing(c); setForm({ id: c.id, make_id: c.make_id, color_code: c.color_code, color_name: c.color_name, color_type: c.color_type, hex_preview: c.hex_preview, car_model: c.car_model ?? "" });
    setVariantIds(c.variants.map((v) => v.id)); setYearEntries(c.years || []); setYearMode("single"); setYearInput(""); setYearEndInput("");
    setError(""); setShowModal(true);
  }
  async function handleSave() {
    setError("");
    if (!form.id || !form.make_id || !form.color_code || !form.color_name) { setError("所有字段不能为空"); return; }
    if (!editing) {
      const code = form.color_code.trim().toUpperCase();
      const dup = colors.filter((c) => c.make_id === form.make_id && c.color_code.trim().toUpperCase() === code);
      if (dup.length > 0) {
        const brandName = brandMap.get(form.make_id) ?? form.make_id;
        const existing = dup.map((c) => `· ${c.color_name}（${c.color_type}）`).join("\n");
        if (!confirm(`已存在 ${dup.length} 条相同代码「${form.color_code}」的颜色（${brandName}）：\n${existing}\n\n是否将当前录入作为独立记录新增？`)) return;
      }
    }
    try {
      const m = editing ? "PUT" : "POST";
      const res = await fetch("/api/admin/colors", { method: m, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, variantIds, years: yearEntries }) });
      if (res.ok) { setShowModal(false); fetchColors(); }
      else { const d = await res.json(); setError(d.error || "保存失败"); }
    } catch { setError("网络错误，请重试"); }
  }
  async function handleDelete(c: Color) {
    if (!confirm(`确定删除颜色「${c.color_name}」吗？`)) return;
    try {
      const res = await fetch("/api/admin/colors", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id }) });
      if (res.ok) { fetchColors(); } else { const d = await res.json(); alert(d.error || "删除失败"); }
    } catch { alert("网络错误，请重试"); }
  }
  function toggleVariant(id: string) { setVariantIds((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]); }

  // 添加 YearEntry（单年或区间）
  function addYearEntry() {
    const start = parseInt(yearInput, 10);
    if (isNaN(start) || start < 1900 || start > 2100) return;
    if (yearMode === "range") {
      const end = parseInt(yearEndInput, 10);
      if (isNaN(end) || end < start || end > 2100) return;
      // 去重：同一颜色的同一起始、同一结束年份不允许重复
      const dup = yearEntries.find(e => e.year === start && e.year_end === end);
      if (dup) return;
      setYearEntries([...yearEntries, { year: start, year_end: end }].sort((a, b) => a.year - b.year));
      setYearEndInput("");
    } else {
      const dup = yearEntries.find(e => e.year === start && e.year_end == null);
      if (dup) return;
      setYearEntries([...yearEntries, { year: start }].sort((a, b) => a.year - b.year));
    }
    setYearInput("");
  }

  // 移除 YearEntry
  function removeYearEntry(entry: YearEntry) {
    setYearEntries(yearEntries.filter(e => !(e.year === entry.year && e.year_end === entry.year_end)));
  }

  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);

  // 每个 YearEntry 展开为一行（而非每个单年一行）
  const allExpandedRows = useMemo(() => colors.flatMap((c): {
    colorId: string; groupIndex: number; groupSize: number;
    yearEntry: YearEntry | undefined; brandName: string; entryCount: number; originalColor: Color;
    color_code: string; color_name: string; color_type: Color["color_type"];
    hex_preview: string; car_model?: string;
  }[] => {
    const brandName = brandMap.get(c.make_id) ?? c.make_id;
    const sorted = [...(c.years ?? [])].sort((a, b) => a.year - b.year);
    if (sorted.length === 0) return [{ colorId: c.id, groupIndex: 0, groupSize: 1, yearEntry: undefined, brandName, entryCount: 0, originalColor: c, color_code: c.color_code, color_name: c.color_name, color_type: c.color_type, hex_preview: c.hex_preview, car_model: c.car_model }];
    return sorted.map((entry, i) => ({ colorId: c.id, groupIndex: i, groupSize: sorted.length, yearEntry: entry, brandName, entryCount: sorted.length, originalColor: c, color_code: c.color_code, color_name: c.color_name, color_type: c.color_type, hex_preview: c.hex_preview, car_model: c.car_model }));
  }), [colors, brandMap]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allExpandedRows;
    return allExpandedRows.filter((row) => {
      if (row.color_code.toLowerCase().includes(q)) return true;
      if (row.color_name.toLowerCase().includes(q)) return true;
      if (row.car_model?.toLowerCase().includes(q)) return true;
      if (row.brandName.toLowerCase().includes(q)) return true;
      if (row.color_type.toLowerCase().includes(q)) return true;
      if (row.yearEntry && formatYearEntry(row.yearEntry).toLowerCase().includes(q)) return true;
      return false;
    });
  }, [allExpandedRows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const pageRows = filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading) return <p className="text-center py-4 text-sm text-muted-foreground">加载中...</p>;

  return (
    <div>
      <div className="flex justify-end items-center mb-4 gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索颜色、车型、品牌..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 rounded-lg pl-9 text-2xs" />
        </div>
        <Button onClick={openCreate} className="rounded-lg bg-primary text-2xs hover:bg-primary/80"><Plus className="size-4" /> 新增颜色</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/80">
              <TableHead className="w-[60px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">预览</TableHead>
              <TableHead className="w-[120px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">品牌</TableHead>
              <TableHead className="w-[120px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">颜色代码</TableHead>
              <TableHead className="w-[150px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">颜色名称</TableHead>
              <TableHead className="w-[120px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">车型</TableHead>
              <TableHead className="w-[80px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">类型</TableHead>
              <TableHead className="w-[80px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">年份</TableHead>
              <TableHead className="w-[100px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow key={`${row.colorId}-${row.yearEntry?.year ?? 'none'}-${row.yearEntry?.year_end ?? 's'}`} className="border-b border-border/50 last:border-b-0 hover:bg-muted/50">
                <TableCell className="py-3 text-center">
                  <div className="mx-auto w-10 h-6 rounded border border-border" style={colorSwatchStyle(row.hex_preview)} />
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="block truncate text-2xs font-medium text-foreground">{row.brandName}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="text-2xs font-medium text-muted-foreground">{row.color_code}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="block truncate text-2xs text-foreground">{row.color_name}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="block truncate text-2xs text-muted-foreground">{row.car_model || "—"}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="text-2xs text-muted-foreground">{row.color_type}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="text-2xs text-muted-foreground">{row.yearEntry ? formatYearEntry(row.yearEntry) : ""}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(row.originalColor)} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"><Edit className="size-4" /></button>
                    <button onClick={() => handleDelete(row.originalColor)} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm font-semibold text-primary">Found {filteredRows.length} colors</p>
          <div className="flex items-center gap-2">
            <span className="text-2xs text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button size="icon" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)} className="size-8 rounded-lg">‹</Button>
            <Button size="icon" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="size-8 rounded-lg">›</Button>
          </div>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showModal} onOpenChange={(v) => { if (!v) setShowModal(false); }}>
        <DialogContent className="max-w-2xl bg-white !max-w-[650px]">
          <DialogHeader><DialogTitle>{editing ? "编辑颜色" : "新增颜色"}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-5 py-2 max-h-[70vh] overflow-y-auto">
            {/* 基本信息卡片 */}
            <div className="rounded-xl border border-border p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground/80 border-b border-border/50 pb-3">基本信息</h3>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium text-foreground/80">ID</Label>
                  <Input value={form.id} onChange={(e) => { idManuallyEdited.current = true; setForm({ ...form, id: e.target.value }); }} disabled={!!editing} className="h-9 rounded-lg" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium text-foreground/80">品牌</Label>
                  <Select value={form.make_id} onValueChange={(v) => setForm({ ...form, make_id: v || "" })}>
                    <SelectTrigger className="h-9 w-full rounded-lg"><SelectValue placeholder="请选择品牌" /></SelectTrigger>
                    <SelectContent className="z-[130] max-h-[200px]">{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
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
                    <Select value={form.color_type} onValueChange={(v) => setForm({ ...form, color_type: (v || "solid") as Color["color_type"] })}>
                      <SelectTrigger className="h-9 w-full rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[130] max-h-[200px]">{COLOR_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium text-foreground/80">预览色</Label>
                    <Input type="color" value={form.hex_preview} onChange={(e) => setForm({ ...form, hex_preview: e.target.value })} className="h-9 rounded-lg p-1" />
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
              <h3 className="mb-4 text-sm font-semibold text-foreground/80 border-b border-border/50 pb-3">适用年份</h3>
              {/* 年份芯片列表 */}
              <div className="flex flex-wrap gap-2 mb-3">
                {yearEntries.map((entry) => (
                  <span key={`${entry.year}-${entry.year_end ?? 's'}`} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-2xs text-blue-700">
                    {formatYearEntry(entry)}
                    <button onClick={() => removeYearEntry(entry)} className="size-4 text-blue-400 hover:text-blue-600"><X className="size-3" /></button>
                  </span>
                ))}
                {yearEntries.length === 0 && <p className="text-2xs text-muted-foreground">暂无年份</p>}
              </div>
              {/* 模式切换 */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setYearMode("single")}
                  className={`text-2xs px-3 py-1 rounded-lg border transition-colors ${yearMode === "single" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  {t.yearSingle}
                </button>
                <button
                  onClick={() => setYearMode("range")}
                  className={`text-2xs px-3 py-1 rounded-lg border transition-colors ${yearMode === "range" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  {t.yearRange}
                </button>
              </div>
              {/* 输入框 */}
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={yearMode === "single" ? "年份 (1900-2100)" : "起始年份"}
                  className="h-9 w-32 rounded-lg"
                  min={1900}
                  max={2100}
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addYearEntry(); }}
                />
                {yearMode === "range" && (
                  <Input
                    type="number"
                    placeholder="结束年份"
                    className="h-9 w-32 rounded-lg"
                    min={1900}
                    max={2100}
                    value={yearEndInput}
                    onChange={(e) => setYearEndInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addYearEntry(); }}
                  />
                )}
                <Button variant="outline" size="sm" className="rounded-lg text-2xs" onClick={addYearEntry}>添加</Button>
              </div>
            </div>

            {/* 关联变体卡片 */}
            <div className="rounded-xl border border-border p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground/80 border-b border-border/50 pb-3">关联变体</h3>
              <div className="max-h-[200px] overflow-auto rounded-lg border border-border p-3">
                {allVariants.length === 0 ? (
                  <p className="text-2xs text-muted-foreground">暂无变体</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {allVariants.map((v) => (
                      <label key={v.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={variantIds.includes(v.id)}
                          onChange={() => toggleVariant(v.id)}
                          className="size-4 rounded border-input text-primary focus:ring-primary"
                        />
                        <span className="text-2xs text-foreground/80">{v.name} <span className="text-muted-foreground">({v.year_range})</span></span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-2xs font-medium text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-lg text-2xs">取消</Button>
            <Button onClick={handleSave} className="rounded-lg bg-primary hover:bg-primary/80">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
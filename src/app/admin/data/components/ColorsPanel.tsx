"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import type { CarMake, Color, ColorType, ColorVariant, YearEntry } from "@/types";
import { colorSwatchStyle } from "@/lib/utils";
import { formatYearEntry } from "@/lib/formula-utils";
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
import { Search, Edit, Trash2, Plus, X, ArrowLeft } from "lucide-react";
import ColorPickerField from "@/components/ColorPickerField";
import { ColorFormFields } from "./ColorFormFields";
import { Spinner } from "@/components/ui/spinner";

import { useLang } from "@/components/LanguageContext";

export type ColorForm = { id: string; make_id: string; color_code: string; color_name: string; color_type: ColorType[]; hex_preview: string; car_model: string };
const COLOR_TYPES = ["solid", "metallic", "pearl", "matte", "candy", "special"] as const;

export default function ColorsPanel() {
  const { t } = useLang();
  const [colors, setColors] = useState<Color[]>([]);
  const [brands, setBrands] = useState<CarMake[]>([]);
  const [allVariants, setAllVariants] = useState<ColorVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Color | null>(null);
  const [form, setForm] = useState<ColorForm>({ id: "", make_id: "", color_code: "", color_name: "", color_type: [] as ColorType[], hex_preview: "#FFFFFF", car_model: "" });
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
  const colorTypeScrollRef = useRef<HTMLDivElement>(null);
  const colorTypeDrag = useRef<{ startX: number; scrollLeft: number; moved: boolean; pointerId: number } | null>(null);
  const suppressChipClick = useRef(false);
  // 删除确认弹窗：先查该颜色下的配方清单，确认后带 force=true 真正删除
  const [deleteTarget, setDeleteTarget] = useState<Color | null>(null);
  const [deleteFormulaList, setDeleteFormulaList] = useState<{ id: string; version: string; updated_at: string }[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!editing && !idManuallyEdited.current && form.make_id && form.color_code) {
      const existingIds = colors.map((c) => c.id);
      setForm((prev) => ({ ...prev, id: generateUniqueColorId(form.make_id, form.color_code, existingIds) }));
    }
  }, [form.make_id, form.color_code, editing, colors]);

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
  // 移动端：编辑页面开关（桌面端不使用，受 max-md:hidden 容器控制）
  const [isEditing, setIsEditing] = useState(false);
  // portal 需要在客户端 mounted 后才能访问 document
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  function closeEditor() { setIsEditing(false); }

  // 桌面端新增：弹 Dialog（与改动前行为一致）
  function openCreateDesktop() {
    setEditing(null); setForm({ id: "", make_id: "", color_code: "", color_name: "", color_type: [], hex_preview: "#FFFFFF", car_model: "" });
    setVariantIds([]); setYearEntries([]); setYearMode("single"); setYearInput(""); setYearEndInput("");
    setError(""); idManuallyEdited.current = false; setShowModal(true);
  }
  // 移动端新增：直接进入编辑页面，不弹 Dialog（Dialog 通过 Portal 渲染到 body，CSS 容器无法屏蔽）
  function openCreateMobile() {
    setEditing(null); setForm({ id: "", make_id: "", color_code: "", color_name: "", color_type: [], hex_preview: "#FFFFFF", car_model: "" });
    setVariantIds([]); setYearEntries([]); setYearMode("single"); setYearInput(""); setYearEndInput("");
    setError(""); idManuallyEdited.current = false; setIsEditing(true);
  }
  // 行内编辑：行内按钮桌面/移动端共用同一 DOM，根据点击瞬间视口决定行为
  function openEdit(c: Color) {
    setEditing(c); setForm({ id: c.id, make_id: c.make_id, color_code: c.color_code, color_name: c.color_name, color_type: c.color_type, hex_preview: c.hex_preview, car_model: c.car_model ?? "" });
    setVariantIds(c.variants.map((v) => v.id)); setYearEntries(c.years || []); setYearMode("single"); setYearInput(""); setYearEndInput("");
    setError("");
    // 点击瞬间判断视口：桌面端弹 Dialog，移动端进入编辑页面（行内编辑按钮桌面/移动端共用同一 DOM）
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    setIsEditing(!isDesktop);
    setShowModal(isDesktop);
  }
  async function handleSave() {
    setError("");
    if (!form.id || !form.make_id || !form.color_code || !form.color_name) { setError("所有字段不能为空"); return; }
    if (!editing) {
      const code = form.color_code.trim().toUpperCase();
      const dup = colors.filter((c) => c.make_id === form.make_id && c.color_code.trim().toUpperCase() === code);
      if (dup.length > 0) {
        const brandName = brandMap.get(form.make_id) ?? form.make_id;
        const existing = dup.map((c) => `· ${c.color_name}（${c.color_type.join(", ")}）`).join("\n");
        if (!confirm(`已存在 ${dup.length} 条相同代码「${form.color_code}」的颜色（${brandName}）：\n${existing}\n\n是否将当前录入作为独立记录新增？`)) return;
      }
    }
    try {
      const m = editing ? "PUT" : "POST";
      const res = await fetch("/api/admin/colors", { method: m, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, variantIds, years: yearEntries }) });
      if (res.ok) { setShowModal(false); closeEditor(); fetchColors(); }
      else { const d = await res.json(); setError(d.error || "保存失败"); }
    } catch { setError("网络错误，请重试"); }
  }
  async function handleDelete(c: Color) {
    setDeleteError("");
    setDeleteLoading(true);
    // 第一步：请求配方清单（不删除）。有配方则弹窗列出，无配方直接进入删除确认。
    try {
      const res = await fetch("/api/admin/colors", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id }) });
      const raw = await res.text();
      let d: { needsConfirm?: boolean; formulas?: unknown[]; error?: string } = {};
      try { d = raw ? JSON.parse(raw) : {}; } catch { /* 非 JSON 响应，原样保留 */ }
      if (res.ok && !d.needsConfirm) { fetchColors(); return; }
      if (d.needsConfirm) {
        setDeleteTarget(c);
        setDeleteFormulaList(Array.isArray(d.formulas) ? d.formulas as { id: string; version: string; updated_at: string }[] : []);
        return;
      }
      // 服务端报错：把消息打到弹窗里（深色模式下 alert 容易被忽略）
      setDeleteTarget(c);
      setDeleteFormulaList([]);
      setDeleteError(`服务器响应 ${res.status}：${d.error || raw.slice(0, 200) || "未知错误"}`);
    } catch (e) {
      setDeleteTarget(c);
      setDeleteFormulaList([]);
      setDeleteError(`网络错误：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDeleteLoading(false);
    }
  }
  // 用户在弹窗里确认后，带 force=true 真正删除
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/admin/colors", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTarget.id, force: true }) });
      if (res.ok) {
        setDeleteTarget(null);
        setDeleteFormulaList([]);
        fetchColors();
      } else {
        const d = await res.json();
        setDeleteError(d.error || "删除失败");
      }
    } catch { setDeleteError("网络错误，请重试"); }
    finally { setDeleteLoading(false); }
  }
  function toggleVariant(id: string) { setVariantIds((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]); }
  // 切换颜色类型（多选，数组去重）
  function toggleColorType(t: ColorType) { setForm((prev) => ({ ...prev, color_type: prev.color_type.includes(t) ? prev.color_type.filter((x) => x !== t) : [...prev.color_type, t] })); }

  // 按住标签拖动 = 横向滚动；移动超阈值则不算点击，避免拖动时误删标签。
  // 仅在超过阈值开始拖动时才捕获指针：普通点击（含 ×）不捕获，onClick 正常触发。
  function handleChipPointerDown(e: React.PointerEvent) {
    const el = colorTypeScrollRef.current;
    if (!el) return;
    colorTypeDrag.current = { startX: e.clientX, scrollLeft: el.scrollLeft, moved: false, pointerId: e.pointerId };
    suppressChipClick.current = false;
  }
  function handleChipPointerMove(e: React.PointerEvent) {
    const d = colorTypeDrag.current;
    const el = colorTypeScrollRef.current;
    if (!d || !el || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      try { el.setPointerCapture(e.pointerId); } catch { /* 指针可能已释放 */ }
    }
    el.scrollLeft = d.scrollLeft - dx;
    if (d.moved) suppressChipClick.current = true;
  }
  function endChipDrag(e: React.PointerEvent) {
    if (colorTypeDrag.current?.pointerId === e.pointerId) {
      colorTypeDrag.current = null;
      const el = colorTypeScrollRef.current;
      if (el?.hasPointerCapture?.(e.pointerId)) { try { el.releasePointerCapture(e.pointerId); } catch { /* 已释放 */ } }
    }
  }

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
    color_code: string; color_name: string; color_type: ColorType[];
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
      if (row.color_type.join(" ").toLowerCase().includes(q)) return true;
      if (row.yearEntry && formatYearEntry(row.yearEntry).toLowerCase().includes(q)) return true;
      return false;
    });
  }, [allExpandedRows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const pageRows = filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading) return <div className="flex justify-center py-4 text-muted-foreground"><Spinner /></div>;

  return (
    <div>
      <div className="flex justify-start items-center mb-4 gap-3 max-md:hidden">
    <div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索颜色、车型、品牌..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 rounded-lg pl-9 text-sm" />
        </div>
        {/* 桌面端：保留原文字按钮 */}
        <Button onClick={openCreateDesktop} variant="outline-primary" className="rounded-lg text-sm max-md:hidden">
          <Plus className="size-4" /> 新增颜色
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table className="min-w-max md:min-w-0">
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
                  <span className="block truncate text-sm font-medium text-foreground">{row.brandName}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="text-sm font-medium text-muted-foreground">{row.color_code}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="block truncate text-sm text-foreground">{row.color_name}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="block truncate text-sm text-muted-foreground">{row.car_model || "—"}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {row.color_type.map((t) => (
                      <span key={t} className="rounded-md border border-muted bg-muted/50 px-1.5 py-0.5 text-sm text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="text-sm text-muted-foreground">{row.yearEntry ? formatYearEntry(row.yearEntry) : ""}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(row.originalColor)} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"><Edit className="size-4" /></button>
                    <button onClick={() => handleDelete(row.originalColor)} aria-label="删除颜色" title="删除颜色" className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button>
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

    </div>
      {/* Create/Edit Dialog */}
      <Dialog open={showModal} onOpenChange={(v) => { if (!v) setShowModal(false); }}>
        <DialogContent className="max-w-2xl bg-card !max-w-[650px]">
          <DialogHeader><DialogTitle>{editing ? "编辑颜色" : "新增颜色"}</DialogTitle></DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <ColorFormFields
              form={form}
              setForm={setForm}
              brands={brands}
              allVariants={allVariants}
              variantIds={variantIds}
              setVariantIds={setVariantIds}
              yearEntries={yearEntries}
              yearMode={yearMode}
              setYearMode={setYearMode}
              yearInput={yearInput}
              setYearInput={setYearInput}
              yearEndInput={yearEndInput}
              setYearEndInput={setYearEndInput}
              error={error}
              editing={editing}
              idManuallyEditedRef={idManuallyEdited}
              colorTypeScrollRef={colorTypeScrollRef}
              colorTypeDrag={colorTypeDrag}
              suppressChipClick={suppressChipClick}
              COLOR_TYPES={COLOR_TYPES}
              toggleColorType={toggleColorType}
              toggleVariant={toggleVariant}
              addYearEntry={addYearEntry}
              removeYearEntry={removeYearEntry}
              handleChipPointerDown={handleChipPointerDown}
              handleChipPointerMove={handleChipPointerMove}
              endChipDrag={endChipDrag}
              t={t}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-lg text-sm">取消</Button>
            <Button onClick={handleSave} className="rounded-lg bg-primary hover:bg-primary/80">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗：列出该颜色下会级联删除的配方 */}
      <Dialog open={deleteTarget != null} onOpenChange={(v) => { if (!v && !deleteLoading) { setDeleteTarget(null); setDeleteFormulaList([]); } }}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle>删除颜色「{deleteTarget?.color_name}」</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {deleteFormulaList.length === 0 ? (
              <p className="text-sm text-muted-foreground">该颜色下没有配方，删除后不可恢复。</p>
            ) : (
              <>
                <p className="text-sm font-medium text-destructive">
                  该颜色下有 <span className="font-bold">{deleteFormulaList.length}</span> 条配方，删除颜色将一并删除以下配方及其色母配比明细（不可恢复）：
                </p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2 space-y-1">
                  {deleteFormulaList.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded px-2 py-1 text-sm">
                      <span className="font-medium text-foreground">{f.version || f.id}</span>
                      <span className="text-muted-foreground">{f.updated_at || "—"}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {deleteError && <p className="text-sm font-medium text-destructive">{deleteError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteLoading} className="rounded-lg text-sm">取消</Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="rounded-lg bg-destructive text-white hover:bg-destructive/80"
            >
              {deleteLoading ? <Spinner className="size-4" /> : deleteFormulaList.length === 0 ? "确认删除" : `确认删除（连带 ${deleteFormulaList.length} 条配方）`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 块 3：移动端两栏布局（参考 FormulasPanel/VariantsPanel 模式） */}
      <div className="md:hidden flex flex-col gap-4 lg:flex-row min-h-[calc(100vh-140px)]">
        {/* 左栏：颜色列表 */}
        <div className={`lg:w-64 flex-shrink-0 flex flex-col ${isEditing ? "max-md:hidden" : ""}`}>
          <div className="flex justify-start items-center mb-4 gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索颜色、车型、品牌..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 rounded-lg pl-9 text-sm" />
            </div>
          </div>

          {/* 移动端 + 按钮通过 Portal 渲染到顶部汉堡栏，与 FormulasPanel/BrandsPanel 同款 */}
          {mounted &&
            createPortal(
              <button
                type="button"
                onClick={openCreateMobile}
                aria-label="新增颜色"
                className="inline-flex size-9 items-center justify-center text-foreground transition-colors hover:bg-muted"
              >
                <Plus className="size-5" />
              </button>,
              document.getElementById("mobile-brand-action-portal")!
            )}

          {/* 列表（移动端，独立 DOM） */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table className="min-w-max md:min-w-0">
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
                  <span className="block truncate text-sm font-medium text-foreground">{row.brandName}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="text-sm font-medium text-muted-foreground">{row.color_code}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="block truncate text-sm text-foreground">{row.color_name}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="block truncate text-sm text-muted-foreground">{row.car_model || "—"}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {row.color_type.map((t) => (
                      <span key={t} className="rounded-md border border-muted bg-muted/50 px-1.5 py-0.5 text-sm text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="text-sm text-muted-foreground">{row.yearEntry ? formatYearEntry(row.yearEntry) : ""}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(row.originalColor)} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"><Edit className="size-4" /></button>
                    <button onClick={() => handleDelete(row.originalColor)} aria-label="删除颜色" title="删除颜色" className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button>
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
        </div>

        {/* 右栏：编辑页面（isEditing=true 时显示） */}
        <div className={`flex-1 rounded-xl border border-border p-5 pb-8 shadow-sm ${!isEditing ? "max-md:hidden" : ""}`}>
          {/* 移动端返回栏 */}
          <div className="md:hidden flex items-center gap-2 border-b border-border pb-3 mb-4 -mx-5 px-5">
            <button onClick={closeEditor} className="inline-flex size-9 items-center justify-center rounded-lg text-foreground" aria-label="返回">
              <ArrowLeft className="size-5" />
            </button>
            <span className="text-sm font-medium">{editing ? "编辑颜色" : "新增颜色"}</span>
          </div>
          <ColorFormFields
            form={form}
            setForm={setForm}
            brands={brands}
            allVariants={allVariants}
            variantIds={variantIds}
            setVariantIds={setVariantIds}
            yearEntries={yearEntries}
            yearMode={yearMode}
            setYearMode={setYearMode}
            yearInput={yearInput}
            setYearInput={setYearInput}
            yearEndInput={yearEndInput}
            setYearEndInput={setYearEndInput}
            error={error}
            editing={editing}
            idManuallyEditedRef={idManuallyEdited}
            colorTypeScrollRef={colorTypeScrollRef}
            colorTypeDrag={colorTypeDrag}
            suppressChipClick={suppressChipClick}
            COLOR_TYPES={COLOR_TYPES}
            toggleColorType={toggleColorType}
            toggleVariant={toggleVariant}
            addYearEntry={addYearEntry}
            removeYearEntry={removeYearEntry}
            handleChipPointerDown={handleChipPointerDown}
            handleChipPointerMove={handleChipPointerMove}
            endChipDrag={endChipDrag}
            t={t}
          />
          {/* 移动端 Cancel/Save 按钮（与 FormulasPanel 右栏末尾一致） */}
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border -mx-5 -mb-5 px-5 pb-0">
            <Button variant="outline" onClick={closeEditor} className="rounded-lg text-sm">取消</Button>
            <Button onClick={handleSave} className="rounded-lg bg-primary text-sm hover:bg-primary/80">保存</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

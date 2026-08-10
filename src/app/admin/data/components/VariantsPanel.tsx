"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { ColorVariant } from "@/types";
import { generateVariantId } from "@/lib/id-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Edit, Trash2, Plus } from "lucide-react";

export default function VariantsPanel() {
  const [variants, setVariants] = useState<ColorVariant[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editing, setEditing] = useState<ColorVariant | null>(null);
  const [form, setForm] = useState({ id: "", name: "" });
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const ROWS_PER_PAGE = 10;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const idManuallyEdited = useRef(false);

  function closeEditor() { setIsEditing(false); }

  useEffect(() => { if (!editing && !idManuallyEdited.current && form.name) setForm((prev) => ({ ...prev, id: generateVariantId(form.name) })); }, [form.name, editing]);
  const fetchVariants = useCallback(async () => { try { const r = await fetch("/api/admin/variants"); if (r.ok) setVariants(await r.json()); } catch {} }, []);
  useEffect(() => { fetchVariants(); }, [fetchVariants]);
  useEffect(() => { setPage(0); }, [variants]);

  function openCreate() { setEditing(null); setForm({ id: "", name: "" }); setError(""); idManuallyEdited.current = false; setOriginalId(null); setIsEditing(true); }
  function openEdit(v: ColorVariant) { setEditing(v); setForm({ id: v.id, name: v.name }); setError(""); setOriginalId(v.id); setIsEditing(true); }
  async function handleSave() {
    setError(""); if (!form.id || !form.name) { setError("必须填写所有字段"); return; }
    try {
      const m = editing ? "PUT" : "POST";
      const body: Record<string, string> = { ...form, year_range: "" };
      if (editing && originalId) body.originalId = originalId;
      const r = await fetch("/api/admin/variants", { method: m, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) { closeEditor(); fetchVariants(); } else { const d = await r.json(); setError(d.error || "保存失败"); }
    } catch { setError("网络错误，请重试"); }
  }
  async function handleDelete(v: ColorVariant) {
    if (!confirm(`\u786e\u5b9a\u5220\u9664\u914d\u65b9\u7c7b\u578b\u300c${v.name}」\u5417\uff1f`)) return;
    try {
      const res = await fetch("/api/admin/variants", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: v.id }) });
      if (res.ok) { fetchVariants(); } else { const d = await res.json(); alert(d.error || "删除失败"); }
    } catch { alert("网络错误，请重试"); }
  }

  const totalPages = Math.max(1, Math.ceil(variants.length / ROWS_PER_PAGE));
  const pageRows = variants.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

  return (
    <div className="flex flex-col gap-4 lg:flex-row min-h-[calc(100vh-140px)]">
      {/* 左栏：配方类型列表 */}
      <div className={`lg:w-64 flex-shrink-0 flex flex-col ${isEditing ? "max-md:hidden" : ""}`}>
        {/* 桌面端：文字按钮 */}
        <Button onClick={openCreate} variant="outline-primary" className="rounded-lg mb-3 max-md:hidden">
          <Plus className="size-4" /> 新增配方类型
        </Button>
        {/* 移动端新增按钮通过 Portal 渲染到顶部汉堡栏 */}
        {mounted &&
          createPortal(
            <button
              type="button"
              onClick={openCreate}
              aria-label="新增配方类型"
              className="inline-flex size-9 items-center justify-center text-foreground transition-colors hover:bg-muted"
            >
              <Plus className="size-5" />
            </button>,
            document.getElementById("mobile-brand-action-portal")!
          )}

        <div className="flex-1 overflow-auto rounded-lg border border-border min-h-0">
          <Table className="min-w-max md:min-w-0">
            <TableHeader>
              <TableRow className="bg-muted/80">
                <TableHead className="w-[120px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">ID</TableHead>
                <TableHead className="w-[200px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">名称</TableHead>
                <TableHead className="w-[100px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((v) => (
                <TableRow key={v.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/50">
                  <TableCell className="py-3 text-center text-sm text-muted-foreground font-medium">{v.id}</TableCell>
                  <TableCell className="py-3 text-center text-sm font-medium text-foreground truncate">{v.name}</TableCell>
                  <TableCell className="py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(v)} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"><Edit className="size-4" /></button>
                      <button onClick={() => handleDelete(v)} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm font-semibold text-primary">Found {variants.length} 配方类型</p>
            <div className="flex items-center gap-2">
              <span className="text-2xs text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button size="icon" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)} className="size-8 rounded-lg">‹</Button>
              <Button size="icon" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="size-8 rounded-lg">›</Button>
            </div>
          </div>
        </div>
      </div>

      {/* 右栏：编辑表单 */}
      <div className={`flex-1 rounded-xl border border-border p-5 pb-8 shadow-sm ${!isEditing ? "max-md:hidden" : ""}`}>
        {/* 移动端编辑面板返回栏 */}
        <div className="md:hidden flex items-center gap-2 border-b border-border pb-3 mb-4 -mx-5 px-5">
          <button onClick={closeEditor} className="inline-flex size-9 items-center justify-center rounded-lg text-foreground" aria-label="返回">
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-sm font-medium">{editing ? "编辑配方类型" : "新增配方类型"}</span>
        </div>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground/80">ID</Label>
            <Input value={form.id} onChange={(e) => { idManuallyEdited.current = true; setForm({ ...form, id: e.target.value }); }} className="h-9 rounded-lg" />
            {editing && <p className="text-[11px] text-muted-foreground">修改 ID 将自动更新所有引用</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground/80">名称</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 rounded-lg" />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border -mx-5 -mb-5 px-5 pb-0">
          <Button onClick={handleSave} className="rounded-lg bg-primary text-sm hover:bg-primary/80">保存</Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ColorVariant } from "@/types";
import { generateVariantId } from "@/lib/id-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Edit, Trash2, Plus } from "lucide-react";

export default function VariantsPanel() {
  const [variants, setVariants] = useState<ColorVariant[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ColorVariant | null>(null);
  const [form, setForm] = useState({ id: "", name: "" });
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const ROWS_PER_PAGE = 10;
  const idManuallyEdited = useRef(false);

  useEffect(() => { if (!editing && !idManuallyEdited.current && form.name) setForm((prev) => ({ ...prev, id: generateVariantId(form.name) })); }, [form.name, editing]);
  const fetchVariants = useCallback(async () => { try { const r = await fetch("/api/admin/variants"); if (r.ok) setVariants(await r.json()); } catch {} }, []);
  useEffect(() => { fetchVariants(); }, [fetchVariants]);
  useEffect(() => { setPage(0); }, [variants]);

  function openCreate() { setEditing(null); setForm({ id: "", name: "" }); setError(""); idManuallyEdited.current = false; setOriginalId(null); setShowModal(true); }
  function openEdit(v: ColorVariant) { setEditing(v); setForm({ id: v.id, name: v.name }); setError(""); setOriginalId(v.id); setShowModal(true); }
  async function handleSave() {
    setError(""); if (!form.id || !form.name) { setError("ID 和名称不能为空"); return; }
    try {
      const m = editing ? "PUT" : "POST";
      const body: Record<string, string> = { ...form, year_range: "" };
      if (editing && originalId) body.originalId = originalId;
      const r = await fetch("/api/admin/variants", { method: m, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) { setShowModal(false); fetchVariants(); } else { const d = await r.json(); setError(d.error || "保存失败"); }
    } catch { setError("网络错误，请重试"); }
  }
  async function handleDelete(v: ColorVariant) {
    if (!confirm(`确定删除配方类型「${v.name}」吗？`)) return;
    try {
      const res = await fetch("/api/admin/variants", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: v.id }) });
      if (res.ok) { fetchVariants(); } else { const d = await res.json(); alert(d.error || "删除失败"); }
    } catch { alert("网络错误，请重试"); }
  }

  const totalPages = Math.max(1, Math.ceil(variants.length / ROWS_PER_PAGE));
  const pageRows = variants.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate} className="rounded-lg bg-primary text-2xs hover:bg-primary/80"><Plus className="size-4" /> 新增配方类型</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
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
                <TableCell className="py-3 text-center text-2xs text-muted-foreground font-medium">{v.id}</TableCell>
                <TableCell className="py-3 text-center text-2xs text-foreground truncate">{v.name}</TableCell>
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

      <Dialog open={showModal} onOpenChange={(v) => { if (!v) setShowModal(false); }}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader><DialogTitle>{editing ? "编辑配方类型" : "新增配方类型"}</DialogTitle></DialogHeader>
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

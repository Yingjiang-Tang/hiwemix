"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Guide, GuideCategory } from "@/types";
import { generateGuideId, generateGuideCategoryId } from "@/lib/id-generator";
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
import { Edit, Trash2, Plus, X } from "lucide-react";

interface GuideRow extends Guide { categoryName: string; }

export default function GuidesPanel() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [categories, setCategories] = useState<GuideCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editing, setEditing] = useState<Guide | null>(null);
  const [form, setForm] = useState({ id: "", categoryId: "", title: "", titleZh: "", content: "", contentZh: "" });
  const [error, setError] = useState("");
  const [catForm, setCatForm] = useState({ id: "", name: "", nameZh: "" });
  const [page, setPage] = useState(0);
  const ROWS_PER_PAGE = 10;
  const guideIdEdited = useRef(false);
  const catIdEdited = useRef(false);

  useEffect(() => { if (!editing && !guideIdEdited.current && form.title) setForm((prev) => ({ ...prev, id: generateGuideId(form.title) })); }, [form.title, editing]);
  useEffect(() => { if (!catIdEdited.current && catForm.name) setCatForm((prev) => ({ ...prev, id: generateGuideCategoryId(catForm.name) })); }, [catForm.name]);

  const fetchGuides = useCallback(async () => { try { const r = await fetch("/api/admin/guides"); if (r.ok) setGuides(await r.json()); } catch {} setLoading(false); }, []);
  const fetchCategories = useCallback(async () => { try { const r = await fetch("/api/admin/guide-categories"); if (r.ok) setCategories(await r.json()); } catch {} }, []);
  useEffect(() => { fetchGuides(); fetchCategories(); }, [fetchGuides, fetchCategories]);

  function openCreate() { setEditing(null); setForm({ id: "", categoryId: categories[0]?.id || "", title: "", titleZh: "", content: "", contentZh: "" }); setError(""); guideIdEdited.current = false; setShowModal(true); }
  function openEdit(g: Guide) { setEditing(g); setForm({ id: g.id, categoryId: g.categoryId, title: g.title, titleZh: g.titleZh, content: g.content, contentZh: g.contentZh }); setError(""); setShowModal(true); }
  async function handleSave() {
    setError(""); if (!form.id || !form.categoryId || !form.title || !form.titleZh) { setError("必填字段不能为空"); return; }
    try {
      const m = editing ? "PUT" : "POST";
      const r = await fetch("/api/admin/guides", { method: m, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, sortOrder: 0 }) });
      if (r.ok) { setShowModal(false); fetchGuides(); } else { const d = await r.json(); setError(d.error || "保存失败"); }
    } catch { setError("网络错误，请重试"); }
  }
  async function handleDelete(g: Guide) {
    if (!confirm(`确定删除指南「${g.titleZh}」吗？`)) return;
    try {
      const res = await fetch("/api/admin/guides", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: g.id }) });
      if (res.ok) { fetchGuides(); } else { const d = await res.json(); alert(d.error || "删除失败"); }
    } catch { alert("网络错误，请重试"); }
  }
  async function handleSaveCategory() {
    if (!catForm.id || !catForm.name || !catForm.nameZh) return;
    try {
      const res = await fetch("/api/admin/guide-categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...catForm, sortOrder: 0 }) });
      if (res.ok) { setCatForm({ id: "", name: "", nameZh: "" }); catIdEdited.current = false; fetchCategories(); } else { const d = await res.json(); alert(d.error || "保存失败"); }
    } catch { alert("网络错误，请重试"); }
  }
  async function handleDeleteCategory(cat: GuideCategory) {
    if (!confirm(`确定删除「${cat.nameZh}」吗？`)) return;
    try {
      const res = await fetch("/api/admin/guide-categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cat.id }) });
      if (res.ok) { fetchCategories(); fetchGuides(); } else { const d = await res.json(); alert(d.error || "删除失败"); }
    } catch { alert("网络错误，请重试"); }
  }

  const catMap = new Map(categories.map((c) => [c.id, c.nameZh]));
  const filtered: GuideRow[] = (filterCat ? guides.filter((g) => g.categoryId === filterCat) : guides).map((g) => ({ ...g, categoryName: catMap.get(g.categoryId) ?? g.categoryId }));

  useEffect(() => { setPage(0); }, [guides, filterCat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageRows = filtered.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Select value={filterCat} onValueChange={(v) => setFilterCat(v || "")}>
          <SelectTrigger className="h-9 min-w-[160px] rounded-lg text-2xs"><SelectValue placeholder="全部分类" /></SelectTrigger>
          <SelectContent className="z-[130] max-h-[200px]">{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameZh}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => setShowCatModal(true)} variant="outline" className="h-9 rounded-lg text-2xs">管理分类</Button>
        <Button onClick={openCreate} className="h-9 rounded-lg bg-primary text-2xs hover:bg-primary/80"><Plus className="size-4" /> 新增指南</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/80">
              <TableHead className="w-[120px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">ID</TableHead>
              <TableHead className="w-[200px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">中文标题</TableHead>
              <TableHead className="w-[200px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">英文标题</TableHead>
              <TableHead className="w-[120px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">分类</TableHead>
              <TableHead className="w-[100px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((guide) => (
              <TableRow key={guide.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/50">
                <TableCell className="py-3 text-center text-2xs text-muted-foreground font-medium">{guide.id}</TableCell>
                <TableCell className="py-3 text-center text-2xs text-foreground truncate">{guide.titleZh}</TableCell>
                <TableCell className="py-3 text-center text-2xs text-muted-foreground truncate">{guide.title}</TableCell>
                <TableCell className="py-3 text-center text-2xs text-muted-foreground">{guide.categoryName}</TableCell>
                <TableCell className="py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(guide)} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"><Edit className="size-4" /></button>
                    <button onClick={() => handleDelete(guide)} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm font-semibold text-primary">Found {filtered.length} guides</p>
          <div className="flex items-center gap-2">
            <span className="text-2xs text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button size="icon" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)} className="size-8 rounded-lg">‹</Button>
            <Button size="icon" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="size-8 rounded-lg">›</Button>
          </div>
        </div>
      </div>

      {/* Guide create/edit dialog */}
      <Dialog open={showModal} onOpenChange={(v) => { if (!v) setShowModal(false); }}>
        <DialogContent className="max-w-2xl bg-card !max-w-[650px]">
          <DialogHeader><DialogTitle>{editing ? "编辑指南" : "新增指南"}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">ID</Label>
              <Input value={form.id} onChange={(e) => { guideIdEdited.current = true; setForm({ ...form, id: e.target.value }); }} disabled={!!editing} className="h-9 rounded-lg" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">分类</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v || "" })}>
                <SelectTrigger className="h-9 w-full rounded-lg"><SelectValue placeholder="请选择" /></SelectTrigger>
                <SelectContent className="z-[130] max-h-[200px]">{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameZh}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium text-foreground/80">英文标题</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-9 rounded-lg" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium text-foreground/80">中文标题</Label>
                <Input value={form.titleZh} onChange={(e) => setForm({ ...form, titleZh: e.target.value })} className="h-9 rounded-lg" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">英文正文</Label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="min-h-[120px] w-full rounded-lg border border-border p-3 text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">中文正文</Label>
              <textarea value={form.contentZh} onChange={(e) => setForm({ ...form, contentZh: e.target.value })} className="min-h-[120px] w-full rounded-lg border border-border p-3 text-sm outline-none focus:border-primary" />
            </div>
            {error && <p className="text-2xs font-medium text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-lg text-2xs">取消</Button>
            <Button onClick={handleSave} className="rounded-lg bg-primary hover:bg-primary/80">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category management dialog */}
      <Dialog open={showCatModal} onOpenChange={(v) => { if (!v) setShowCatModal(false); }}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader><DialogTitle>管理分类</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-2 max-h-[200px] overflow-auto">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-2xs"><span className="font-medium">{cat.nameZh}</span> <span className="text-muted-foreground">({cat.name})</span></span>
                  <Button onClick={() => handleDeleteCategory(cat)} variant="ghost" size="sm" className="h-7 text-destructive hover:bg-destructive/10">删除</Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={catForm.id} onChange={(e) => { catIdEdited.current = true; setCatForm({ ...catForm, id: e.target.value }); }} placeholder="auto" className="h-9 w-20 rounded-lg text-center" />
              <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="英文名" className="h-9 flex-1 rounded-lg" />
              <Input value={catForm.nameZh} onChange={(e) => setCatForm({ ...catForm, nameZh: e.target.value })} placeholder="中文名" className="h-9 flex-1 rounded-lg" />
            </div>
            <Button onClick={handleSaveCategory} className="rounded-lg bg-primary hover:bg-primary/80">添加分类</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCatModal(false)} className="rounded-lg">关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

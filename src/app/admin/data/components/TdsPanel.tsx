"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Guide, GuideCategory, DocType } from "@/types";
import { slugify } from "@/lib/id-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
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
import MarkdownPreview from "@/components/MarkdownPreview";
import { Edit, Trash2, Plus, X, Upload, Eye, EyeOff } from "lucide-react";

interface GuideRow extends Guide { categoryName: string; }

// 空表单默认值
const EMPTY_FORM = {
  id: "",
  categoryId: "",
  productSku: "",
  version: "v1.0",
  docType: "tds" as DocType,
  title: "",
  titleZh: "",
  summary: "",
  summaryZh: "",
  coverImage: "",
  content: "",
  contentZh: "",
  isPublished: true,
};

export default function TdsPanel() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [categories, setCategories] = useState<GuideCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("");
  const [filterDocType, setFilterDocType] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editing, setEditing] = useState<Guide | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState("");
  const [catForm, setCatForm] = useState({ id: "", name: "", nameZh: "" });
  const [page, setPage] = useState(0);
  const [previewLang, setPreviewLang] = useState<"en" | "zh">("zh");
  const [uploading, setUploading] = useState(false);
  const ROWS_PER_PAGE = 10;
  const guideIdEdited = useRef(false);
  const catIdEdited = useRef(false);

  const fetchGuides = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/tds");
      if (r.ok) setGuides(await r.json());
    } catch {}
    setLoading(false);
  }, []);
  const fetchCategories = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/tds-categories");
      if (r.ok) setCategories(await r.json());
    } catch {}
  }, []);
  useEffect(() => {
    fetchGuides();
    fetchCategories();
  }, [fetchGuides, fetchCategories]);

  // 标题自动生成 ID
  useEffect(() => {
    if (!editing && !guideIdEdited.current && form.title) {
      setForm((prev) => ({ ...prev, id: slugify(form.title) }));
    }
  }, [form.title, editing]);
  useEffect(() => {
    if (!catIdEdited.current && catForm.name) {
      setCatForm((prev) => ({ ...prev, id: slugify(catForm.name) }));
    }
  }, [catForm.name]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id || "" });
    setError("");
    guideIdEdited.current = false;
    setShowModal(true);
  }

  function openEdit(g: Guide) {
    setEditing(g);
    setForm({
      id: g.id,
      categoryId: g.categoryId,
      productSku: g.productSku ?? "",
      version: g.version,
      docType: g.docType,
      title: g.title,
      titleZh: g.titleZh,
      summary: g.summary ?? "",
      summaryZh: g.summaryZh ?? "",
      coverImage: g.coverImage ?? "",
      content: g.content,
      contentZh: g.contentZh,
      isPublished: g.isPublished,
    });
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    setError("");
    if (!form.id || !form.categoryId || !form.title || !form.titleZh) {
      setError("必填字段不能为空");
      return;
    }
    try {
      const m = editing ? "PUT" : "POST";
      const r = await fetch("/api/admin/tds", {
        method: m,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sortOrder: 0 }),
      });
      if (r.ok) {
        setShowModal(false);
        fetchGuides();
      } else {
        const d = await r.json();
        setError(d.error || "保存失败");
      }
    } catch {
      setError("网络错误，请重试");
    }
  }

  async function handleDelete(g: Guide) {
    if (!confirm(`确定删除文档「${g.titleZh}」吗？`)) return;
    try {
      const res = await fetch("/api/admin/tds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: g.id }),
      });
      if (res.ok) fetchGuides();
      else {
        const d = await res.json();
        alert(d.error || "删除失败");
      }
    } catch {
      alert("网络错误，请重试");
    }
  }

  async function handleSaveCategory() {
    if (!catForm.id || !catForm.name || !catForm.nameZh) return;
    try {
      const res = await fetch("/api/admin/tds-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...catForm, sortOrder: 0 }),
      });
      if (res.ok) {
        setCatForm({ id: "", name: "", nameZh: "" });
        catIdEdited.current = false;
        fetchCategories();
      } else {
        const d = await res.json();
        alert(d.error || "保存失败");
      }
    } catch {
      alert("网络错误，请重试");
    }
  }

  async function handleDeleteCategory(cat: GuideCategory) {
    if (!confirm(`确定删除「${cat.nameZh}」吗？该分类下的文档不会被删除。`)) return;
    try {
      const res = await fetch("/api/admin/tds-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id }),
      });
      if (res.ok) {
        fetchCategories();
        fetchGuides();
      } else {
        const d = await res.json();
        alert(d.error || "删除失败");
      }
    } catch {
      alert("网络错误，请重试");
    }
  }

  async function handleUploadCover(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/admin/tds-upload", { method: "POST", body: fd });
      if (r.ok) {
        const d = await r.json();
        setForm((prev) => ({ ...prev, coverImage: d.url }));
      } else {
        const d = await r.json();
        alert(d.error || "上传失败");
      }
    } catch {
      alert("网络错误，请重试");
    } finally {
      setUploading(false);
    }
  }

  const catMap = new Map(categories.map((c) => [c.id, c.nameZh]));
  const filtered: GuideRow[] = guides
    .filter((g) => (filterCat ? g.categoryId === filterCat : true))
    .filter((g) => (filterDocType ? g.docType === filterDocType : true))
    .map((g) => ({ ...g, categoryName: catMap.get(g.categoryId) ?? g.categoryId }));

  useEffect(() => {
    setPage(0);
  }, [guides, filterCat, filterDocType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageRows = filtered.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      {/* 顶部工具栏 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={filterCat} onValueChange={(v) => setFilterCat(v || "")}>
          <SelectTrigger className="h-9 min-w-[140px] rounded-lg text-sm">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent className="z-[130] max-h-[200px]">
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nameZh}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDocType} onValueChange={(v) => setFilterDocType(v || "")}>
          <SelectTrigger className="h-9 min-w-[120px] rounded-lg text-sm">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent className="z-[130]">
            <SelectItem value="tds">TDS</SelectItem>
            <SelectItem value="msds">MSDS</SelectItem>
            <SelectItem value="sds">SDS</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCatModal(true)} variant="outline-primary" className="rounded-lg text-sm">
          管理分类
        </Button>
        <Button onClick={openCreate} variant="outline-primary" className="rounded-lg text-sm">
          <Plus className="size-4" /> 新增文档
        </Button>
      </div>

      {/* 列表 — 移动端表格舒展到自然列宽，容器内横向滑动；桌面端 md:min-w-0 保持 w-full 原样 */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table className="min-w-max md:min-w-0">
          <TableHeader>
            <TableRow className="bg-muted/80">
              <TableHead className="w-[100px] py-2.5 text-center text-xs font-semibold uppercase text-muted-foreground">
                类型
              </TableHead>
              <TableHead className="w-[180px] py-2.5 text-center text-xs font-semibold uppercase text-muted-foreground">
                中文标题
              </TableHead>
              <TableHead className="py-2.5 text-center text-xs font-semibold uppercase text-muted-foreground">
                英文标题
              </TableHead>
              <TableHead className="w-[110px] py-2.5 text-center text-xs font-semibold uppercase text-muted-foreground">
                分类
              </TableHead>
              <TableHead className="w-[80px] py-2.5 text-center text-xs font-semibold uppercase text-muted-foreground">
                版本
              </TableHead>
              <TableHead className="w-[80px] py-2.5 text-center text-xs font-semibold uppercase text-muted-foreground">
                状态
              </TableHead>
              <TableHead className="w-[100px] py-2.5 text-center text-xs font-semibold uppercase text-muted-foreground">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((guide) => (
              <TableRow key={guide.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/50">
                <TableCell className="py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  {guide.docType}
                </TableCell>
                <TableCell className="py-3 text-center text-sm font-medium text-foreground truncate">
                  {guide.titleZh}
                </TableCell>
                <TableCell className="py-3 text-center text-sm text-muted-foreground truncate">
                  {guide.title}
                </TableCell>
                <TableCell className="py-3 text-center text-sm text-muted-foreground">
                  {guide.categoryName}
                </TableCell>
                <TableCell className="py-3 text-center text-sm text-muted-foreground">
                  {guide.version}
                </TableCell>
                <TableCell className="py-3 text-center">
                  {guide.isPublished ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                      <Eye className="size-3" /> 已发布
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      <EyeOff className="size-3" /> 草稿
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(guide)}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    >
                      <Edit className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(guide)}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm font-semibold text-primary">Found {filtered.length} documents</p>
          <div className="flex items-center gap-2">
            <span className="text-2xs text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              size="icon"
              variant="ghost"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="size-8 rounded-lg"
            >
              ‹
            </Button>
            <Button
              size="icon"
              variant="ghost"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="size-8 rounded-lg"
            >
              ›
            </Button>
          </div>
        </div>
      </div>

      {/* 新增/编辑文档对话框 */}
      <Dialog open={showModal} onOpenChange={(v) => { if (!v) setShowModal(false); }}>
        <DialogContent className="!max-w-[1400px] flex flex-col gap-0 bg-card max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-1 flex-col gap-0 overflow-hidden">
            <DialogHeader className="border-b border-border px-6 py-3">
              <DialogTitle>{editing ? "编辑文档" : "新增文档"}</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* 基本元数据 */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">ID</Label>
              <Input
                value={form.id}
                onChange={(e) => {
                  guideIdEdited.current = true;
                  setForm({ ...form, id: e.target.value });
                }}
                disabled={!!editing}
                className="h-9 rounded-lg"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">分类</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v || "" })}>
                <SelectTrigger className="h-9 w-full rounded-lg">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent className="z-[130] max-h-[200px]">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nameZh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">文档类型</Label>
              <Select value={form.docType} onValueChange={(v) => setForm({ ...form, docType: v as DocType })}>
                <SelectTrigger className="h-9 w-full rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[130]">
                  <SelectItem value="tds">TDS</SelectItem>
                  <SelectItem value="msds">MSDS</SelectItem>
                  <SelectItem value="sds">SDS</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">产品 SKU（可选）</Label>
              <Input
                value={form.productSku}
                onChange={(e) => setForm({ ...form, productSku: e.target.value })}
                className="h-9 rounded-lg"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">版本号</Label>
              <Input
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                className="h-9 rounded-lg"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">发布状态</Label>
              <Select value={form.isPublished ? "true" : "false"} onValueChange={(v) => setForm({ ...form, isPublished: v === "true" })}>
                <SelectTrigger className="h-9 w-full rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[130]">
                  <SelectItem value="true">已发布</SelectItem>
                  <SelectItem value="false">草稿</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">英文标题</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-9 rounded-lg"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">中文标题</Label>
              <Input
                value={form.titleZh}
                onChange={(e) => setForm({ ...form, titleZh: e.target.value })}
                className="h-9 rounded-lg"
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label className="text-sm font-medium text-foreground/80">封面图</Label>
              <div className="flex items-center gap-3">
                {form.coverImage ? (
                  <img
                    src={form.coverImage}
                    alt="封面"
                    className="size-16 rounded-md border border-border object-cover"
                  />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                    无
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1.5">
                  <Input
                    value={form.coverImage}
                    onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                    placeholder="https://... 或下方上传"
                    className="h-9 rounded-lg"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted">
                    <Upload className="size-3" />
                    {uploading ? "上传中..." : "上传图片到 Supabase Storage"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadCover(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">英文摘要</Label>
              <Input
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                className="h-9 rounded-lg"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">中文摘要</Label>
              <Input
                value={form.summaryZh}
                onChange={(e) => setForm({ ...form, summaryZh: e.target.value })}
                className="h-9 rounded-lg"
              />
            </div>
          </div>

          {/* Markdown 双栏预览 */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground/80">Markdown 正文</Label>
              <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewLang("zh")}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${previewLang === "zh" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  中文预览
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLang("en")}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${previewLang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  English Preview
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <textarea
                value={previewLang === "zh" ? form.contentZh : form.content}
                onChange={(e) =>
                  setForm({ ...form, [previewLang === "zh" ? "contentZh" : "content"]: e.target.value })
                }
                className="min-h-[360px] w-full rounded-lg border border-border bg-background p-3 font-mono text-sm outline-none focus:border-primary"
                placeholder={previewLang === "zh" ? "## 产品概述\n\n请输入中文 Markdown..." : "## Product Overview\n\nEnter English Markdown..."}
              />
              <div className="min-h-[360px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-4">
                <MarkdownPreview source={previewLang === "zh" ? form.contentZh : form.content} />
              </div>
            </div>
          </div>

          {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}
          </div>

          <DialogFooter className="border-t border-border bg-muted/30 px-6 py-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-lg text-sm">
              取消
            </Button>
            <Button onClick={handleSave} className="rounded-lg bg-primary hover:bg-primary/80">
              保存
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* 分类管理对话框 */}
      <Dialog open={showCatModal} onOpenChange={(v) => { if (!v) setShowCatModal(false); }}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle>管理分类</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex max-h-[200px] flex-col gap-2 overflow-auto">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-sm">
                    <span className="font-medium">{cat.nameZh}</span>{" "}
                    <span className="text-muted-foreground">({cat.name})</span>
                  </span>
                  <Button
                    onClick={() => handleDeleteCategory(cat)}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-destructive hover:bg-destructive/10"
                  >
                    删除
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={catForm.id}
                onChange={(e) => {
                  catIdEdited.current = true;
                  setCatForm({ ...catForm, id: e.target.value });
                }}
                placeholder="auto"
                className="h-9 w-20 rounded-lg text-center"
              />
              <Input
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                placeholder="英文名"
                className="h-9 flex-1 rounded-lg"
              />
              <Input
                value={catForm.nameZh}
                onChange={(e) => setCatForm({ ...catForm, nameZh: e.target.value })}
                placeholder="中文名"
                className="h-9 flex-1 rounded-lg"
              />
            </div>
            <Button onClick={handleSaveCategory} className="rounded-lg bg-primary hover:bg-primary/80">
              添加分类
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCatModal(false)} className="rounded-lg">
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import type { Toner, TonerCategory } from "@/types";
import { useAuth } from "@/components/AuthContext";
import { useLang } from "@/components/LanguageContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Edit, Trash2, Settings, Plus, ChevronUp, Eye } from "lucide-react";

// 色母分类标签
const TONER_CATEGORIES: { key: TonerCategory; label: string }[] = [
  { key: "2K_BASECOAT", label: "2K Basecoat" },
  { key: "1K_BASECOAT", label: "1K Basecoat" },
  { key: "1K_SILVER_BASECOAT", label: "1K Silver Basecoat" },
  { key: "1K_PEARL_BASECOAT", label: "1K Pearl Basecoat" },
  { key: "SUPPLEMENTARY", label: "Additives" },
];

// All 选项（查看全部色母，按类别分组展示）
const ALL_CATEGORY = "ALL";

// 段标题样式：分类名居中，外框药丸圆角浅灰边框（与首页搜索结果段标题一致）
function SectionTitle({ label, id }: { label: string; id: string }) {
  return (
    <div className="mt-8 flex items-center justify-start px-4 py-2">
      <h2 id={id} className="rounded-full border-[0.5px] border-[#a8a8a8] px-4 py-1.5 font-heading text-[27px] font-normal tracking-wide text-ink">
        {label}
      </h2>
    </div>
  );
}

// ==================== 工具函数 ====================

/** 判断颜色是否过浅（白色/接近白色），需要特殊处理边框 */
function isLightColor(hex: string): boolean {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return false;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 220;
}

/** RGB 对象 → 十六进制颜色字符串 */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/** 十六进制颜色字符串 → RGB 对象 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

/** 生成唯一色母代码（基于分类前缀 + 自增序号） */
function generateTonerCode(category: TonerCategory, existingCodes: string[]): string {
  const prefixMap: Record<TonerCategory, string> = {
    "2K_BASECOAT": "2K-",
    "1K_BASECOAT": "1K-",
    "1K_SILVER_BASECOAT": "1K-",
    "1K_PEARL_BASECOAT": "1K-",
    "SUPPLEMENTARY": "SUP-",
  };
  const prefix = prefixMap[category];
  let maxNum = 0;
  for (const code of existingCodes) {
    if (code.startsWith(prefix)) {
      const suffix = code.slice(prefix.length);
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
}

// ==================== 色母卡片组件（首页搜索配方卡片风格） ====================

function TonerCard({ code, tradeName, hex }: { code: string; tradeName: string; hex: string }) {
  return (
    <div className="animate-card-row mb-[70px] w-[87.5%]">
      {/* 色块：正方形，悬停轻微放大（与首页配色卡片一致） */}
      <div className="relative aspect-square w-full cursor-pointer overflow-hidden transition-all duration-300 ease-in-out hover:scale-[1.15] hover:z-10 transform-gpu [backface-visibility:hidden]">
        {/* 颜色底色 + 金属漆渐变光泽 */}
        <div
          className="absolute inset-0"
          style={
            hex
              ? {
                  backgroundColor: hex,
                  backgroundImage:
                    "linear-gradient(135deg, rgba(0,0,0,0.21) 0%, rgba(0,0,0,0.11) 8%, rgba(0,0,0,0.03) 18%, rgba(255,255,255,0.08) 28%, rgba(255,255,255,0.28) 38%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.28) 62%, rgba(255,255,255,0.08) 72%, rgba(0,0,0,0.03) 82%, rgba(0,0,0,0.11) 92%, rgba(0,0,0,0.21) 100%)",
                }
              : { backgroundColor: "#d1d5db" }
          }
        />
      </div>

      {/* 卡片下方信息块：左对齐常显，产品代码 / 英文名 */}
      <div className="mt-[45px] text-left font-[family-name:var(--font-sans)]">
        <p className="truncate text-[20px] font-normal leading-tight text-foreground">
          {code}
        </p>
        <p className="mt-2 truncate text-[16px] font-normal leading-tight text-muted-foreground">
          {tradeName}
        </p>
      </div>
    </div>
  );
}

// ==================== 色母分组段落组件（首页搜索配方品牌段风格） ====================
// 折叠时只渲染前 4 张真实卡片，第 5 格留给「查看更多」；展开后显示全部 + 「收起」

const TONER_CARDS_PER_ROW = 5; // 每行卡片数（与网格 grid-cols-5 对应）
const TONER_VISIBLE_WHEN_COLLAPSED = 4; // 折叠时显示的真实卡片数，第 5 格留给「查看更多」

function TonerSection({
  label,
  toners,
}: {
  label: string;
  toners: Toner[];
}) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const prevExpandedRef = useRef(false);
  const needsMore = toners.length > TONER_VISIBLE_WHEN_COLLAPSED;
  // 折叠时只渲染前 N 张 + 占位；展开时渲染全部
  const visibleToners = needsMore && !expanded ? toners.slice(0, TONER_VISIBLE_WHEN_COLLAPSED) : toners;

  // 收起后内容变短，浏览器滚动位置会漂移到别的分类；平滑滚回本分类标题处
  useEffect(() => {
    if (prevExpandedRef.current && !expanded && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    prevExpandedRef.current = expanded;
  }, [expanded]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby={`toner-category-${label}`}
      className="mb-0 scroll-mt-[175px]"
    >
      {/* 车漆流动动画：内联 <style> 避免 Turbopack 漏掉 globals.css 中的 @keyframes（与首页 SearchResults 同款） */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes paint-flow {
          0%   { background-position: 0% 50%; }
          25%  { background-position: 70% 30%; }
          50%  { background-position: 100% 70%; }
          75%  { background-position: 40% 90%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes paint-blob-drift {
          0%   { transform: translate(0, 0) scale(1) rotate(0deg); }
          20%  { transform: translate(14%, -12%) scale(1.2) rotate(20deg); }
          45%  { transform: translate(-12%, 8%) scale(0.85) rotate(-25deg); }
          70%  { transform: translate(8%, 16%) scale(1.15) rotate(15deg); }
          100% { transform: translate(0, 0) scale(1) rotate(0deg); }
        }
        .paint-flow {
          background:
            radial-gradient(ellipse 90% 70% at 20% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 60%),
            radial-gradient(ellipse 70% 60% at 80% 75%, rgba(50, 180, 192, 0.45) 0%, transparent 65%),
            linear-gradient(115deg, #2587c9 0%, #32b4c0 33%, #e471fd 66%, #2587c9 100%);
          background-size: 260% 260%;
          animation: paint-flow 5s ease-in-out infinite;
        }
        .paint-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(28px);
          pointer-events: none;
          animation: paint-blob-drift 4s ease-in-out infinite;
        }
      ` }} />
      <SectionTitle label={label} id={`toner-category-${label}`} />
      {/* 段内网格：折叠时一行，展开时可多行；--card-delay 从 0 重置交错入场动画 */}
      <div
        className="grid grid-cols-5 justify-items-center gap-x-0 gap-y-0 px-0 pb-4 mt-10"
        style={{ ["--card-delay" as string]: "0s" }}
      >
        {visibleToners.map((toner) => (
          <TonerCard key={toner.code} code={toner.code} tradeName={toner.tradeName} hex={toner.hex} />
        ))}

        {/* 折叠且还有更多时：第 5 格显示「查看更多」占位卡片（车漆流动效果） */}
        {needsMore && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="group relative aspect-square w-[87.5%] mb-[70px] cursor-pointer overflow-hidden transition-all duration-300 ease-in-out transform-gpu [backface-visibility:hidden]"
            aria-label={`${t.viewMore} ${label}`}
          >
            <div className="paint-flow absolute inset-0" />
            <div className="paint-blob left-[10%] top-[15%] h-[45%] w-[45%]" style={{ animationDelay: "0s", backgroundColor: "rgba(255,255,255,0.4)" }} />
            <div className="paint-blob right-[5%] bottom-[10%] h-[55%] w-[55%]" style={{ animationDelay: "-2s", backgroundColor: "rgba(228,113,253,0.45)" }} />
            <div className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <Eye className="size-7 drop-shadow transition-transform duration-300 group-hover:scale-110" strokeWidth={1.75} />
              <span className="text-[19px] font-normal drop-shadow transition-transform duration-300 group-hover:scale-105">
                {t.viewMore}
              </span>
            </div>
          </button>
        )}

        {/* 展开状态：末尾显示「收起」占位卡片（车漆流动效果） */}
        {needsMore && expanded && (
          <button
            onClick={() => setExpanded(false)}
            className="group relative aspect-square w-[87.5%] mb-[70px] cursor-pointer overflow-hidden transition-all duration-300 ease-in-out transform-gpu [backface-visibility:hidden]"
            aria-label={`${t.collapse} ${label}`}
          >
            <div className="paint-flow absolute inset-0" />
            <div className="paint-blob left-[10%] top-[15%] h-[45%] w-[45%]" style={{ animationDelay: "-1s", backgroundColor: "rgba(255,255,255,0.4)" }} />
            <div className="paint-blob right-[5%] bottom-[10%] h-[55%] w-[55%]" style={{ animationDelay: "-3s", backgroundColor: "rgba(228,113,253,0.45)" }} />
            <div className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <ChevronUp className="size-7 drop-shadow transition-transform duration-300 group-hover:scale-110" strokeWidth={1.75} />
              <span className="text-[19px] font-normal drop-shadow transition-transform duration-300 group-hover:scale-105">
                {t.collapse}
              </span>
            </div>
          </button>
        )}
      </div>
    </section>
  );
}

// ==================== 添加色母对话框 ====================

const ADD_FORM_INITIAL = {
  category: "" as TonerCategory | "",
  code: "",
  tradeName: "",
  nameZh: "",
  hex: "#808080",
};

function AddMaterialDialog({
  open,
  onClose,
  onSave,
  existingCodes,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (toner: Toner) => void;
  existingCodes: string[];
}) {
  const [form, setForm] = useState(ADD_FORM_INITIAL);
  const [error, setError] = useState("");

  // 每次打开时重置表单 + 自动生成代码
  useEffect(() => {
    if (!open) return;
    setForm({ ...ADD_FORM_INITIAL });
    setError("");
  }, [open]);

  // 分类变更时自动生成代码
  useEffect(() => {
    if (!open || !form.category) return;
    const newCode = generateTonerCode(form.category, existingCodes);
    setForm((prev) => ({ ...prev, code: newCode }));
  }, [form.category, open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    setError("");
    if (!form.category) { setError("请选择所属分类"); return; }
    if (!form.code.trim()) { setError("产品代码不能为空"); return; }
    if (!form.tradeName.trim()) { setError("英文名称不能为空"); return; }
    if (!form.nameZh.trim()) { setError("中文名称不能为空"); return; }

    const { r, g, b } = hexToRgb(form.hex);
    const newToner: Toner = {
      code: form.code.trim(),
      tradeName: form.tradeName.trim(),
      nameZh: form.nameZh.trim(),
      category: form.category as TonerCategory,
      hex: form.hex,
      rgb_r: r,
      rgb_g: g,
      rgb_b: b,
    };

    onSave(newToner);
    onClose();
  }

  return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="max-w-sm bg-card z-[1500] shadow-xl ring-1 ring-foreground/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              添加色母
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* 所属分类 */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground/80">所属分类</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: (v as TonerCategory) || "" })}
            >
              <SelectTrigger className="h-9 w-full rounded-lg">
                <SelectValue placeholder="请选择分类" />
              </SelectTrigger>
               <SelectContent className="z-[1600] max-h-[200px]">
                {TONER_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 产品代码（自动生成，可手动修改） */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground/80">产品代码</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="h-9 rounded-lg"
            />
            <p className="text-[11px] text-muted-foreground">选择分类后自动生成，也可手动修改</p>
          </div>

          {/* 英文名称 */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground/80">英文名称</Label>
            <Input
              value={form.tradeName}
              onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
              className="h-9 rounded-lg"
              placeholder="例如 Titanium White"
            />
          </div>

          {/* 中文名称 */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground/80">中文名称</Label>
            <Input
              value={form.nameZh}
              onChange={(e) => setForm({ ...form, nameZh: e.target.value })}
              className="h-9 rounded-lg"
              placeholder="例如 纯白"
            />
          </div>

          {/* 极简 HEX 拾色器 */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground/80">预览色</Label>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              {/* 色块 — 点击打开原生拾色器 */}
              <div className="relative flex-shrink-0">
                <div
                  className="size-10 cursor-pointer rounded-md border-2 border-input transition-shadow hover:shadow-[0_0_0_4px_rgba(36,135,202,0.15)]"
                  style={{ backgroundColor: form.hex || "#808080" }}
                />
                <input
                  type="color"
                  value={form.hex}
                  onChange={(e) => setForm({ ...form, hex: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </div>
              {/* HEX 文本输入框 */}
              <Input
                value={form.hex}
                onChange={(e) => {
                  let raw = e.target.value;
                  if (!raw.startsWith("#")) raw = "#" + raw;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(raw)) {
                    setForm({ ...form, hex: raw.length === 7 ? raw.toUpperCase() : raw });
                  }
                }}
                className="h-9 flex-1 rounded-lg font-mono"
                maxLength={7}
              />
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-2xs font-medium text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-[6px]">取消</Button>
          <Button onClick={handleSave} className="rounded-[6px] bg-primary hover:bg-primary/80">保存提交</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 管理材料对话框 ====================

interface ManagementRow {
  original: Toner;
  displayCategory: string;
}

function ManagementModal({
  open,
  onClose,
  items,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
}: {
  open: boolean;
  onClose: () => void;
  items: Toner[];
  onUpdateItem: (toner: Toner) => void;
  onDeleteItem: (code: string) => void;
  onAddItem: (toner: Toner) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<Toner | null>(null);
  const [editForm, setEditForm] = useState({ tradeName: "", nameZh: "", category: "" as TonerCategory | "", hex: "#FFFFFF" });
  const [editError, setEditError] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  // 重置搜索/编辑状态
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setEditingItem(null);
      setEditError("");
    }
  }, [open]);

  const categoryLabel = useCallback((key: string) => {
    const cat = TONER_CATEGORIES.find((c) => c.key === key);
    return cat ? cat.label : key;
  }, []);

  const filteredRows: ManagementRow[] = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return items
      .filter((toner) => {
        if (!q) return true;
        return (
          toner.code.toLowerCase().includes(q) ||
          toner.tradeName.toLowerCase().includes(q) ||
          toner.nameZh.includes(q) ||
          categoryLabel(toner.category).toLowerCase().includes(q)
        );
      })
      .map((toner) => ({
        original: toner,
        displayCategory: categoryLabel(toner.category),
      }));
  }, [items, searchQuery, categoryLabel]);

  function openEdit(item: Toner) {
    setEditingItem(item);
    setEditForm({
      tradeName: item.tradeName,
      nameZh: item.nameZh,
      category: item.category,
      hex: item.hex,
    });
    setEditError("");
  }

  async function handleEditSave() {
    setEditError("");
    if (!editForm.tradeName || !editForm.nameZh || !editForm.category) {
      setEditError("所有字段不能为空");
      return;
    }
    const { r, g, b } = hexToRgb(editForm.hex);
    const updated: Toner = {
      code: editingItem!.code,
      tradeName: editForm.tradeName,
      nameZh: editForm.nameZh,
      category: editForm.category as TonerCategory,
      hex: editForm.hex,
      rgb_r: r,
      rgb_g: g,
      rgb_b: b,
    };
    try {
      await onUpdateItem(updated);
    } catch {
      setEditError("保存失败，请重试");
      return;
    }
    setEditingItem(null);
  }

  function handleDelete(item: Toner) {
    if (!confirm(`确定删除「${item.nameZh}（${item.code}）」吗？`)) return;
    onDeleteItem(item.code);
  }

  const existingCodes = useMemo(() => items.map((t) => t.code), [items]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl w-full p-6 rounded-2xl bg-card dark:bg-zinc-900 !max-w-[850px] max-h-[85vh] flex flex-col overflow-hidden">

            {/* 二级弹窗展开时的轻度蒙版 */}
            {(addOpen || editingItem) && (
              <div className="absolute inset-0 z-[1400] rounded-2xl bg-black/20 pointer-events-none" />
            )}
          {/* 固定置顶 Header */}
          <div className="shrink-0 px-6 pt-3 mb-3">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2 font-heading text-lg font-semibold text-foreground">
                <Settings className="size-5 text-foreground/70" />
                色母管理中心
              </DialogTitle>
            </DialogHeader>

          {/* 搜索 + 添加按钮 */}
          <div className="flex flex-col items-start justify-between gap-2 pt-5 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索色母代码、名称、分类..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-lg border-input pl-9 text-2xs focus-visible:ring-1 focus-visible:ring-border"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                共 {filteredRows.length} 条记录
              </span>
              <Button
                  variant="default"
                  onClick={() => setAddOpen(true)}
                    className="inline-flex items-center justify-center h-8 rounded-[6px] text-2xs leading-none text-white"
                >
                  添加色母
              </Button>
            </div>
          </div>
        </div>

        {/* 可滚动表格区域 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="w-full overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-2xs">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr className="border-b-2 border-border">
                  <th className="w-12 px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">颜色</th>
                  <th className="w-28 px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">产品代码</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">英文名称</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">中文名称</th>
                  <th className="w-32 px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">所属分类</th>
                  <th className="w-20 px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.original.code}
                    className="border-b border-border/50 last:border-b-0 hover:bg-muted/80"
                  >
                    <td className="px-3 py-3 text-center">
                      <div
                        className="mx-auto h-5 w-9 border border-border"
                        style={{ backgroundColor: row.original.hex }}
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-2xs font-semibold text-foreground">{row.original.code}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="block truncate text-2xs text-foreground/80">{row.original.tradeName}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="block truncate text-2xs text-foreground/80">{row.original.nameZh}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs text-muted-foreground">{row.displayCategory}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(row.original)}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          aria-label="编辑"
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(row.original)}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label="删除"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-sm text-muted-foreground">暂无匹配数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </DialogContent>

      {/* ===== 编辑子弹窗（独立 Dialog，Portal 到 body） ===== */}
        <Dialog open={!!editingItem} onOpenChange={(v) => { if (!v) setEditingItem(null); }}>
          <DialogContent className="max-w-sm bg-card z-[1500] shadow-xl ring-1 ring-foreground/10">
          <DialogHeader>
            <DialogTitle>编辑色母 — {editingItem?.code}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">色母代码</Label>
              <p className="text-sm font-semibold text-foreground">{editingItem?.code}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">英文商品名</Label>
              <Input
                value={editForm.tradeName}
                onChange={(e) => setEditForm({ ...editForm, tradeName: e.target.value })}
                className="h-9 rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">中文品名</Label>
              <Input
                value={editForm.nameZh}
                onChange={(e) => setEditForm({ ...editForm, nameZh: e.target.value })}
                className="h-9 rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">所属分类</Label>
              <Select
                value={editForm.category}
                onValueChange={(v) => setEditForm({ ...editForm, category: (v as TonerCategory) || "" })}
              >
                <SelectTrigger className="h-9 w-full rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                 <SelectContent className="z-[1600] max-h-[200px]">
                  {TONER_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">预览色 HEX</Label>
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="relative flex-shrink-0">
                  <div
                    className="size-10 cursor-pointer rounded-md border-2 border-input"
                    style={{ backgroundColor: editForm.hex }}
                  />
                  <input
                    type="color"
                    value={editForm.hex}
                    onChange={(e) => setEditForm({ ...editForm, hex: e.target.value })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </div>
                <Input
                  value={editForm.hex}
                  onChange={(e) => {
                    let raw = e.target.value;
                    if (!raw.startsWith("#")) raw = "#" + raw;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(raw)) {
                      setEditForm({ ...editForm, hex: raw.length === 7 ? raw.toUpperCase() : raw });
                    }
                  }}
                  className="h-9 flex-1 rounded-lg font-mono"
                  maxLength={7}
                />
              </div>
            </div>

            {editError && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-2xs font-medium text-destructive">{editError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)} className="rounded-lg">取消</Button>
            <Button onClick={handleEditSave} className="rounded-lg bg-primary hover:bg-primary/80">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 新增材料子弹窗（独立 Dialog，Portal 到 body） ===== */}
      <AddMaterialDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={onAddItem}
        existingCodes={existingCodes}
      />
    </Dialog>
  );
}

// ==================== 主页面 ====================

export default function TonerPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeCategory, setActiveCategory] = useState<TonerCategory | typeof ALL_CATEGORY>("2K_BASECOAT");
  const [searchQuery, setSearchQuery] = useState("");
  const [manageOpen, setManageOpen] = useState(false);

  // ★ 从 API 加载色母数据（Supabase 持久化）
  const [toners, setToners] = useState<Toner[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  const fetchToners = useCallback(async () => {
    try {
      const endpoint = isAdmin ? "/api/admin/toners" : "/api/toners";
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setToners(data as Toner[]);
      }
    } catch {
      // 网络异常时保持现有数据
    } finally {
      setDbLoading(false);
    }
  }, [isAdmin]);

  // 挂载时 + isAdmin 变化时重新获取
  useEffect(() => {
    fetchToners();
  }, [fetchToners]);

  const filteredToners = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return toners.filter((toner) => {
      if (activeCategory !== ALL_CATEGORY && toner.category !== activeCategory) return false;
      if (!q) return true;
      return toner.code.toLowerCase().includes(q) || toner.tradeName.toLowerCase().includes(q) || toner.nameZh.includes(q);
    });
  }, [toners, activeCategory, searchQuery]);

  // All 视图下：按分类分组，保持 TONER_CATEGORIES 顺序；非 All 视图下：平铺卡片
  const categorySections = useMemo(() => {
    if (activeCategory !== ALL_CATEGORY) return [];
    return TONER_CATEGORIES
      .filter((cat) => cat.key !== "SUPPLEMENTARY" || isAdmin)
      .map((cat) => ({
        label: cat.label,
        toners: filteredToners.filter((t) => t.category === cat.key),
      }))
      .filter((s) => s.toners.length > 0);
  }, [activeCategory, filteredToners, isAdmin]);

  // 管理弹窗回调 — 调用 Supabase API
  const handleUpdateItem = useCallback(async (updated: Toner) => {
    const res = await fetch("/api/admin/toners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      const saved = await res.json();
      setToners((prev) => prev.map((t) => t.code === updated.code ? saved as Toner : t));
    } else {
      const d = await res.json();
      throw new Error(d.error || "更新失败");
    }
  }, []);

  const handleDeleteItem = useCallback(async (code: string) => {
    try {
      const res = await fetch("/api/admin/toners", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        setToners((prev) => prev.filter((t) => t.code !== code));
      } else {
        const d = await res.json();
        alert(d.error || "删除失败");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[handleDeleteItem]", msg);
      alert("网络错误，请重试：" + msg);
    }
  }, []);

  const handleAddItem = useCallback(async (newToner: Toner) => {
    try {
      const res = await fetch("/api/admin/toners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newToner),
      });
      if (res.ok) {
        const saved = await res.json();
        setToners((prev) => [...prev, saved as Toner]);
      } else {
        const d = await res.json();
        alert(d.error || "新增失败");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[handleAddItem]", msg);
      alert("网络错误，请重试：" + msg);
    }
  }, []);

  const activeTab = activeCategory === ALL_CATEGORY ? ALL_CATEGORY : TONER_CATEGORIES.find((c) => c.key === activeCategory)?.key || "2K_BASECOAT";

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
      <SiteHeader />

      {/* 顶部占位 */}
        <div className="h-[84px]" />

      {/* 分类 Tabs + 搜索栏 */}
      <div className="sticky top-[79px] z-30 border-b border-border bg-card px-6 py-5 sm:px-8 md:px-[60px]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* 左侧：分类 Tabs */}
          <div className="-mx-2 overflow-x-auto px-2 scrollbar-hide sm:-mx-0 sm:px-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveCategory((v as TonerCategory | typeof ALL_CATEGORY) || "2K_BASECOAT")}>
              <TabsList variant="default" className="group-data-horizontal/tabs:h-fit h-auto gap-1 rounded-none bg-transparent p-0">
                {/* All：查看全部，按分类分组展示 */}
                <TabsTrigger
                  value={ALL_CATEGORY}
                  className="h-9 gap-1.5 rounded-full px-4 text-sm data-active:bg-muted"
                >
                  All
                  <Badge variant="secondary" className="h-5 min-w-5 rounded-full bg-muted px-1.5 text-[11px] leading-none text-muted-foreground">
                    {toners.length}
                  </Badge>
                </TabsTrigger>
                {TONER_CATEGORIES.filter((cat) => cat.key !== "SUPPLEMENTARY" || isAdmin).map((cat) => (
                  <TabsTrigger
                    key={cat.key}
                    value={cat.key}
                    className="h-9 gap-1.5 rounded-full px-4 text-sm data-active:bg-muted"
                  >
                    {cat.label}
                    <Badge variant="secondary" className="h-5 min-w-5 rounded-full bg-muted px-1.5 text-[11px] leading-none text-muted-foreground">
                      {toners.filter((t) => t.category === cat.key).length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* 右侧：搜索框 + 管理按钮 */}
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code or name..."
                className="h-10 rounded-lg pl-9 text-sm"
              />
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManageOpen(true)}
                className="inline-flex items-center justify-center h-9 shrink-0 rounded-lg gap-1.5 text-sm leading-none"
              >
                <Settings className="size-4" />
                管理色母
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 色母卡片网格 */}
      <div className="flex-1 px-6 py-4 sm:px-8 md:px-[60px] md:py-6">
        {dbLoading ? (
          <div className="flex flex-col items-center py-20 text-muted-foreground">
            <Spinner className="size-6" />
          </div>
        ) : filteredToners.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-muted-foreground">
            <span className="text-sm">No toners found</span>
            <span className="mt-1 text-xs">Try a different search or category</span>
          </div>
        ) : activeCategory === ALL_CATEGORY ? (
          /* All 视图：按分类分组展示，每段一行卡片 + 「查看更多」折叠 */
          <div>
            {categorySections.map((section) => (
              <TonerSection key={section.label} label={section.label} toners={section.toners} />
            ))}
          </div>
        ) : (
          /* 单分类视图：平铺网格 */
          <div
            className="grid grid-cols-5 justify-items-center gap-x-0 gap-y-0 px-0 pb-4 mt-10"
            style={{ ["--card-delay" as string]: "0s" }}
          >
            {filteredToners.map((toner) => (
              <TonerCard key={toner.code} code={toner.code} tradeName={toner.tradeName} hex={toner.hex} />
            ))}
          </div>
        )}
      </div>

      <Footer />

      {/* 管理材料 Dialog */}
      <ManagementModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        items={toners}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onAddItem={handleAddItem}
      />
    </div>
  );
}

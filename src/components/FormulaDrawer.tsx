"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { SearchResult, Formula, FormulaComponent, ComponentGroup, YearEntry } from "@/types";
import { colorSwatchStyle } from "@/lib/utils";
import { getColorPhotoCandidates } from "@/lib/color-photo";
import { formatYearEntry } from "@/lib/db-formula";
import { useLang } from "@/components/LanguageContext";
import { useFavorites } from "@/components/FavoritesContext";
import { track } from "@/lib/analytics";
import KapciFormulaTable from "./KapciFormulaTable";
import Toast from "./Toast";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableCell, TableRow } from "@/components/ui/table";
import { X, Printer, Copy, Heart } from "lucide-react";

interface FormulaDrawerProps {
  result: SearchResult | null;
  onClose: () => void;
  initialFormulaIdx?: number;
  formulaId?: string;
  initialYear?: YearEntry;
}

function formatComponents(components: FormulaComponent[]): string[] {
  const lines: string[] = ["Toner Code  |  Toner Name       |    %  |  g/100g", "-".repeat(50)];
  for (const c of components) {
    lines.push(`${c.toner_code.padEnd(12)}|  ${c.toner_name.padEnd(17)}|  ${String(c.percentage).padStart(4)}% |  ${String(c.grams_per_100g).padStart(6)}g`);
  }
  return lines;
}

function formatFormulaAsText(result: SearchResult, activeFormula: Formula, makeName: string): string {
  const lines: string[] = [];
  lines.push("=".repeat(50));
  lines.push(`HIWE Formula - ${result.color.color_name}`);
  lines.push(`Color Code: ${result.color.color_code}`);
  lines.push(`Make: ${makeName}`);
  lines.push(`Type: ${result.color.color_type.join(", ")}`);
  lines.push(`Process: ${activeFormula.formula_type}`);
  lines.push(`Paint System: ${activeFormula.paint_system}`);
  lines.push(`Version: ${activeFormula.version}`);
  lines.push("-".repeat(50));

  if (activeFormula.formula_type === "Three Stages") {
    lines.push("[Pearl Paint]");
    lines.push(...formatComponents(activeFormula.components.filter((c) => c.component_group === "Pearl Paint")));
    lines.push("");
    lines.push("[Ground Paint]");
    lines.push(...formatComponents(activeFormula.components.filter((c) => c.component_group === "Ground Paint")));
  } else {
    lines.push(...formatComponents(activeFormula.components));
  }
  lines.push("-".repeat(50));
  if (activeFormula.notes) lines.push(`Notes: ${activeFormula.notes}`);
  lines.push(`Updated: ${activeFormula.updated_at}`);
  lines.push("=".repeat(50));
  return lines.join("\n");
}

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function parseHexInput(raw: string, fallback: string): string {
  const t = raw.trim();
  if (!HEX_RE.test(t)) return fallback;
  return t.startsWith("#") ? t : `#${t}`;
}

export default function FormulaDrawer({ result, onClose, initialFormulaIdx, formulaId, initialYear }: FormulaDrawerProps) {
  const { t } = useLang();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [activeFormulaIdx, setActiveFormulaIdx] = useState(0);
  const [brands, setBrands] = useState<{ id: string; name: string; region: string }[]>([]);
  const [hexInput, setHexInput] = useState("");
  const [activeGroup, setActiveGroup] = useState<ComponentGroup>("Pearl Paint");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // 颜色照片加载失败时回退纯色块（与首页卡片同一套逻辑）
  const [photoFailed, setPhotoFailed] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    fetch("/api/brands").then((r) => r.ok ? r.json() : []).then((d) => setBrands(d)).catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (result) {
      if (formulaId) {
        const idx = result.formulas.findIndex((f) => f.id === formulaId);
        setActiveFormulaIdx(idx >= 0 ? idx : 0);
      } else {
        setActiveFormulaIdx(initialFormulaIdx ?? 0);
      }
      setHexInput(result.color.hex_preview);
      setActiveGroup("Pearl Paint");
      setPhotoFailed(false);
      setPhotoIdx(0);

      // 配方查看事件（打开抽屉即记一次；附带品牌/色号/颜色名）
      const make = brands.find((m) => m.id === result.color.make_id)?.name ?? result.color.make_id;
      void track("formula_view", {
        make,
        code: result.color.color_code,
        name: result.color.color_name,
        formula_id: formulaId ?? result.formulas[0]?.id,
        version: result.formulas[0]?.version,
      });
    }
    // 依赖 brands：品牌名解析需要已加载；brands 变化仅在首次挂载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, initialFormulaIdx, formulaId]);

  const handleClose = useCallback(() => { onClose(); }, [onClose]);

  // 打印结束清理：监听器在组件挂载时注册，确保 Chrome 中 afterprint 无论同步/异步派发都能收到
  // （若在 window.print() 之后才注册，遇到同步派发的浏览器会错过事件导致 printing-formula 残留）
  useEffect(() => {
    function removePrintingMark() {
      document.documentElement.classList.remove("printing-formula");
    }
    window.addEventListener("afterprint", removePrintingMark);
    return () => window.removeEventListener("afterprint", removePrintingMark);
  }, []);

  function handlePrint() {
    // 打印前标记：CSS 只打印抽屉内容，隐藏首页其余部分（打印按钮的 beforeprint 在 window.print 前触发）
    document.documentElement.classList.add("printing-formula");
    window.print();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") handleClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  if (!result) return null;

  const { color, formulas } = result;
  const make = brands.find((m) => m.id === color.make_id)?.name ?? color.make_id;
  const origin = brands.find((m) => m.id === color.make_id)?.region ?? "-";
  const activeFormula = formulas[activeFormulaIdx];
  const previewColor = parseHexInput(hexInput, color.hex_preview);
  // 颜色照片路径：差异化行优先 {color_id}.jpg，否则回退 {code}.jpg（去掉 "/" 后大写）
  const photoCandidates = getColorPhotoCandidates(color);
  const photoSrc = photoCandidates[Math.min(photoIdx, photoCandidates.length - 1)] ?? null;

  let displayedFormula: Formula | null = activeFormula ?? null;
  const isGroupedType = activeFormula?.formula_type === "Three Stages";
  if (activeFormula && isGroupedType) {
    displayedFormula = {
      ...activeFormula,
      components: activeFormula.components.filter((c) => c.component_group === activeGroup),
    };
  }

  function handleCopy() {
    if (!activeFormula) return;
    navigator.clipboard.writeText(formatFormulaAsText(result!, activeFormula, make)).then(
      () => setToastMsg(t.copySuccess),
      () => setToastMsg(t.copyFail),
    );
  }

  // 收藏 / 取消收藏当前配方
  async function handleToggleFavorite() {
    if (!activeFormula) return;
    const snapshot = {
      formula_id: activeFormula.id,
      color_code: color.color_code,
      color_name: color.color_name,
      make_name: make,
      formula_type: activeFormula.formula_type,
      paint_system: activeFormula.paint_system,
      version: activeFormula.version,
    };
    try {
      await toggleFavorite(snapshot);
      setToastMsg(isFavorite(activeFormula.id) ? t.favoriteRemoved : t.favoriteAdded);
    } catch {
      setToastMsg(t.favoriteFail);
    }
  }

  const currentYear = initialYear ? formatYearEntry(initialYear) : "-";

  return (
    <>
      <Sheet open onOpenChange={(v) => { if (!v) handleClose(); }}>
        <SheetContent side="right" className="formula-print-area formula-drawer p-0 gap-0 bg-card z-[2000] md:!fixed md:!inset-0 md:!w-screen md:!max-w-none md:!h-screen md:!translate-x-0 md:!rounded-none md:!overflow-y-auto md:!z-[2000]">
          {/* Header Bar: 品牌/颜色代码/名称/元数据 + 操作按钮
              桌面端：Logo+标题+操作按钮单行，左内边距与配方栏 px-[60px] 对齐；
              移动端：改两行——第一行 Logo(隐藏)+标题+关闭，第二行操作按钮 */}
          <div className="sticky top-0 z-10 border-b border-border bg-card px-6 py-3 md:px-[60px] md:py-5">
            {/* 第一行：品牌 Logo（仅桌面）+ 标题 + 关闭 */}
            <div className="flex items-center gap-3 sm:gap-4">
              <img
                src="/hiwemix2-01.png"
                alt="HIWE"
                className="hidden md:block h-[26px] w-auto object-contain"
              />
              {/* 标题：品牌 车型 | 配方代码 | 颜色名称
                  移动端单行强制截断（nowrap+ellipsis），避免长车型名把 header 撑高 */}
              <div className="min-w-0 flex-1">
                <h2
                  className="text-[15px] font-extrabold leading-tight text-foreground sm:text-[20px] font-[family-name:var(--font-sans)]"
                  style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  <span className="font-normal text-primary dark:text-white">{make}</span>
                  {color.car_model && (
                    <>
                      <span className="font-normal text-primary dark:text-white"> {color.car_model}</span>
                    </>
                  )}
                  <span className="mx-2 text-muted-foreground/40" aria-hidden="true">|</span>
                  <span className="font-semibold">{color.color_code}</span>
                  <span className="mx-2 text-muted-foreground/40" aria-hidden="true">|</span>
                  <span className="font-semibold">{color.color_name}</span>
                </h2>
              </div>

              {/* 桌面端操作按钮：行内圆形图标按钮（Favorite/打印/复制），整体左移 10px */}
              <div className="hidden md:flex relative left-[-10px] items-center gap-2.5 flex-shrink-0">
                <Button
                  onClick={handleToggleFavorite}
                  variant="outline"
                  size="icon"
                  className={`size-[38px] bg-transparent border-muted-foreground/30 rounded-full ${
                    isFavorite(activeFormula?.id ?? "") ? "border-muted-foreground/30 bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={isFavorite(activeFormula?.id ?? "")}
                  aria-label={isFavorite(activeFormula?.id ?? "") ? t.favorited : t.favorite}
                >
                  <Heart className={`size-[18px] ${isFavorite(activeFormula?.id ?? "") ? "fill-current" : ""}`} />
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  size="icon"
                  className="size-[38px] rounded-full bg-transparent border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                  aria-label={t.print}
                >
                  <Printer className="size-[18px]" />
                </Button>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="icon"
                  className="size-[38px] rounded-full bg-transparent border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                  aria-label={t.copy}
                >
                  <Copy className="size-[18px]" />
                </Button>
              </div>

              {/* 关闭按钮：保持最右，不随按钮组左移 */}
              <Button onClick={handleClose} variant="ghost" size="icon-sm" className="ml-1 flex-shrink-0 size-[36px]">
                <X className="size-[24px] md:size-[26px]" />
              </Button>
            </div>

            {/* 移动端操作按钮：第二行（Favorite/打印/复制） */}
            <div className="mt-3 flex items-center gap-2.5 md:hidden">
              <Button
                onClick={handleToggleFavorite}
                variant="outline"
                size="icon"
                className={`size-[38px] bg-transparent border-muted-foreground/30 rounded-full ${
                  isFavorite(activeFormula?.id ?? "") ? "border-muted-foreground/30 bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={isFavorite(activeFormula?.id ?? "")}
                aria-label={isFavorite(activeFormula?.id ?? "") ? t.favorited : t.favorite}
              >
                <Heart className={`size-[18px] ${isFavorite(activeFormula?.id ?? "") ? "fill-current" : ""}`} />
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="icon"
                className="size-[38px] rounded-full bg-transparent border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                aria-label={t.print}
              >
                <Printer className="size-[18px]" />
              </Button>
              <Button
                onClick={handleCopy}
                variant="outline"
                size="icon"
                className="size-[38px] rounded-full bg-transparent border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                aria-label={t.copy}
              >
                <Copy className="size-[18px]" />
              </Button>
            </div>
          </div>

          {/* Body: 两栏布局 */}
          <div className="flex flex-col md:flex-row flex-1">
            {/* 左侧：配方详情 (~62.5%) */}
            <div className="flex-1 overflow-auto border-b border-border px-[60px] pt-[30px] pb-[60px] md:flex-[62.5%] md:border-b-0 md:border-r">
              {activeFormula && displayedFormula && (
                <div>
                  <KapciFormulaTable
                    key={`${activeFormula.id}-${activeGroup}`}
                    formula={displayedFormula}
                    activeGroup={activeGroup}
                    onGroupChange={setActiveGroup}
                    showGroupToggle={true}
                  />

                  {activeFormula.notes && (
                    <div className="mt-4 rounded-xl border border-amber-200/60 bg-amber-50/30 p-3 dark:border-amber-400/25 dark:bg-amber-400/10">
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{t.notesLabel}</span>
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-200/90">{activeFormula.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 右侧：颜色预览+信息 (~37.5%) */}
            <div className="flex-shrink-0 overflow-auto md:flex-[37.5%]">
              {/* 颜色预览：正方形，照片优先，加载失败回退纯色块（与首页卡片一致） */}
              <div className="px-[60px] py-[30px]">
                <div className="relative aspect-square w-full overflow-hidden rounded-[35px] border border-border/60">
                  {!photoFailed && photoSrc ? (
                    <Image
                      src={photoSrc}
                      alt={`${color.color_code} ${color.color_name}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 37vw"
                      className="absolute inset-0 object-cover"
                      onError={() => {
                        // 差异化行优先专属图，加载失败时逐级回退到 {code}.jpg，再失败才退纯色块
                        if (photoIdx < photoCandidates.length - 1) {
                          setPhotoIdx((i) => i + 1);
                        } else {
                          setPhotoFailed(true);
                        }
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0" style={colorSwatchStyle(previewColor)} />
                  )}
                </div>
              </div>

              <Separator />

              {/* Color Information（标题 + 斑马纹表格） */}
              <div className="px-[60px] pt-[30px] pb-[60px]">
                <h3 className="mb-4 text-center font-heading text-xl font-bold leading-tight text-foreground sm:text-2xl">{t.tabColorInfo}</h3>
                <div className="overflow-x-auto rounded-lg border border-border text-sm">
                  <Table className="w-full">
                    <tbody>
                      <TableRow className="bg-muted/50">
                        <TableCell className="w-32 px-[30px] py-2.5 align-middle font-medium text-foreground/70">{t.manufacturerLabel}</TableCell>
                        <TableCell className="px-[30px] py-2.5 align-middle">{make}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="w-32 px-[30px] py-2.5 align-middle font-medium text-foreground/70">{t.originLabel}</TableCell>
                        <TableCell className="px-[30px] py-2.5 align-middle">{origin}</TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/50">
                        <TableCell className="w-32 px-[30px] py-2.5 align-middle font-medium text-foreground/70">{t.codeLabel}</TableCell>
                        <TableCell className="px-[30px] py-2.5 align-middle">{color.color_code}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="w-32 px-[30px] py-2.5 align-middle font-medium text-foreground/70">{t.colorName}</TableCell>
                        <TableCell className="px-[30px] py-2.5 align-middle">{color.color_name}</TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/50">
                        <TableCell className="w-32 px-[30px] py-2.5 align-middle font-medium text-foreground/70">{t.carModelLabel}</TableCell>
                        <TableCell className="px-[30px] py-2.5 align-middle">{color.car_model || "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="w-32 px-[30px] py-2.5 align-middle font-medium text-foreground/70">{t.yearsLabel}</TableCell>
                        <TableCell className="px-[30px] py-2.5 align-middle">{currentYear}</TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/50">
                        <TableCell className="w-32 px-[30px] py-2.5 align-middle font-medium text-foreground/70">{t.processLabel}</TableCell>
                        <TableCell className="px-[30px] py-2.5 align-middle">{activeFormula?.formula_type || "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="w-32 px-[30px] py-2.5 align-middle font-medium text-foreground/70">{t.versionLabel}</TableCell>
                        <TableCell className="px-[30px] py-2.5 align-middle">{activeFormula?.version || "-"}</TableCell>
                      </TableRow>
                    </tbody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </>
  );
}

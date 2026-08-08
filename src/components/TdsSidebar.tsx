"use client";

import { useState } from "react";
import { useLang } from "@/components/LanguageContext";
import { pickText } from "@/lib/i18n";
import type { DocType, Guide, GuideCategory } from "@/types";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Menu, ChevronDown } from "lucide-react";

export interface TdsSidebarProps {
  categories: GuideCategory[];
  guides: Guide[];
  selectedCategory: string;
  selectedDocType: "" | DocType;
  onSelectCategory: (id: string) => void;
  onSelectDocType: (t: "" | DocType, shouldClose: boolean) => void;
}

// 文档类型 i18n 键 → 类型值的映射
const DOC_TYPE_OPTIONS: { value: "" | DocType; i18nKey: "tdsDocTypeAll" | "tdsDocTypeTds" | "tdsDocTypeMsds" | "tdsDocTypeSds" | "tdsDocTypeManual" }[] = [
  { value: "", i18nKey: "tdsDocTypeAll" },
  { value: "tds", i18nKey: "tdsDocTypeTds" },
  { value: "msds", i18nKey: "tdsDocTypeMsds" },
  { value: "sds", i18nKey: "tdsDocTypeSds" },
  { value: "manual", i18nKey: "tdsDocTypeManual" },
];

// 分组标题：边框圆角矩形 badge（宽度与下方按钮框统一：-mx-3，拓宽 30%）
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-3 mb-6 flex w-full items-center rounded-md border border-foreground/40 bg-background px-[13px] py-[5px] text-2xs font-semibold text-ink lg:text-[15px] lg:w-[130%] max-md:hidden">
      {children}
    </div>
  );
}

// 共享的侧边栏内容（桌面端、移动端 Sheet 共用）
// 单一 Documents 区块：文档类型选项列表；选中 TDS 时在其下方展开分类
function SidebarContent({
  categories,
  guides,
  selectedCategory,
  selectedDocType,
  onSelectCategory,
  onSelectDocType,
  isMobile,
  tdsExpandedMobile,
  onToggleTdsExpandedMobile,
}: {
  categories: GuideCategory[];
  guides: Guide[];
  selectedCategory: string;
  selectedDocType: "" | DocType;
  onSelectCategory: (id: string) => void;
  onSelectDocType: (t: "" | DocType, shouldClose: boolean) => void;
  // 移动端专属：是否使用本地折叠状态（桌面端忽略）
  isMobile?: boolean;
  tdsExpandedMobile?: boolean;
  onToggleTdsExpandedMobile?: () => void;
}) {
  const { t, lang } = useLang();

  // 计算每个类别下的文档数
  const countsByCategory = new Map<string, number>();
  // 计算每个 docType 下的文档数（用于决定按钮右侧是否显示折叠箭头）
  const countsByDocType = new Map<string, number>();
  for (const g of guides) {
    countsByCategory.set(g.categoryId, (countsByCategory.get(g.categoryId) ?? 0) + 1);
    countsByDocType.set(g.docType, (countsByDocType.get(g.docType) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>{t.tdsListLabel}</SectionLabel>
        <div className="flex flex-col gap-0.5">
          {DOC_TYPE_OPTIONS.map((opt) => {
            const isActive = selectedDocType === opt.value;
            // 移动端：TDS 行的展开状态与 selectedDocType 解耦 — 折叠仅影响 UI，不改变数据态
            const isTdsExpanded = opt.value === "tds"
              && (isMobile ? tdsExpandedMobile : isActive);
            return (
              <div key={opt.value || "all"} className="tds-doctype-item flex flex-col [&:not(:first-child)]:mt-[9px] lg:[&:not(:first-child)]:mt-0">
                <button
                  onClick={() => {
                    // 移动端 TDS 折叠/展开：仅切换本地折叠态，不动数据态
                    if (isMobile && opt.value === "tds") {
                      // 首次点 TDS（数据层尚未选中） → 选中 + 展开
                      // 再次点 TDS（已选中） → 仅切换折叠态
                      if (!isActive) {
                        onSelectDocType("tds", false);
                      }
                      onToggleTdsExpandedMobile?.();
                      return;
                    }
                    // 桌面端或非 TDS 类型：保持原逻辑（点折叠 = 回到 All）
                    const next = opt.value === "tds" && isActive ? "" : opt.value;
                    const shouldClose = opt.value === "";
                    onSelectDocType(next, shouldClose);
                  }}
                  className={cn(
                    "tds-doctype-btn flex w-full items-center rounded-md px-[13px] py-[5px] text-left text-[16px] transition-colors -mx-3 lg:w-[130%] lg:text-[15px]",
                    isActive
                      ? "bg-border font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground/80"
                  )}
                >
                  <span className="flex-1">{t[opt.i18nKey]}</span>
                  {/* 仅当该 doc type 下有文件时，显示可折叠箭头 */}
                  {(countsByDocType.get(opt.value) ?? 0) > 0 && (
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 transition-transform",
                        opt.value === "tds" && isTdsExpanded && "rotate-180"
                      )}
                    />
                  )}
                </button>

                {/* TDS 选中时：下方展开该文档类型下的分类列表；上方 10px，下方 20px */}
                {isTdsExpanded && (
                  <div className="-mx-3 mt-2.5 mb-5 flex w-full flex-col gap-0.5 lg:w-[130%]">
                    {categories.map((cat) => {
                      const catActive = selectedCategory === cat.id;
                      const count = countsByCategory.get(cat.id) ?? 0;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => onSelectCategory(catActive ? "" : cat.id)}
                          className={cn(
                            "flex w-[80%] items-center justify-between gap-2 rounded-md py-[5px] px-[13px] text-left text-2xs transition-colors lg:text-[15px]",
                            catActive
                              ? "border border-foreground/30 bg-card font-semibold text-foreground"
                              : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground/80"
                          )}
                        >
                          <span className="flex-1 truncate">
                            {pickText(lang, cat.name, cat.nameZh)}
                          </span>
                          {count > 0 && (
                            <Badge
                              variant="secondary"
                              className="h-5 min-w-5 rounded-full bg-muted px-1.5 text-[11px] leading-none text-muted-foreground mr-[20%]"
                            >
                              {count}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TdsSidebar({
  categories,
  guides,
  selectedCategory,
  selectedDocType,
  onSelectCategory,
  onSelectDocType,
}: TdsSidebarProps) {
  const { t } = useLang();
  // mobile Sheet 开关
  const [open, setOpen] = useState(false);
  // 移动端：TDS 行本地折叠状态（与 selectedDocType 解耦，关闭抽屉不重置）
  const [tdsExpandedMobile, setTdsExpandedMobile] = useState(true);

  function handleSelectCategory(id: string) {
    onSelectCategory(id);
    // 移动端 Sheet：选中后自动关闭抽屉
    setOpen(false);
  }

  function handleSelectDocType(dt: "" | DocType, shouldClose: boolean) {
    onSelectDocType(dt, shouldClose);
    // 移动端 Sheet：仅当调用方指定时才关闭抽屉
    // - All：选择完毕立即关闭
    // - 其他类型（首次选中）：保持打开，等用户继续选分类
    // - TDS 折叠（已激活时再点 TDS）：保持打开，让用户选其他类型
    if (shouldClose) {
      setOpen(false);
    }
  }

  return (
    <>
      {/* 桌面端：始终可见的侧边栏 */}
      <aside className="hidden border-r border-border bg-card px-6 pt-8 pb-6 sm:px-8 md:px-[60px] lg:block lg:w-[300px] lg:flex-shrink-0 lg:overflow-y-auto lg:h-[calc(100vh-84px)] lg:sticky lg:top-[84px]">
        <SidebarContent
          categories={categories}
          guides={guides}
          selectedCategory={selectedCategory}
          selectedDocType={selectedDocType}
          onSelectCategory={handleSelectCategory}
          onSelectDocType={handleSelectDocType}
        />
      </aside>

      {/* 移动端：Header 下方独立一栏放触发按钮 + Sheet 抽屉 */}
      <div className="lg:hidden">
        <div className="tds-categories-bar flex items-center gap-2 border-b border-border bg-background px-4 py-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  aria-label="Open categories"
                  className="tds-categories-btn inline-flex size-9 items-center justify-center rounded-lg text-foreground"
                >
                  <Menu className="size-6" />
                </button>
              }
            />
            <SheetContent
              side="left"
              showCloseButton
              className="w-[min(80vw,320px)] gap-0 p-0"
            >
              <SheetTitle className="sr-only">{t.tdsCategories}</SheetTitle>
              <div className="overflow-y-auto px-6 pb-6 max-md:pt-[88px] md:pt-14">
                <SidebarContent
                  categories={categories}
                  guides={guides}
                  selectedCategory={selectedCategory}
                  selectedDocType={selectedDocType}
                  onSelectCategory={handleSelectCategory}
                  onSelectDocType={handleSelectDocType}
                  isMobile
                  tdsExpandedMobile={tdsExpandedMobile}
                  onToggleTdsExpandedMobile={() => setTdsExpandedMobile((v) => !v)}
                />
              </div>
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold text-foreground">
            {t.tdsCategories}
          </span>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { useLang } from "@/components/LanguageContext";
import type { DocType, Guide, GuideCategory } from "@/types";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";

export interface TdsSidebarProps {
  categories: GuideCategory[];
  guides: Guide[];
  selectedCategory: string;
  selectedDocType: "" | DocType;
  onSelectCategory: (id: string) => void;
  onSelectDocType: (t: "" | DocType) => void;
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
    <div className="-mx-3 mb-6 flex w-full items-center rounded-md border border-foreground/40 bg-background px-[13px] py-[5px] text-2xs font-semibold text-ink lg:text-[15px] lg:w-[130%]">
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
}: {
  categories: GuideCategory[];
  guides: Guide[];
  selectedCategory: string;
  selectedDocType: "" | DocType;
  onSelectCategory: (id: string) => void;
  onSelectDocType: (t: "" | DocType) => void;
}) {
  const { t, lang } = useLang();

  // 计算每个类别下的文档数
  const countsByCategory = new Map<string, number>();
  for (const g of guides) {
    countsByCategory.set(g.categoryId, (countsByCategory.get(g.categoryId) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>{t.tdsListLabel}</SectionLabel>
        <div className="flex flex-col gap-0.5">
          {DOC_TYPE_OPTIONS.map((opt) => {
            const isActive = selectedDocType === opt.value;
            const isTdsExpanded = opt.value === "tds" && isActive;
            return (
              <div key={opt.value || "all"} className="flex flex-col">
                <button
                  onClick={() =>
                    onSelectDocType(opt.value === "tds" && isActive ? "" : opt.value)
                  }
                  className={cn(
                    "flex w-full items-center rounded-md px-[13px] py-[5px] text-left text-2xs transition-colors -mx-3 lg:w-[130%] lg:text-[15px]",
                    isActive
                      ? "bg-border font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground/80"
                  )}
                >
                  <span className="flex-1">{t[opt.i18nKey]}</span>
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
                            {lang === "zh" ? cat.nameZh : cat.name}
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

  function handleSelectCategory(id: string) {
    onSelectCategory(id);
    // 移动端 Sheet：选中后自动关闭抽屉
    setOpen(false);
  }

  function handleSelectDocType(dt: "" | DocType) {
    onSelectDocType(dt);
    setOpen(false);
  }

  return (
    <>
      {/* 桌面端：始终可见的侧边栏 */}
      <aside className="hidden border-r border-border bg-card px-6 pt-8 pb-6 md:px-[60px] lg:block lg:w-[300px] lg:flex-shrink-0 lg:overflow-y-auto lg:h-[calc(100vh-84px)] lg:sticky lg:top-[84px]">
        <SidebarContent
          categories={categories}
          guides={guides}
          selectedCategory={selectedCategory}
          selectedDocType={selectedDocType}
          onSelectCategory={handleSelectCategory}
          onSelectDocType={handleSelectDocType}
        />
      </aside>

      {/* 移动端：浮动按钮 + Sheet 抽屉 */}
      <div className="fixed left-4 top-[88px] z-30 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg bg-card px-3 text-xs shadow-[var(--shadow-level-1)]"
              >
                <PanelLeft className="size-3.5" />
                {t.tdsCategories}
              </Button>
            }
          />
          <SheetContent
            side="left"
            showCloseButton
            className="w-[min(80vw,320px)] gap-0 p-0"
          >
            <SheetTitle className="sr-only">{t.tdsCategories}</SheetTitle>
            <div className="overflow-y-auto px-6 pt-14 pb-6">
              <SidebarContent
                categories={categories}
                guides={guides}
                selectedCategory={selectedCategory}
                selectedDocType={selectedDocType}
                onSelectCategory={handleSelectCategory}
                onSelectDocType={handleSelectDocType}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { useAuth } from "@/components/AuthContext";
import BrandsPanel from "./components/BrandsPanel";
import ColorsPanel from "./components/ColorsPanel";
import VariantsPanel from "./components/VariantsPanel";
import FormulasPanel from "./components/FormulasPanel";
import GuidesPanel from "./components/TdsPanel";
import AnalyticsPanel from "./components/AnalyticsPanel";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Menu, Tag, Droplet, Layers, Beaker, FileText, BarChart3 } from "lucide-react";

const TABS = [
  { key: "brands", label: "品牌", icon: Tag },
  { key: "colors", label: "颜色", icon: Droplet },
  { key: "variants", label: "配方类型", icon: Layers },
  { key: "formulas", label: "配方", icon: Beaker },
  { key: "tds", label: "文档", icon: FileText },
  { key: "analytics", label: "数据分析", icon: BarChart3 },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function SideNav({ activeTab, onSelect, onClose }: { activeTab: TabKey; onSelect: (k: TabKey) => void; onClose?: () => void }) {
  return (
    <nav>
      <div className="flex flex-col gap-0.5 py-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { onSelect(tab.key); onClose?.(); }}
              className={`relative flex items-center gap-3 rounded-none w-full pl-[60px] pr-4 py-2.5 text-left text-sm transition-colors ${
                active
                  ? "bg-blue-50/80 font-semibold text-primary dark:bg-primary dark:text-primary-foreground"
                  : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground/80"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-3/5 w-[3px] -translate-y-1/2 rounded-none bg-primary" />
              )}
              <Icon className="size-4 flex-shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function DataManagementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("brands");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => { setMobileNavOpen(false); }, [activeTab]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <SiteHeader />

      {/* 移动端：Header 下方独立一栏放汉堡菜单按钮（样式对齐 TDS 面板） */}
      {/* pt-[84px] 避开固定定位的 Header（79px 高），与 tds/layout 的间距一致，否则栏会被 Header 盖住 */}
      <div className="pt-[84px] md:hidden">
        <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-3">
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            className="inline-flex size-9 items-center justify-center rounded-lg text-foreground"
          >
            <Menu className="size-6" />
          </button>
          <span className="text-sm font-semibold text-foreground">数据管理</span>
        </div>
      </div>

      <div className="flex pt-0 md:pt-[84px]">
        {/* 桌面端侧边栏 */}
        <aside className="hidden md:block w-[224px] flex-shrink-0 border-r border-border bg-card h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
          <SideNav activeTab={activeTab} onSelect={setActiveTab} />
        </aside>

        {/* 移动端 Sheet 侧边栏 */}
        {/* z-50（默认）低于固定 Header 的 z-1100，Header 始终保持在最顶层可见；pt-[136px] 向下让出 Header(79px)+汉堡栏(约57px) */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[224px] p-0 pt-[136px]">
            <SideNav activeTab={activeTab} onSelect={setActiveTab} onClose={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* 右侧主区 — min-w-0：允许 flex 子项收缩到视口宽，表格才能在自己的容器内横向滚动（否则 min-w-max 的表格会把 main 撑宽被外层 clip 裁剪） */}
        <main className="min-w-0 flex-1 min-h-[calc(100vh-64px)] px-6 py-6 sm:px-8 md:px-[60px]">
          {activeTab === "brands" && <BrandsPanel />}
          {activeTab === "colors" && <ColorsPanel />}
          {activeTab === "variants" && <VariantsPanel />}
          {activeTab === "formulas" && <FormulasPanel />}
          {activeTab === "tds" && <GuidesPanel />}
          {activeTab === "analytics" && <AnalyticsPanel />}
        </main>
      </div>
    </div>
  );
}

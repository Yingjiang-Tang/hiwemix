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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Menu, Tag, Droplet, Layers, Beaker, FileText } from "lucide-react";

const TABS = [
  { key: "brands", label: "品牌", icon: Tag },
  { key: "colors", label: "颜色", icon: Droplet },
  { key: "variants", label: "配方类型", icon: Layers },
  { key: "formulas", label: "配方", icon: Beaker },
  { key: "tds", label: "文档", icon: FileText },
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

      {/* 移动端浮动按钮 */}
      <button
        onClick={() => setMobileNavOpen((v) => !v)}
        aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
        className="fixed right-4 top-20 z-[1250] inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card shadow-sm md:hidden"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex pt-[84px]">
        {/* 桌面端侧边栏 */}
        <aside className="hidden md:block w-[224px] flex-shrink-0 border-r border-border bg-card h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
          <SideNav activeTab={activeTab} onSelect={setActiveTab} />
        </aside>

        {/* 移动端 Sheet 侧边栏 */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[224px] p-0 pt-12">
            <SideNav activeTab={activeTab} onSelect={setActiveTab} onClose={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* 右侧主区 */}
        <main className="flex-1 min-h-[calc(100vh-64px)] px-6 py-6 sm:px-8 md:px-[60px]">
          {activeTab === "brands" && <BrandsPanel />}
          {activeTab === "colors" && <ColorsPanel />}
          {activeTab === "variants" && <VariantsPanel />}
          {activeTab === "formulas" && <FormulasPanel />}
          {activeTab === "tds" && <GuidesPanel />}
        </main>
      </div>
    </div>
  );
}

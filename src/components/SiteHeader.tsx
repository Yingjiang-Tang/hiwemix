"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/components/AuthContext";
import { useLang } from "@/components/LanguageContext";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";

interface SiteHeaderProps {
  useHomeTheme?: boolean;
}

export default function SiteHeader({ useHomeTheme }: SiteHeaderProps) {
  const { user: authUser, logout } = useAuth();
  const { t } = useLang();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const prevPathRef = useRef<string | null>(null);

  const isHome = pathname === "/";
  const showHomeTheme = useHomeTheme ?? isHome;
  const [isCrossHomeNav, setIsCrossHomeNav] = useState(false);

  // 记录路径是否发生「首页 ↔ 内页」跳转，用于驱动过渡动画
  useEffect(() => {
    const prev = prevPathRef.current;
    const prevIsHome = prev === "/";
    const isCross = prev !== null && prevIsHome !== isHome;
    prevPathRef.current = pathname;
    setIsCrossHomeNav(isCross);
  }, [pathname, isHome]);

  const transitionStyle = isCrossHomeNav
    ? "all 1.5s ease-in-out"
    : "none";

  const navItems: { label: string; href: string }[] = [
    { label: t.navFormulaSearch, href: "/" },
    { label: t.navColorLibrary, href: "/color-library" },
    { label: t.navFavorites, href: "/favorites" },
    { label: t.navTds, href: "/tds" },
  ];

  const isActive = (href: string) =>
    (href === "/" && pathname === "/") ||
    (href !== "/" && pathname?.startsWith(href));

  return (
    <>
      <header
        data-header-theme={showHomeTheme ? "home" : "default"}
        className="top-0 left-0 z-[1100] w-full border-b transition-all duration-[1.5s] ease-in-out"
        style={{
          position: "var(--header-position)" as React.CSSProperties["position"],
          backgroundColor: "var(--header-bg)",
          borderBottomColor: "var(--header-bottom-border)",
          borderBottomWidth: "1px",
          borderBottomStyle: "solid",
          transition: transitionStyle,
        }}
      >
        <div className="relative mx-auto flex h-[79px] items-center justify-between px-6 sm:px-8 md:px-[60px]">
          {/* Logo 左侧容器 */}
          <div className="flex items-center gap-6 shrink-0">
          <a
            href="https://www.hiwe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0"
          >
            <img
              src="/hiwemix2-01.png"
              alt="HIWE MIX"
              className="h-5 w-auto object-contain block md:h-8 transition-all duration-[1.5s] ease-in-out"
            />
          </a>
          </div>

          {/* 导航链接 水平居中于 header */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center gap-[34px]">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`header-nav-link inline-flex h-8 items-center text-[16px] font-medium capitalize tracking-[-0.5px] transition-colors whitespace-nowrap ${active ? "font-semibold" : ""}`}
                    style={{ transition: transitionStyle }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-3 shrink-0 z-[1]">
            {authUser ? (
              <>
                {authUser.role === "admin" && (
                  <div className="hidden md:flex items-center gap-2">
                    <Link
                      href="/admin/data"
                      className="header-action-btn inline-flex h-8 items-center rounded-lg border border-border px-3 text-2xs font-medium transition-all duration-[1.5s] ease-in-out"
                      style={{ transition: transitionStyle }}
                    >
                      {t.navAdmin}
                    </Link>
                    <span className="header-action-btn inline-flex h-8 items-center rounded-lg border border-border px-3 text-2xs font-medium transition-all duration-[1.5s] ease-in-out"
                      style={{ transition: transitionStyle }}
                    >
                      {authUser.email}
                    </span>
                  </div>
                )}
                <button
                  onClick={logout}
                  className="header-action-btn hidden md:inline-flex h-8 items-center rounded-lg border border-border px-3 text-2xs font-medium transition-all duration-[1.5s] ease-in-out"
                  style={{ transition: transitionStyle }}
                >
                  {t.logout}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="header-login-btn inline-flex h-8 items-center rounded-lg border px-6 text-2xs font-medium transition-all duration-[1.5s] ease-in-out"
                style={{ transition: transitionStyle }}
              >
                {t.login}
              </Link>
            )}

            <LanguageSwitcher transitionStyle={transitionStyle} />

            <ThemeToggle />

            {/* 移动端汉堡按钮 */}
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="inline-flex size-9 items-center justify-center rounded-lg md:hidden"
              style={{ color: "var(--header-text)", transition: transitionStyle }}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* 移动端导航 Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[min(80vw,320px)] p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <img
              src="/hiwemix2-01.png"
              alt="HIWE MIX"
              className="h-6 w-auto object-contain block"
            />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex size-9 items-center justify-center rounded-lg"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="pt-2">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block mx-3 px-3 py-3.5 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? "bg-blue-50 text-primary font-semibold"
                      : "text-foreground/80 hover:bg-muted"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {authUser?.role === "admin" && (
            <>
              <Separator className="my-1" />
              <Link
                href="/admin/data"
                onClick={() => setMobileMenuOpen(false)}
                className="block mx-3 px-3 py-3.5 rounded-xl text-sm font-semibold text-foreground/80 hover:bg-muted"
              >
                {t.navAdmin}
              </Link>
              <span className="block mx-3 px-3 py-3.5 rounded-xl text-sm text-foreground/80">
                {authUser.email}
              </span>
              <Separator className="my-1" />
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

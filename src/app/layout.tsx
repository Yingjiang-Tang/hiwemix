import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/components/LanguageContext";
import { AuthProvider } from "@/components/AuthContext";
import { FavoritesProvider } from "@/components/FavoritesContext";
import { CompareProvider } from "@/components/CompareContext";
import Providers from "@/components/Providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import BackToTop from "@/components/BackToTop";
import { Noto_Sans_SC, Noto_Sans_Arabic, Noto_Sans_Hebrew, Geist } from "next/font/google";
import { LANGS, type Lang } from "@/lib/i18n";
import { LANG_COOKIE, THEME_COOKIE } from "@/lib/cookies";

import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const notoSansSC = Noto_Sans_SC({ subsets: ["latin"], variable: "--font-noto" });
const notoSansArabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic" });
const notoSansHebrew = Noto_Sans_Hebrew({ subsets: ["hebrew"], variable: "--font-hebrew" });

export const metadata: Metadata = {
  title: "HIWE MIX - Formula Search",
  description: "Car refinish paint formula search system",
  icons: {
    icon: "/weblogo.png",
  },
};

// 服务端读取语言 cookie：首屏直接输出正确 <html lang>，避免客户端再切换
async function resolveLangCookie(): Promise<string> {
  try {
    const store = await cookies();
    const stored = store.get(LANG_COOKIE)?.value;
    if (stored && LANGS.some((l) => l.code === stored)) return stored;
  } catch {
    /* 构建期等场景 cookies() 不可用，回退默认 */
  }
  return "en";
}

// 服务端读取主题 cookie：默认暗色，显式存了 light 才用亮色。
// SSR 直接输出正确的 .dark class，替代防闪烁脚本（零闪烁、零警告）
async function resolveThemeIsDark(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get(THEME_COOKIE)?.value !== "light";
  } catch {
    return true;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await resolveLangCookie();
  const isDark = await resolveThemeIsDark();
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        isDark && "dark",
        notoSansSC.variable, notoSansArabic.variable, notoSansHebrew.variable, "font-sans", geist.variable
      )}
    >
      <head />
      <body className="min-h-full">
        <TooltipProvider delay={300}>
          <Providers>
          <LanguageProvider initialLang={lang as Lang}>
            <AuthProvider>
              <FavoritesProvider>
                <CompareProvider>
                  {children}
                  <BackToTop />
                </CompareProvider>
              </FavoritesProvider>
            </AuthProvider>
          </LanguageProvider>
        </Providers>
        </TooltipProvider>
      </body>
    </html>
  );
}

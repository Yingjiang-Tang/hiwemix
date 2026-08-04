import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/components/LanguageContext";
import { AuthProvider } from "@/components/AuthContext";
import { FavoritesProvider } from "@/components/FavoritesContext";
import Providers from "@/components/Providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import BackToTop from "@/components/BackToTop";
import { Noto_Sans_SC, Noto_Sans_Arabic, Noto_Sans_Hebrew, Geist } from "next/font/google";
import { LANGS } from "@/lib/i18n";
import { LANG_COOKIE } from "@/lib/cookies";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await resolveLangCookie();
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={cn("h-full", "antialiased", notoSansSC.variable, notoSansArabic.variable, notoSansHebrew.variable, "font-sans", geist.variable)}
    >
      <head>
        {/* 防深色模式闪烁：在 React 渲染前同步读取 localStorage 并应用 .dark class；默认暗色，仅当显式存了 light 时用亮色 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('hiwemix-theme');if(t!=='light'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        <TooltipProvider delay={300}>
          <Providers>
          <LanguageProvider>
            <AuthProvider>
              <FavoritesProvider>
                {children}
                <BackToTop />
              </FavoritesProvider>
            </AuthProvider>
          </LanguageProvider>
        </Providers>
        </TooltipProvider>
      </body>
    </html>
  );
}

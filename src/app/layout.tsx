import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageContext";
import { AuthProvider } from "@/components/AuthContext";
import Providers from "@/components/Providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Inter, Noto_Sans_SC, Noto_Sans_Arabic, Noto_Sans_Hebrew, Outfit, Geist } from "next/font/google";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", inter.variable, notoSansSC.variable, notoSansArabic.variable, notoSansHebrew.variable, outfit.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full">
        <TooltipProvider delay={300}>
          <Providers>
          <LanguageProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </LanguageProvider>
        </Providers>
        </TooltipProvider>
      </body>
    </html>
  );
}

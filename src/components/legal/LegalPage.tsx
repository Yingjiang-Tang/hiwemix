import Image from "next/image";
import Link from "next/link";

// 法务页共用外壳：品牌 logo + 标题 + 正文排版区域
// 不使用强制亮色外壳（.auth-light），跟随站点亮/暗主题
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8 md:py-14">
        <Link href="/" className="inline-flex" aria-label="HIWE MIX home">
          <Image
            src="/hiwemix2-01.png"
            alt="HIWE MIX"
            width={1206}
            height={334}
            className="h-8 w-auto object-contain"
          />
        </Link>

        <h1 className="mt-10 text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>

        <article className="prose prose-sm mt-8 max-w-none dark:prose-invert sm:prose-base">
          {children}
        </article>

        <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

import Image from "next/image";

// 认证页外壳：强制亮色主题 + 左上角品牌 Logo + 居中双栏卡片容器
// 登录 / 注册 / 重置密码三个页面共用
export function AuthPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-light relative">
      {/* 左上角品牌 logo（点击跳转官网） */}
      <a
        href="https://www.hiwe.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="HIWE MIX"
        className="absolute left-6 top-6 z-20 lg:left-10 lg:top-8"
      >
        <Image
          src="/hiwemix2-01.png"
          alt="HIWE MIX"
          width={1206}
          height={334}
          className="h-8 w-auto object-contain lg:h-10"
        />
      </a>

      <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
        <div className="w-full max-w-sm md:max-w-4xl">{children}</div>
      </div>
    </div>
  );
}

import Image from "next/image";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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
        className="absolute left-1/2 top-[35px] z-20 -translate-x-1/2 lg:left-10 lg:top-8 lg:translate-x-0"
      >
        <Image
          src="/hiwemix2-01.png"
          alt="HIWE MIX"
          width={1206}
          height={334}
          className="h-8 w-auto object-contain lg:h-10"
        />
      </a>

      {/* 右上角语言切换器：与居中/居左 logo 同一水平线，手机端只显示国旗 */}
      <div className="absolute right-6 top-[29px] z-20 md:right-10 md:top-8 lg:top-9">
        <LanguageSwitcher variant="auth" />
      </div>

      <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-muted px-6 pb-6 pt-24 md:p-10">
        {/* 背景水印：倾斜重复的 HIWE MIX logo，相邻两行沿斜线反向滚动（装饰层，不拦截交互）
            每层图案单元 908×240（两行高度，每行两个 logo）：
            A 层只画偶数行（y=4，向上滚），B 层只画奇数行（y=124，向下滚）；所有 logo 统一为浅灰色 */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {/* A 层：较慢，当前速度 */}
          <svg className="auth-watermark auth-watermark--slow">
            <defs>
              <pattern id="auth-watermark-pattern-a" width="908" height="240" patternUnits="userSpaceOnUse">
                <image className="auth-watermark__logo--gray" href="/hiwemix2-01.png" x="26" y="4" width="403" height="112" />
                <image className="auth-watermark__logo--gray" href="/hiwemix2-01.png" x="480" y="4" width="403" height="112" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#auth-watermark-pattern-a)" />
          </svg>

          {/* B 层：反向播放同一动画 = 向下滚动，周期略短所以稍快 */}
          <svg
            className="auth-watermark auth-watermark--slow"
            style={{ animationDirection: "reverse", animationDuration: "151s" }}
          >
            <defs>
              <pattern id="auth-watermark-pattern-b" width="908" height="240" patternUnits="userSpaceOnUse">
                <image className="auth-watermark__logo--gray" href="/hiwemix2-01.png" x="26" y="124" width="403" height="112" />
                <image className="auth-watermark__logo--gray" href="/hiwemix2-01.png" x="480" y="124" width="403" height="112" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#auth-watermark-pattern-b)" />
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-sm md:max-w-4xl">{children}</div>
      </div>
    </div>
  );
}

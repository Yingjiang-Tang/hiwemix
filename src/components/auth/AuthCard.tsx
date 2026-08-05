"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

// 认证双栏卡片外壳：左图右表单（桌面端），移动端只显示表单
// 登录页与注册页共用，表单内容由 children 传入
export function AuthCard({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden rounded-[25px] p-0">
        <CardContent className="grid min-h-[700px] overflow-hidden px-0 py-0 md:grid-cols-2">
          {/* 左侧图片栏（桌面端显示） */}
          <div className="relative hidden overflow-hidden bg-muted md:block">
            <img
              src="/2x.jpg"
              alt="Paint color"
              className="h-full w-full object-cover"
            />
          </div>

          {children}
        </CardContent>
      </Card>

      {/* 免责声明 */}
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}

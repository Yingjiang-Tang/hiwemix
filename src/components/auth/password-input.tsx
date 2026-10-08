"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLang } from "@/components/LanguageContext";
import { cn } from "@/lib/utils";

export function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  const { t } = useLang();
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("max-md:h-11 max-md:pr-11", className)} />
      {/* 手机端显示密码辅助按钮，桌面端维持原有视觉和尺寸。 */}
      <button type="button" aria-label={visible ? t.authHidePassword : t.authShowPassword} aria-pressed={visible} disabled={props.disabled} onClick={() => setVisible(!visible)} className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary md:hidden">
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

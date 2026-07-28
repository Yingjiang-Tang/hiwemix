"use client";

import { useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function OtpInput({ value, onChange, disabled = false, autoFocus = true }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.split("").concat(Array(6 - value.length).fill(""));

  const handleChange = useCallback(
    (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const char = e.target.value;
      // 只允许数字
      if (char && !/^\d$/.test(char)) return;
      const newDigits = [...digits];
      newDigits[idx] = char;
      const newValue = newDigits.slice(0, 6).join("");
      onChange(newValue);
      // 输入后自动跳下一个
      if (char && idx < 5) {
        inputRefs.current[idx + 1]?.focus();
      }
    },
    [digits, onChange]
  );

  const handleKeyDown = useCallback(
    (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !digits[idx] && idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      } else if (e.key === "ArrowLeft" && idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      } else if (e.key === "ArrowRight" && idx < 5) {
        inputRefs.current[idx + 1]?.focus();
      }
    },
    [digits]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (!pasted) return;
      onChange(pasted);
      // 聚焦到最后一个填入的后面
      const nextIdx = Math.min(pasted.length, 5);
      inputRefs.current[nextIdx]?.focus();
    },
    [onChange]
  );

  return (
    <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
      {Array.from({ length: 6 }, (_, idx) => (
        <Input
          key={idx}
          ref={(el) => { inputRefs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[idx] || ""}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          disabled={disabled}
          autoFocus={autoFocus && idx === 0}
          className={cn(
            "h-12 w-11 text-center text-lg font-mono",
            "rounded-lg border-border",
            "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
          )}
          aria-label={`Digit ${idx + 1}`}
        />
      ))}
    </div>
  );
}

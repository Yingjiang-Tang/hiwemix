"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";

type ColorFormat = "HEX" | "RGB" | "HSL";

const HEX_RE = /^#?([0-9a-fA-F]{6})$/;
const RGB_RE = /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/;
const HSL_RE = /^(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%$/;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// hex → {r,g,b}
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  return {
    r: parseInt(m[1].slice(0, 2), 16),
    g: parseInt(m[1].slice(2, 4), 16),
    b: parseInt(m[1].slice(4, 6), 16),
  };
}

// {r,g,b} → hex（#RRGGBB）
function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

// {r,g,b} → {h,s,l}（0-360, 0-100, 0-100）
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// {h,s,l} → {r,g,b}
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hueToRgb = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return {
    r: Math.round(hueToRgb(hn + 1 / 3) * 255),
    g: Math.round(hueToRgb(hn) * 255),
    b: Math.round(hueToRgb(hn - 1 / 3) * 255),
  };
}

interface ColorPickerFieldProps {
  value: string; // 当前 hex（#RRGGBB）
  onChange: (hex: string) => void;
}

/**
 * 自绘取色器：点击色块展开内联面板（绝对定位，不用 Popover/Portal，
 * 避免在 Base UI modal Dialog 内被 focus trap 拦截），含色板 + HEX/RGB/HSL
 * 三种输入（默认 HEX）。替代浏览器原生 <input type="color">。
 */
export default function ColorPickerField({ value, onChange }: ColorPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ColorFormat>("HEX");
  // 每种格式的草稿输入（未失焦提交前可自由编辑）
  const [hexDraft, setHexDraft] = useState<string>(value.replace(/^#/, ""));
  const [rgbDraft, setRgbDraft] = useState<string>("");
  const [hslDraft, setHslDraft] = useState<string>("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // 点击面板外部关闭
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const rgb = hexToRgb(value) ?? { r: 255, g: 255, b: 255 };

  const handlePickerChange = useCallback((next: string) => {
    onChange(next);
    const v = next.replace(/^#/, "").toUpperCase();
    setHexDraft(v);
    const rr = hexToRgb(next);
    if (rr) {
      setRgbDraft(`${rr.r}, ${rr.g}, ${rr.b}`);
      const hsl = rgbToHsl(rr.r, rr.g, rr.b);
      setHslDraft(`${hsl.h}, ${hsl.s}%, ${hsl.l}%`);
    }
  }, [onChange]);

  const commitHex = () => {
    const m = HEX_RE.exec(hexDraft);
    if (m) onChange(`#${m[1].toUpperCase()}`);
    else setHexDraft(value.replace(/^#/, "").toUpperCase()); // 无效回退
  };

  const commitRgb = () => {
    const m = RGB_RE.exec(rgbDraft.trim());
    if (m) {
      const r = clamp(parseInt(m[1], 10), 0, 255);
      const g = clamp(parseInt(m[2], 10), 0, 255);
      const b = clamp(parseInt(m[3], 10), 0, 255);
      onChange(rgbToHex(r, g, b));
      setHexDraft(rgbToHex(r, g, b).replace(/^#/, ""));
    } else {
      setRgbDraft(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
  };

  const commitHsl = () => {
    const m = HSL_RE.exec(hslDraft.trim());
    if (m) {
      const h = clamp(parseInt(m[1], 10), 0, 360);
      const s = clamp(parseInt(m[2], 10), 0, 100);
      const l = clamp(parseInt(m[3], 10), 0, 100);
      const rr = hslToRgb(h, s, l);
      onChange(rgbToHex(rr.r, rr.g, rr.b));
      setHexDraft(rgbToHex(rr.r, rr.g, rr.b).replace(/^#/, ""));
    } else {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setHslDraft(`${hsl.h}, ${hsl.s}%, ${hsl.l}%`);
    }
  };

  const formatBtn = (f: ColorFormat, label: string) => (
    <button
      key={f}
      type="button"
      onClick={() => setFormat(f)}
      className={cn(
        "rounded-md px-2 py-1 text-2xs font-medium transition-colors",
        format === f
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative flex h-9 w-full cursor-pointer items-center overflow-hidden rounded-lg border border-border bg-transparent transition-colors hover:border-foreground/30"
      >
        <span
          className="absolute inset-0"
          style={{ backgroundColor: value }}
        />
        <span className="pointer-events-none relative ml-auto flex h-full items-center border-l border-border bg-background/85 px-2 text-2xs font-mono text-muted-foreground">
          {value.toUpperCase()}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[1400] mt-1 w-full rounded-lg border border-border bg-popover p-2.5 text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-medium text-muted-foreground">颜色格式</span>
            <div className="inline-flex rounded-lg border border-border p-0.5">
              {formatBtn("HEX", "HEX")}
              {formatBtn("RGB", "RGB")}
              {formatBtn("HSL", "HSL")}
            </div>
          </div>

          <HexColorPicker
            color={value}
            onChange={handlePickerChange}
            className="w-full!"
          />

        {format === "HEX" && (
          <div className="flex items-center gap-2">
            <span className="text-2xs font-mono text-muted-foreground">#</span>
            <input
              value={hexDraft}
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={commitHex}
              onKeyDown={(e) => { if (e.key === "Enter") commitHex(); }}
              placeholder="000000"
              maxLength={6}
              className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 font-mono text-2xs outline-none focus:border-primary"
            />
          </div>
        )}
        {format === "RGB" && (
          <div className="flex items-center gap-2">
            <input
              value={rgbDraft}
              onChange={(e) => setRgbDraft(e.target.value)}
              onBlur={commitRgb}
              onKeyDown={(e) => { if (e.key === "Enter") commitRgb(); }}
              placeholder={`${rgb.r}, ${rgb.g}, ${rgb.b}`}
              className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 font-mono text-2xs outline-none focus:border-primary"
            />
          </div>
        )}
        {format === "HSL" && (
          <div className="flex items-center gap-2">
            <input
              value={hslDraft}
              onChange={(e) => setHslDraft(e.target.value)}
              onBlur={commitHsl}
              onKeyDown={(e) => { if (e.key === "Enter") commitHsl(); }}
              placeholder="210, 50%, 40%"
              className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 font-mono text-2xs outline-none focus:border-primary"
            />
          </div>
        )}
        </div>
      )}
    </div>
  );
}
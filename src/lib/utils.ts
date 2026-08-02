import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 生成金属漆光泽渐变效果的样式对象 */
export function colorSwatchStyle(hex: string) {
  return {
    backgroundColor: hex,
    backgroundImage:
      "linear-gradient(45deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.04) 16%, rgba(0,0,0,0) 32%, rgba(255,255,255,0.28) 42%, rgba(255,255,255,0.50) 50%, rgba(255,255,255,0.28) 58%, rgba(0,0,0,0) 68%, rgba(0,0,0,0.04) 84%, rgba(0,0,0,0.08) 100%)",
  };
}

/** 安全解析 JSON 请求体，失败时返回 null */
export async function safeJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/** 统一错误响应格式 */
export function errorResponse(message: string, status: number = 400) {
  return Response.json({ error: message }, { status });
}

/** 统一成功响应格式 */
export function successResponse(data: unknown, status: number = 200) {
  return Response.json(data, { status });
}

// ============================================================
// 颜色色系归类（基于 RGB → HSL，用于收藏页色系筛选圆点）
// ============================================================

export interface ColorFamily {
  key: string;   // 唯一标识
  name: string;  // 显示名（中文）
  hex: string;   // 代表色（小圆点颜色）
}

/** 标准色系表（顺序即选项栏展示顺序） */
export const COLOR_FAMILIES: ColorFamily[] = [
  { key: "red",    name: "红",   hex: "#E53935" },
  { key: "orange", name: "橙",   hex: "#F57C00" },
  { key: "yellow", name: "黄",   hex: "#FDD835" },
  { key: "green",  name: "绿",   hex: "#43A047" },
  { key: "blue",   name: "蓝",   hex: "#1E88E5" },
  { key: "purple", name: "紫",   hex: "#8E24AA" },
  { key: "pink",   name: "粉",   hex: "#EC407A" },
  { key: "brown",  name: "棕",   hex: "#6D4C41" },
  { key: "white",  name: "白",   hex: "#F5F5F5" },
  { key: "gray",   name: "灰",   hex: "#9E9E9E" },
  { key: "black",  name: "黑",   hex: "#212121" },
];

/** hex (#RRGGBB) → {r,g,b}；无效返回 null */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

/** 将颜色归类到最近色系（基于 HSL 判断：先亮度分黑白灰，再按色相归色系） */
export function classifyColorFamily(hex: string): ColorFamily {
  const rgb = hexToRgb(hex);
  if (!rgb) return COLOR_FAMILIES[8]; // 无效 hex 回退白色系
  const { r, g, b } = rgb;

  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;

  // 亮度极低 → 黑；极高 → 白
  if (l < 0.18) return COLOR_FAMILIES[10]; // black
  if (l > 0.86) return COLOR_FAMILIES[8];  // white

  const d = max - min;
  // 低饱和度 → 灰
  if (d < 0.12) return COLOR_FAMILIES[9];  // gray

  let h = 0;
  if (d !== 0) {
    if (max === r / 255) h = ((g - b) / 255 / d) % 6;
    else if (max === g / 255) h = (b / 255 - r / 255) / d + 2;
    else h = (r / 255 - g / 255) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  if (h < 15 || h >= 345) return COLOR_FAMILIES[0]; // red
  if (h < 45) return COLOR_FAMILIES[1];  // orange
  if (h < 70) return COLOR_FAMILIES[2];  // yellow
  if (h < 165) return COLOR_FAMILIES[3]; // green
  if (h < 215) return COLOR_FAMILIES[4]; // blue
  if (h < 265) return COLOR_FAMILIES[5]; // purple
  if (h < 330) return COLOR_FAMILIES[6]; // pink
  if (l < 0.5) return COLOR_FAMILIES[7]; // brown（偏暗的暖色）
  return COLOR_FAMILIES[0];              // red
}

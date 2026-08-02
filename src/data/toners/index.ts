// 色母数据 Barrel — 按 category 拆分，此处合并导出
// 保持原有导出签名不变，所有消费者无需改动
import type { Toner, TonerCategory } from '@/types';
import toners2kBasecoat from './2k-basecoat';
import toners1kBasecoat from './1k-basecoat';
import toners1kSilver from './1k-silver';
import toners1kPearl from './1k-pearl';
import tonersSupplementary from './supplementary';

/** 全部色母列表 — 122 条 */
export const TONERS: Toner[] = [
  ...toners2kBasecoat,
  ...toners1kBasecoat,
  ...toners1kSilver,
  ...toners1kPearl,
  ...tonersSupplementary,
];

/** 色母分类元信息 */
export const TONER_CATEGORIES: { key: TonerCategory; label: string; count: number }[] = [
  { key: '2K_BASECOAT',        label: '2K Basecoat',        count: toners2kBasecoat.length },
  { key: '1K_BASECOAT',        label: '1K Basecoat',        count: toners1kBasecoat.length },
  { key: '1K_SILVER_BASECOAT', label: '1K Silver Basecoat', count: toners1kSilver.length },
  { key: '1K_PEARL_BASECOAT',  label: '1K Pearl Basecoat',  count: toners1kPearl.length },
  { key: 'SUPPLEMENTARY',      label: 'Additives',          count: tonersSupplementary.length },
];

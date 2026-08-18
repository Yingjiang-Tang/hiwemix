import type { FormulaSnapshot } from "@/types";

// 对比表行：一个色母在所有配方中的用量（缺失为 null）
export interface CompareRow {
  toner_code: string;
  toner_name: string;
  values: (number | null)[];
  presentIn: number[]; // 出现在哪些配方下标（从 0 起）
}

/** 构建对比表行：行 = 所有配方色母并集，行序按第一配方 components 顺序优先，其余追加 */
export function buildCompareRows(items: FormulaSnapshot[]): CompareRow[] {
  const rows: CompareRow[] = [];
  const index = new Map<string, number>();

  for (let i = 0; i < items.length; i++) {
    for (const comp of items[i].formula.components) {
      let row = index.has(comp.toner_code) ? rows[index.get(comp.toner_code)!] : undefined;
      if (!row) {
        row = {
          toner_code: comp.toner_code,
          toner_name: comp.toner_name,
          values: Array(items.length).fill(null),
          presentIn: [],
        };
        index.set(comp.toner_code, rows.length);
        rows.push(row);
      }
      row.values[i] = comp.grams_per_100g;
      row.presentIn.push(i);
    }
  }
  return rows;
}

/** 色母是否只出现在部分配方（而非全部） */
export function isPartial(row: CompareRow, total: number): boolean {
  return row.presentIn.length > 0 && row.presentIn.length < total;
}

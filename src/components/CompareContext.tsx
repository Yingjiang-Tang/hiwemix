"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { FormulaSnapshot } from "@/types";

// 对比篮单项
interface CompareItem {
  snapshot: FormulaSnapshot;
  ts: number;
}

interface CompareContextValue {
  /** 当前对比篮中的配方快照列表（最多 MAX_ITEMS 条，超出移除最旧） */
  compareItems: FormulaSnapshot[];
  /** 某配方是否已在对比篮中 */
  isInCompare: (formulaId: string) => boolean;
  /** 切换对比状态：已在则移除，否则加入（并触发最旧淘汰） */
  toggleCompare: (snapshot: FormulaSnapshot) => void;
  /** 移除单个配方 */
  removeFromCompare: (formulaId: string) => void;
  /** 清空对比篮 */
  clearCompare: () => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

const LS_KEY = "hiwe-compare";
const MAX_ITEMS = 4;

function loadLocal(): CompareItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as CompareItem[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveLocal(list: CompareItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  // 挂载时读本地对比篮（纯 localStorage，匿名可用，不做登录合并）
  useEffect(() => {
    setItems(loadLocal());
  }, []);

  const isInCompare = (formulaId: string) => items.some((i) => i.snapshot.formula_id === formulaId);

  function toggleCompare(snapshot: FormulaSnapshot) {
    const formulaId = snapshot.formula_id;
    setItems((prev) => {
      const exists = prev.some((i) => i.snapshot.formula_id === formulaId);
      let next: CompareItem[];
      if (exists) {
        next = prev.filter((i) => i.snapshot.formula_id !== formulaId);
      } else {
        next = [{ snapshot, ts: Date.now() }, ...prev];
        if (next.length > MAX_ITEMS) next = next.slice(0, MAX_ITEMS); // 超出上限移除最旧
      }
      saveLocal(next);
      return next;
    });
  }

  function removeFromCompare(formulaId: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.snapshot.formula_id !== formulaId);
      saveLocal(next);
      return next;
    });
  }

  function clearCompare() {
    setItems([]);
    saveLocal([]);
  }

  const compareItems: FormulaSnapshot[] = items.map((i) => i.snapshot);

  return (
    <CompareContext.Provider
      value={{ compareItems, isInCompare, toggleCompare, removeFromCompare, clearCompare }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}

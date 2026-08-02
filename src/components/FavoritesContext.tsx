"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/AuthContext";
import type { FavoriteSnapshot } from "@/lib/db-favorites";

// 匿名收藏项（localStorage）
interface LocalFavorite {
  snapshot: FavoriteSnapshot;
  ts: number;
}

interface FavoritesContextValue {
  /** 收藏的 formula_id 集合（匿名本地 + 登录云端合并后） */
  favoriteIds: Set<string>;
  /** 是否已收藏某个配方 */
  isFavorite: (formulaId: string) => boolean;
  /** 切换收藏状态：登录走 API，匿名走 localStorage */
  toggleFavorite: (snapshot: FavoriteSnapshot) => Promise<void>;
  /** 当前可见的收藏快照列表（供收藏页渲染） */
  snapshotList: FavoriteSnapshot[];
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const LS_KEY = "hiwe-favorites";

function loadLocal(): LocalFavorite[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as LocalFavorite[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveLocal(list: LocalFavorite[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [localFavs, setLocalFavs] = useState<LocalFavorite[]>([]);
  const [cloudFavs, setCloudFavs] = useState<FavoriteSnapshot[]>([]);
  const syncedRef = useRef(false);

  // 挂载时读本地收藏
  useEffect(() => {
    setLocalFavs(loadLocal());
  }, []);

  // 登录后拉取云端收藏，并与本地合并（本地去重后并入云端；同步完成后清空本地）
  useEffect(() => {
    if (!user) {
      setCloudFavs([]);
      syncedRef.current = false;
      return;
    }
    if (syncedRef.current) return;
    syncedRef.current = true;

    async function sync() {
      try {
        const res = await fetch("/api/favorites");
        const remote = res.ok ? (await res.json()) as FavoriteSnapshot[] : [];
        const local = loadLocal();

        // 本地有但云端没有的 → 上传到云端
        const remoteIds = new Set(remote.map((f) => f.formula_id));
        for (const lf of local) {
          if (!remoteIds.has(lf.snapshot.formula_id)) {
            try {
              await fetch("/api/favorites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(lf.snapshot),
              });
            } catch {
              // ignore 单条上传失败
            }
          }
        }

        // 重新拉取合并后的云端列表
        const res2 = await fetch("/api/favorites");
        const merged = res2.ok ? (await res2.json()) as FavoriteSnapshot[] : remote;
        setCloudFavs(merged);
        // 合并成功后清空本地，避免下次重复上传
        saveLocal([]);
        setLocalFavs([]);
      } catch {
        // 网络失败时保留本地收藏，下次登录重试
      }
    }
    sync();
  }, [user]);

  const favoriteIds = new Set<string>([
    ...localFavs.map((f) => f.snapshot.formula_id),
    ...cloudFavs.map((f) => f.formula_id),
  ]);

  const isFavorite = (formulaId: string) => favoriteIds.has(formulaId);

  async function toggleFavorite(snapshot: FavoriteSnapshot) {
    const formulaId = snapshot.formula_id;
    const wasFav = isFavorite(formulaId);
    if (user) {
      // 登录：走 API
      const res = wasFav
        ? await fetch(`/api/favorites?formula_id=${encodeURIComponent(formulaId)}`, { method: "DELETE" })
        : await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(snapshot),
          });
      if (!res.ok) throw new Error("favorite request failed");
      if (wasFav) {
        setCloudFavs((prev) => prev.filter((f) => f.formula_id !== formulaId));
      } else {
        setCloudFavs((prev) => [snapshot, ...prev]);
      }
      return;
    }

    // 匿名：localStorage
    setLocalFavs((prev) => {
      const exists = prev.some((f) => f.snapshot.formula_id === formulaId);
      const next = exists
        ? prev.filter((f) => f.snapshot.formula_id !== formulaId)
        : [{ snapshot, ts: Date.now() }, ...prev];
      saveLocal(next);
      return next;
    });
  }

  // 合并云端 + 本地收藏，按 formula_id 去重（云端优先，避免重复 key）
  const snapshotList: FavoriteSnapshot[] = (() => {
    const seen = new Set<string>();
    const merged: FavoriteSnapshot[] = [];
    for (const f of [...cloudFavs, ...localFavs.map((f) => f.snapshot)]) {
      if (seen.has(f.formula_id)) continue;
      seen.add(f.formula_id);
      merged.push(f);
    }
    return merged;
  })();

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite, snapshotList }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}

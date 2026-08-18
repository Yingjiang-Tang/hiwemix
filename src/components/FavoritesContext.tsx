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
  // 失败策略：单条上传失败 → 保留该条待下次登录重试；初始拉取失败 → 本次会话可重试。
  // 已成功上传的项会从本地剔除，避免下次重复上传；只有全部成功才清空本地。
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
        if (!res.ok) throw new Error("fetch favorites failed");
        const remote = (await res.json()) as FavoriteSnapshot[];
        const local = loadLocal();

        // 本地有但云端没有的 → 上传到云端；逐个记录成功/失败
        const remoteIds = new Set(remote.map((f) => f.formula_id));
        const pending: LocalFavorite[] = [];
        for (const lf of local) {
          const fid = lf.snapshot.formula_id;
          if (remoteIds.has(fid)) continue; // 云端已有，无需上传
          try {
            const up = await fetch("/api/favorites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(lf.snapshot),
            });
            if (up.ok) {
              remoteIds.add(fid); // 后续去重判断用
            } else {
              pending.push(lf); // 上传失败（4xx/5xx）保留本地
            }
          } catch {
            pending.push(lf); // 网络失败保留本地
          }
        }

        if (pending.length > 0) {
          // 有失败的项：本地只保留失败的（已成功的剔除），下次登录时重试；不清空本地
          saveLocal(pending);
          setLocalFavs(pending);
          syncedRef.current = false; // 供下次退出/重登时重新触发合并
        } else {
          // 全部成功：清空本地，避免下次重复上传
          saveLocal([]);
          setLocalFavs([]);
        }

        // 重新拉取合并后的云端列表
        const res2 = await fetch("/api/favorites");
        const merged = res2.ok ? (await res2.json()) as FavoriteSnapshot[] : remote;
        setCloudFavs(merged);
      } catch {
        // 初始拉取/合并失败：保留本地收藏，允许本次会话重试
        syncedRef.current = false;
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
      // 登录：乐观更新立即反映状态（与保存配方按钮一致），失败回滚
      if (wasFav) {
        setCloudFavs((prev) => prev.filter((f) => f.formula_id !== formulaId));
      } else {
        setCloudFavs((prev) => [snapshot, ...prev]);
      }
      try {
        const res = wasFav
          ? await fetch(`/api/favorites?formula_id=${encodeURIComponent(formulaId)}`, { method: "DELETE" })
          : await fetch("/api/favorites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(snapshot),
            });
        if (!res.ok) throw new Error("favorite request failed");
      } catch (e) {
        // 回滚乐观更新
        if (wasFav) {
          setCloudFavs((prev) => [snapshot, ...prev]);
        } else {
          setCloudFavs((prev) => prev.filter((f) => f.formula_id !== formulaId));
        }
        throw e;
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

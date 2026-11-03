"use client";

import { useState, useEffect, useCallback } from "react";
import type { ColorVariant } from "@/types";
import { fetchAdminJson } from "@/lib/admin-fetch";
import DataLoadError from "./DataLoadError";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function VariantsPanel() {
  const [variants, setVariants] = useState<ColorVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const fetchVariants = useCallback(async () => {
    setLoading(true);
    try { setVariants(await fetchAdminJson<ColorVariant[]>("/api/admin/variants")); setLoadError(false); }
    catch { setLoadError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void fetchVariants(); }, [fetchVariants]);

  if (loadError) return <DataLoadError onRetry={fetchVariants} />;
  if (loading) return <p role="status">加载中...</p>;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">配方施工类型为内置只读值。2K 使用 Single Stage；1K 使用 Two Stages 或 Three Stages。现有记录和历史关联保留。</p>
      <div className="overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>名称</TableHead><TableHead>状态</TableHead></TableRow></TableHeader>
          <TableBody>
            {variants.map((v) => (
              <TableRow key={v.id}><TableCell>{v.id}</TableCell><TableCell>{v.name}</TableCell><TableCell>只读</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

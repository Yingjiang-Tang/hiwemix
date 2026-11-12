"use client";

import { useState, useEffect, useCallback } from "react";
import type { ColorVariant } from "@/types";
import { fetchAdminJson } from "@/lib/admin-fetch";
import DataLoadError from "./DataLoadError";
import { Spinner } from "@/components/ui/spinner";
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
  if (loading) return <div role="status" className="flex justify-center py-4 text-muted-foreground"><Spinner /></div>;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">配方施工类型为内置只读值。2K 使用 Single Stage；1K 使用 Two Stages 或 Three Stages。现有记录和历史关联保留。</p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/80">
              <TableHead className="w-[120px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">ID</TableHead>
              <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">名称</TableHead>
              <TableHead className="w-[100px] py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center">状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((v) => (
              <TableRow key={v.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/50">
                <TableCell className="py-3 text-center text-sm text-muted-foreground">{v.id}</TableCell>
                <TableCell className="py-3 text-center text-sm font-medium text-foreground">{v.name}</TableCell>
                <TableCell className="py-3 text-center text-sm text-muted-foreground">只读</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

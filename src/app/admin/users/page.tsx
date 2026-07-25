"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { useToast } from "@/components/Toast";
import { useLang } from "@/components/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";

interface User {
  id: number;
  username: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export default function AdminUsersPage() {
  const { t } = useLang();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { showToast, toastElement } = useToast();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ username: "", password: "", role: "user" });
  const [error, setError] = useState("");
  const router = useRouter();

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${day} ${String(h).padStart(2, "0")}:${mi} ${ampm}`;
  }

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) { setUsers(await res.json()); }
    else if (res.status === 401) { router.push("/login"); }
    else if (res.status === 403) { showToast(t.adminNoPermission); router.push("/"); }
    setLoading(false);
  }, [router, showToast, t]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function openCreate() {
    setEditingUser(null);
    setForm({ username: "", password: "", role: "user" });
    setError("");
    setShowModal(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({ username: user.username, password: "", role: user.role });
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    setError("");
    const method = editingUser ? "PUT" : "POST";
    const body = editingUser ? { id: editingUser.id, ...form } : { ...form };

    if (!editingUser && !form.password) { setError(t.adminPasswordRequired); return; }

    const res = await fetch("/api/admin/users", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchUsers(); }
    else { setError(data.error || "操作失败"); }
  }

  async function handleDelete(user: User) {
    if (user.username === "admin") { showToast(t.adminCannotDeleteAdmin); return; }
    if (!confirm(t.adminConfirmDelete(user.username))) return;
    const res = await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id }) });
    if (res.ok) { fetchUsers(); }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">{t.adminLoading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-white">
      <SiteHeader />
      <div className="pt-[100px] pb-8 px-6 sm:px-8 md:px-[60px]">
        <div className="flex justify-end mb-5">
          <Button onClick={openCreate} className="rounded-lg bg-foreground text-background hover:bg-foreground/80">
            <Plus className="size-4" /> {t.adminNewUser}
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground uppercase">{t.adminColId}</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground uppercase">{t.adminColUsername}</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground uppercase">{t.adminColRole}</TableHead>
                <TableHead className="hidden md:table-cell py-2.5 text-xs font-semibold text-muted-foreground uppercase">Joined Date</TableHead>
                <TableHead className="py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">{t.adminColActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/50">
                  <TableCell className="py-3 text-2xs text-muted-foreground">{user.id}</TableCell>
                  <TableCell className="py-3 text-2xs font-semibold text-foreground break-all">{user.username}</TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block size-2 rounded-full ${user.role === "admin" ? "bg-destructive/100" : "bg-muted-foreground"}`} />
                      <span className="text-2xs text-foreground/80">{user.role === "admin" ? t.adminRoleAdmin : t.adminRoleUser}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-3 text-2xs text-muted-foreground whitespace-nowrap">{formatDate(user.created_at)}</TableCell>
                  <TableCell className="py-3 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(user)} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"><Edit className="size-4" /></button>
                      <button onClick={() => handleDelete(user)} disabled={user.username === "admin"} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"><Trash2 className="size-4" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {toastElement}

      {/* User create/edit dialog */}
      <Dialog open={showModal} onOpenChange={(v) => { if (!v) setShowModal(false); }}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle>{editingUser ? t.adminEditTitle : t.adminNewUser}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">{t.adminColUsername}</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editingUser} className="h-9 rounded-lg" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">{`${t.adminLabelPassword} ${editingUser ? t.adminPasswordHint : ""}`}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingUser ? t.adminPasswordPlaceholder : ""} className="h-9 rounded-lg" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground/80">{t.adminLabelRole}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v || "user" })}>
                <SelectTrigger className="h-9 w-full rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[130]">
                  <SelectItem value="user">{t.adminRoleUser}</SelectItem>
                  <SelectItem value="admin">{t.adminRoleAdmin}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-2xs text-destructive">{error}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-lg">{t.adminCancel}</Button>
            <Button onClick={handleSave} className="rounded-lg bg-foreground hover:bg-foreground/80">{editingUser ? t.adminSave : t.adminCreate}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, ChevronLeft, ChevronRight, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import UserHistoryModal from "@/components/admin/UserHistoryModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Role = {
  id: string;
  name: string;
  admin_access?: boolean;
};

type User = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string | null;
  role?: { id: string; name?: string } | string | null;
  _source?: "legacy" | "directus";
  _roleName?: string | null;
  _flags?: { isFounder?: boolean; isAdmin?: boolean } | null;
};

type AdminStatusPayload = {
  rolesVirtual: boolean;
  usersFallback: boolean;
  usersSource: "legacy" | "directus" | "unknown";
};

const LIMIT = 10;

export default function AdminUsersPanel({
  onStatusChange,
}: {
  onStatusChange?: (status: AdminStatusPayload) => void;
}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesVirtual, setRolesVirtual] = useState(false);
  const [usersSource, setUsersSource] = useState<AdminStatusPayload["usersSource"]>("unknown");
  const [usersFallback, setUsersFallback] = useState(false);
  const [items, setItems] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [banLoadingId, setBanLoadingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/admin/roles/list", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => {
        setRoles(Array.isArray(json?.data) ? json.data : []);
        setRolesVirtual(Boolean(json?.meta?.virtual));
      })
      .catch(() => {
        setRoles([]);
        setRolesVirtual(false);
      });
  }, []);

  useEffect(() => {
    onStatusChange?.({ rolesVirtual, usersFallback, usersSource });
  }, [rolesVirtual, usersFallback, usersSource, onStatusChange]);

  const roleOptions = useMemo(() => roles.map((role) => ({ value: role.id, label: role.name })), [roles]);
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));

  const getUsers = async ({
    page: targetPage = page,
    query = q,
    role = roleId,
  }: {
    page?: number;
    query?: string;
    role?: string;
  } = {}) => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          q: query || undefined,
          roleId: role || undefined,
          page: targetPage,
          limit: LIMIT,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || "FETCH_FAILED");

      const rows: User[] = Array.isArray(json?.data) ? json.data : [];
      const metaSource = json?.meta?.source;
      const resolvedSource = metaSource === "legacy" || metaSource === "directus" ? metaSource : "unknown";

      setUsersSource(resolvedSource);
      setUsersFallback(Boolean(json?.meta?.fallback));
      setTotal(Number(json?.total || rows.length || 0));
      setPage(targetPage);

      const decorated = rows
        .map((user) => {
          const roleObj = typeof user.role === "object" && user.role ? (user.role as Role) : null;
          const rawName = (user as { _roleName?: string | null })._roleName || roleObj?.name || "";
          const normalized = String(rawName).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          const isFounder = normalized.includes("fondateur") || normalized.includes("founder");
          const isAdmin = isFounder || normalized.includes("admin") || roleObj?.admin_access === true;
          return { ...user, _roleName: rawName || null, _flags: { isFounder, isAdmin } } as User;
        })
        .sort((a, b) => {
          const weightA = a._flags?.isFounder ? 0 : a._flags?.isAdmin ? 1 : 2;
          const weightB = b._flags?.isFounder ? 0 : b._flags?.isAdmin ? 1 : 2;
          return weightA - weightB;
        });

      setItems(decorated);

      const nextRoles: Record<string, string> = {};
      for (const user of rows) {
        const roleValue = typeof user.role === "object" ? (user.role as { id?: string })?.id : user.role;
        if (roleValue) nextRoles[user.id] = String(roleValue);
      }
      setSelectedRoles(nextRoles);
    } catch {
      toast.error("Impossible de charger les utilisateurs");
      setItems([]);
      setTotal(0);
      setUsersSource("unknown");
      setUsersFallback(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void getUsers({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaveRole = async (userId: string, nextRoleId: string | undefined) => {
    if (!nextRoleId) return;
    setSavingId(userId);
    try {
      const response = await fetch("/api/admin/users/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId, roleId: nextRoleId }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(json?.error || "Echec de la mise a jour du role");
        return;
      }
      toast.success("Role mis a jour");
      await getUsers();
    } catch {
      toast.error("Impossible de mettre a jour le role");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleBan = async (user: User, ban: boolean) => {
    if (!confirm(ban ? `Bannir ${user.email || "cet utilisateur"} ?` : `Reactiver ${user.email || "cet utilisateur"} ?`)) {
      return;
    }

    setBanLoadingId(user.id);
    try {
      const response = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId: user.id, ban }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(json?.error || "Impossible de mettre a jour le statut");
        return;
      }
      toast.success(ban ? "Utilisateur banni" : "Utilisateur reactive");
      await getUsers();
    } catch {
      toast.error("Impossible de mettre a jour le statut");
    } finally {
      setBanLoadingId(null);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Supprimer definitivement ${user.email || "cet utilisateur"} ?`)) return;

    setDeleteLoadingId(user.id);
    try {
      const response = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId: user.id }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(json?.error || "Suppression impossible");
        return;
      }
      toast.success("Utilisateur supprime");
      await getUsers();
    } catch {
      toast.error("Suppression impossible");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleSearch = () => {
    void getUsers({ page: 1 });
  };

  const handleReset = () => {
    setQ("");
    setRoleId(undefined);
    setPage(1);
    void getUsers({ page: 1, query: "", role: undefined });
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="rounded-[4px] border border-[#141433] bg-[#1F1F3E] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--foreground)]/35" />
            <Input
              placeholder="Nom, email, pseudo..."
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearch();
                }
              }}
              className="h-[45px] rounded-[4px] border-[#141433] bg-[#25254D] pl-10 text-white placeholder:text-[color:var(--foreground)]/35"
            />
          </div>

          <Select
            value={roleId ?? "__ALL__"}
            onValueChange={(value) => {
              const nextRole = value === "__ALL__" ? undefined : value;
              setRoleId(nextRole);
              void getUsers({ page: 1, role: nextRole });
            }}
          >
            <SelectTrigger className="h-[45px] w-full rounded-[4px] border-[#141433] bg-[#25254D] text-white sm:w-[200px]">
              <SelectValue placeholder="Tous les roles" />
            </SelectTrigger>
            <SelectContent className="border-[#141433] bg-[#25254D] text-white">
              <SelectItem value="__ALL__">Tous les roles</SelectItem>
              {roleOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="h-[45px] rounded-[4px] bg-[#2596FF] px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#2976E8]"
            >
              {loading ? "..." : "Rechercher"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={loading}
              className="h-[45px] rounded-[4px] border-[#141433] bg-[#25254D] px-4 text-white hover:bg-[#303060]"
            >
              Vider
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--foreground)]/55">
          <span>{total} utilisateur(s)</span>
          <span>-</span>
          <span>page {page}/{pageCount}</span>
        </div>
      </div>

      {/* User list */}
      {items.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-[4px] border border-dashed border-[#141433] p-8 text-center">
          <p className="font-bold text-white">Aucun utilisateur trouve.</p>
          <p className="text-sm text-[color:var(--foreground)]/55">Essaie une recherche plus large ou retire le filtre.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((user) => {
            const currentRoleId = typeof user.role === "object" ? (user.role as { id?: string })?.id : user.role;
            const selectedRole = selectedRoles[user.id] ?? (currentRoleId ? String(currentRoleId) : undefined);
            const isSaving = savingId === user.id;
            const isBanBusy = banLoadingId === user.id;
            const isDeleteBusy = deleteLoadingId === user.id;
            const isSuspended = String(user.status || "").toLowerCase() === "suspended";
            const displayRole =
              (user._roleName && user._roleName.trim()) ||
              (typeof user.role === "object" ? ((user.role as { name?: string }).name || "") : "") ||
              "Sans role";

            return (
              <article
                key={user.id}
                className="rounded-[4px] border border-[#141433] bg-[#1F1F3E] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {/* User info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{formatFullName(user)}</h3>
                      <Badge className={isSuspended ? "border-0 bg-red-500/20 text-red-400" : "border-0 bg-green-500/20 text-green-400"}>
                        {isSuspended ? "Suspendu" : "Actif"}
                      </Badge>
                      {user._flags?.isFounder && (
                        <Badge className="border-0 bg-[#FFC800]/15 text-[#FFC800]">Fondateur</Badge>
                      )}
                      {user._flags?.isAdmin && !user._flags?.isFounder && (
                        <Badge className="border-0 bg-[#2596FF]/15 text-[#2596FF]">Admin</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--foreground)]/55">
                      {user.email || "Email non renseigne"} - {displayRole}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={selectedRole}
                      onValueChange={async (value) => {
                        setSelectedRoles((current) => ({ ...current, [user.id]: value }));
                        await onSaveRole(user.id, value);
                      }}
                      disabled={isSaving}
                    >
                      <SelectTrigger className="h-[36px] w-[160px] rounded-[4px] border-[#141433] bg-[#25254D] text-xs text-white">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent className="border-[#141433] bg-[#25254D] text-white">
                        {roleOptions.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <UserHistoryModal userId={user.id} userName={formatFullName(user)} />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleBan(user, !isSuspended)}
                      disabled={isBanBusy}
                      className="h-[36px] rounded-[4px] border-[#141433] bg-[#25254D] text-xs text-white hover:bg-[#303060]"
                    >
                      {isSuspended ? <RotateCcw className="mr-1 h-3 w-3" /> : <Ban className="mr-1 h-3 w-3" />}
                      {isSuspended ? "Reactiver" : "Bannir"}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleDeleteUser(user)}
                      disabled={isDeleteBusy}
                      className="h-[36px] rounded-[4px] bg-red-500 text-xs text-white hover:bg-red-600"
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-4 py-3 text-sm text-[color:var(--foreground)]/55">
        <span>{loading ? "Chargement..." : `${total} resultat(s)`}</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={page <= 1 || loading}
            onClick={() => void getUsers({ page: Math.max(1, page - 1) })}
            className="h-[36px] w-[36px] rounded-[4px] border-[#141433] bg-[#25254D] text-white hover:bg-[#303060]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[60px] text-center text-xs">{page}/{pageCount}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={loading || items.length === 0 || items.length < LIMIT}
            onClick={() => void getUsers({ page: page + 1 })}
            className="h-[36px] w-[36px] rounded-[4px] border-[#141433] bg-[#25254D] text-white hover:bg-[#303060]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatFullName(user: User) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return fullName || user.email || `Utilisateur ${user.id}`;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Coins,
  History,
  Pencil,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import UserHistoryModal from "@/components/admin/UserHistoryModal";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Role = { id: string; name: string; admin_access?: boolean };

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

type ConfirmState = {
  type: "ban" | "unban" | "delete" | "role";
  user: User;
  roleId?: string;
  roleName?: string;
} | null;

const LIMIT = 10;

/* ------------------------------------------------------------------ */
/*  Role badge colors                                                  */
/* ------------------------------------------------------------------ */

function getRoleBadge(roleName: string): { bg: string; text: string } {
  const n = roleName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (n.includes("fondateur") || n.includes("founder")) return { bg: "bg-[#FFC800]/20", text: "text-[#FFC800]" };
  if (n.includes("admin")) return { bg: "bg-[#F92330]/20", text: "text-[#F92330]" };
  if (n.includes("editeur") || n.includes("editor")) return { bg: "bg-[#2596FF]/20", text: "text-[#2596FF]" };
  if (n.includes("moderateur") || n.includes("moderator")) return { bg: "bg-[#9B59B6]/20", text: "text-[#9B59B6]" };
  return { bg: "bg-white/10", text: "text-[#BEBECE]" };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

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
  const [coinsModal, setCoinsModal] = useState<{ userId: string; userName: string } | null>(null);
  const [coinsAmount, setCoinsAmount] = useState("");
  const [coinsSending, setCoinsSending] = useState(false);
  const [q, setQ] = useState("");
  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  /* ── Fetch roles ── */
  useEffect(() => {
    fetch("/api/admin/roles/list", { cache: "no-store" })
      .then((r) => r.json())
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

  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id, label: r.name })), [roles]);
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));

  /* ── Computed stats ── */
  const statsFromItems = useMemo(() => {
    let actifs = 0;
    let bannis = 0;
    let inactifs = 0;
    for (const u of items) {
      const s = String(u.status || "").toLowerCase();
      if (s === "suspended") bannis++;
      else if (s === "inactive" || s === "draft") inactifs++;
      else actifs++;
    }
    return { actifs, bannis, inactifs };
  }, [items]);

  /* ── Fetch users ── */
  const getUsers = async ({
    page: targetPage = page,
    query = q,
    role = roleId,
    status = statusFilter,
  }: {
    page?: number;
    query?: string;
    role?: string;
    status?: string;
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
          status: status || undefined,
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
          const wA = a._flags?.isFounder ? 0 : a._flags?.isAdmin ? 1 : 2;
          const wB = b._flags?.isFounder ? 0 : b._flags?.isAdmin ? 1 : 2;
          return wA - wB;
        });

      setItems(decorated);

      const nextRoles: Record<string, string> = {};
      for (const user of rows) {
        const rv = typeof user.role === "object" ? (user.role as { id?: string })?.id : user.role;
        if (rv) nextRoles[user.id] = String(rv);
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

  /* ── Actions ── */

  const onSaveRole = async (userId: string, nextRoleId: string) => {
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
        toast.error(json?.error || "Échec de la mise à jour du rôle");
        return;
      }
      const roleName = roles.find((r) => r.id === nextRoleId)?.name || nextRoleId;
      toast.success(`Rôle changé en "${roleName}"`);
      await getUsers();
    } catch {
      toast.error("Impossible de mettre à jour le rôle");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleBan = async (user: User, ban: boolean) => {
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
        toast.error(json?.error || "Impossible de mettre à jour le statut");
        return;
      }
      toast.success(ban ? `${formatFullName(user)} a été banni` : `${formatFullName(user)} a été réactivé`);
      await getUsers();
    } catch {
      toast.error("Impossible de mettre à jour le statut");
    } finally {
      setBanLoadingId(null);
    }
  };

  const handleDeleteUser = async (user: User) => {
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
      toast.success(`${formatFullName(user)} a été supprimé`);
      await getUsers();
    } catch {
      toast.error("Suppression impossible");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleSendCoins = async () => {
    if (!coinsModal) return;
    const amount = parseInt(coinsAmount, 10);
    if (!amount || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }
    setCoinsSending(true);
    try {
      const res = await fetch("/api/admin/users/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: coinsModal.userId, amount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Échec");
      toast.success(`${amount} HabbOneCoins envoyés à ${json?.nick || coinsModal.userName} (solde : ${json?.newBalance})`);
      setCoinsModal(null);
      setCoinsAmount("");
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    } finally {
      setCoinsSending(false);
    }
  };

  /* ── Confirm dialog handler ── */
  const executeConfirm = async () => {
    if (!confirmState) return;
    const { type, user, roleId: newRoleId } = confirmState;
    setConfirmState(null);

    if (type === "ban") await handleToggleBan(user, true);
    else if (type === "unban") await handleToggleBan(user, false);
    else if (type === "delete") await handleDeleteUser(user);
    else if (type === "role" && newRoleId) await onSaveRole(user.id, newRoleId);
  };

  const handleSearch = () => void getUsers({ page: 1 });

  /* ── Confirm dialog content ── */
  const confirmDialogProps = useMemo(() => {
    if (!confirmState) return null;
    const name = formatFullName(confirmState.user);
    switch (confirmState.type) {
      case "ban":
        return {
          title: "Bannir cet utilisateur ?",
          description: `${name} ne pourra plus se connecter ni accéder au site. Cette action est réversible.`,
          confirmLabel: "Bannir",
          variant: "danger" as const,
          icon: <Ban className="h-5 w-5" />,
        };
      case "unban":
        return {
          title: "Réactiver cet utilisateur ?",
          description: `${name} pourra à nouveau se connecter et accéder au site.`,
          confirmLabel: "Réactiver",
          variant: "default" as const,
          icon: <RotateCcw className="h-5 w-5" />,
        };
      case "delete":
        return {
          title: "Supprimer définitivement ?",
          description: `${name} sera supprimé de façon irréversible. Ses contenus resteront mais ne seront plus liés à son compte.`,
          confirmLabel: "Supprimer",
          variant: "danger" as const,
          icon: <Trash2 className="h-5 w-5" />,
        };
      case "role":
        return {
          title: "Changer le rôle ?",
          description: `Le rôle de ${name} sera changé en "${confirmState.roleName || "nouveau rôle"}". Les permissions seront mises à jour immédiatement.`,
          confirmLabel: "Changer le rôle",
          variant: "warning" as const,
          icon: <Shield className="h-5 w-5" />,
        };
      default:
        return null;
    }
  }, [confirmState]);

  /* ── Role change handler for select ── */
  const handleRoleChange = (user: User, newRoleId: string) => {
    setSelectedRoles((c) => ({ ...c, [user.id]: newRoleId }));
    const roleName = roles.find((r) => r.id === newRoleId)?.name || newRoleId;
    setConfirmState({ type: "role", user, roleId: newRoleId, roleName });
  };

  return (
    <div className="space-y-5">
      {/* ── Mini stat cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStatCard value={total} label="Total des membres" color="bg-[#2596FF]" />
        <MiniStatCard value={statsFromItems.actifs} label="Actifs" color="bg-[#0FD52F]" />
        <MiniStatCard value={statsFromItems.bannis} label="Bannis" color="bg-[#F92330]" />
        <MiniStatCard value={statsFromItems.inactifs} label="Inactifs" color="bg-[#FFC800]" />
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#BEBECE]/40" />
          <input
            type="text"
            placeholder="Rechercher par pseudo ou email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            className="h-[42px] w-full rounded-[6px] border border-white/5 bg-[#141433]/50 pl-10 pr-4 text-[13px] text-white placeholder:text-[#BEBECE]/30 focus:border-[#2596FF]/40 focus:outline-none"
          />
        </div>

        {/* Role filter */}
        <select
          value={roleId ?? ""}
          onChange={(e) => {
            const next = e.target.value || undefined;
            setRoleId(next);
            void getUsers({ page: 1, role: next });
          }}
          className="h-[42px] rounded-[6px] border border-white/5 bg-[#141433]/50 px-3 text-[13px] text-[#BEBECE] focus:border-[#2596FF]/40 focus:outline-none sm:w-[170px]"
        >
          <option value="">Tous les rôles</option>
          {roleOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter ?? ""}
          onChange={(e) => {
            const next = e.target.value || undefined;
            setStatusFilter(next);
            void getUsers({ page: 1, status: next });
          }}
          className="h-[42px] rounded-[6px] border border-white/5 bg-[#141433]/50 px-3 text-[13px] text-[#BEBECE] focus:border-[#2596FF]/40 focus:outline-none sm:w-[170px]"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="suspended">Banni</option>
          <option value="inactive">Inactif</option>
        </select>

        <span className="shrink-0 text-[12px] text-[#BEBECE]/40">
          {total} utilisateur{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table ── */}
      {loading && items.length === 0 ? (
        <div className="py-12 text-center text-[13px] text-[#BEBECE]/40">Chargement...</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed border-white/10 bg-[#141433]/30 p-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-[#BEBECE]/30">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-[14px] font-semibold text-white">Aucun utilisateur trouvé</p>
          <p className="max-w-sm text-[12px] text-[#BEBECE]/40">
            Essaie une recherche plus large ou retire les filtres.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[8px] border border-white/5">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              <tr className="border-b border-white/5 bg-[#141433]/50">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/50">Utilisateur</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/50">Email</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/50">Rôle</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/50">Statut</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((user) => {
                const isSuspended = String(user.status || "").toLowerCase() === "suspended";
                const isInactive = String(user.status || "").toLowerCase() === "inactive" || String(user.status || "").toLowerCase() === "draft";
                const displayRole = (user._roleName && user._roleName.trim()) || (typeof user.role === "object" ? ((user.role as { name?: string }).name || "") : "") || "Membre";
                const roleBadge = getRoleBadge(displayRole);
                const initials = getInitials(user);

                return (
                  <tr
                    key={user.id}
                    className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                  >
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2596FF]/20 text-[11px] font-bold uppercase text-[#2596FF]">
                          {initials}
                        </div>
                        <span className="text-[13px] font-semibold text-white">
                          {formatFullName(user)}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-[13px] text-[#BEBECE]/60">
                      {user.email || "—"}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${roleBadge.bg} ${roleBadge.text}`}>
                        {displayRole}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {isSuspended ? (
                        <span className="text-[11px] font-bold uppercase text-[#F92330]">Banni</span>
                      ) : isInactive ? (
                        <span className="text-[11px] font-bold uppercase text-[#FFC800]">Inactif</span>
                      ) : (
                        <span className="text-[11px] font-bold uppercase text-[#0FD52F]">Actif</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit role */}
                        <div className="relative group">
                          <select
                            value={selectedRoles[user.id] ?? ""}
                            onChange={(e) => {
                              if (e.target.value) handleRoleChange(user, e.target.value);
                            }}
                            disabled={savingId === user.id}
                            className="h-[30px] w-[30px] cursor-pointer appearance-none rounded-[4px] bg-transparent text-transparent opacity-0 absolute inset-0 z-10"
                            title="Changer le rôle"
                          >
                            <option value="">—</option>
                            {roleOptions.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="grid h-[30px] w-[30px] place-items-center rounded-[4px] text-[#BEBECE]/50 transition-colors hover:bg-white/5 hover:text-[#2596FF]"
                            title="Changer le rôle"
                            tabIndex={-1}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Ban / Unban */}
                        <button
                          type="button"
                          onClick={() => setConfirmState({ type: isSuspended ? "unban" : "ban", user })}
                          disabled={banLoadingId === user.id}
                          className={`grid h-[30px] w-[30px] place-items-center rounded-[4px] transition-colors hover:bg-white/5 ${
                            isSuspended
                              ? "text-[#0FD52F]/60 hover:text-[#0FD52F]"
                              : "text-[#BEBECE]/50 hover:text-[#FFC800]"
                          }`}
                          title={isSuspended ? "Réactiver" : "Bannir"}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setConfirmState({ type: "delete", user })}
                          disabled={deleteLoadingId === user.id}
                          className="grid h-[30px] w-[30px] place-items-center rounded-[4px] text-[#BEBECE]/50 transition-colors hover:bg-red-500/10 hover:text-[#F92330]"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {items.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#BEBECE]/40">
            Affichage de {items.length} sur {total} utilisateur{total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void getUsers({ page: Math.max(1, page - 1) })}
              className="grid h-[32px] w-[32px] place-items-center rounded-[4px] text-[#BEBECE]/50 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
              let pageNum: number;
              if (pageCount <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= pageCount - 2) {
                pageNum = pageCount - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => void getUsers({ page: pageNum })}
                  disabled={loading}
                  className={`grid h-[32px] w-[32px] place-items-center rounded-[4px] text-[12px] font-bold transition-colors ${
                    pageNum === page
                      ? "bg-[#2596FF] text-white"
                      : "text-[#BEBECE]/50 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={loading || items.length === 0 || items.length < LIMIT}
              onClick={() => void getUsers({ page: page + 1 })}
              className="grid h-[32px] w-[32px] place-items-center rounded-[4px] text-[#BEBECE]/50 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Coins Modal ── */}
      {coinsModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setCoinsModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-[400px] rounded-[8px] border border-white/5 bg-[#1A1A3A] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setCoinsModal(null);
            }}
          >
            <h3 className="text-[16px] font-bold text-white">Envoyer des HabbOneCoins</h3>
            <p className="mt-1 text-[13px] text-[#BEBECE]/60">
              Destinataire : <span className="font-bold text-[#2596FF]">{coinsModal.userName}</span>
            </p>

            <div className="mt-4">
              <label className="mb-1 block text-[11px] font-bold uppercase text-[#BEBECE]/50">Montant</label>
              <input
                type="number"
                min={1}
                max={100000}
                value={coinsAmount}
                onChange={(e) => setCoinsAmount(e.target.value)}
                placeholder="Ex : 500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendCoins();
                  if (e.key === "Escape") setCoinsModal(null);
                }}
                className="w-full rounded-[6px] border border-white/5 bg-[#141433]/50 px-3 py-2.5 text-[14px] text-white placeholder:text-[#BEBECE]/30 focus:border-[#FFC800]/40 focus:outline-none"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[10, 50, 100, 500, 1000].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setCoinsAmount(String(a))}
                  className="rounded-[4px] bg-white/5 px-3 py-1.5 text-[12px] font-bold text-[#FFC800] transition hover:bg-white/10"
                >
                  +{a}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCoinsModal(null)}
                className="h-[36px] rounded-[6px] border border-white/5 bg-[#141433]/50 px-4 text-[13px] font-bold text-white transition-colors hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSendCoins}
                disabled={coinsSending || !coinsAmount || parseInt(coinsAmount, 10) <= 0}
                className="h-[36px] rounded-[6px] bg-[#FFC800] px-4 text-[13px] font-bold text-black transition-colors hover:bg-[#E6B400] disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5" />
                  {coinsSending ? "Envoi..." : "Envoyer"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Dialog ── */}
      {confirmDialogProps && (
        <ConfirmDialog
          open={!!confirmState}
          onConfirm={executeConfirm}
          onCancel={() => setConfirmState(null)}
          loading={
            (confirmState?.type === "ban" || confirmState?.type === "unban"
              ? banLoadingId
              : confirmState?.type === "delete"
                ? deleteLoadingId
                : savingId) === confirmState?.user.id
          }
          {...confirmDialogProps}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MiniStatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[8px] border border-white/5 bg-[#141433]/50 px-4 py-3.5">
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-[6px] ${color} text-[13px] font-bold text-white`}>
        {value}
      </div>
      <span className="text-[13px] text-[#BEBECE]/60">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatFullName(user: User) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return fullName || user.email || `Utilisateur ${user.id}`;
}

function getInitials(user: User): string {
  const name = formatFullName(user);
  const parts = name.split(/[\s@]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.charAt(0).toUpperCase();
}

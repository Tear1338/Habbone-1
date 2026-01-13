import 'server-only';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getDirectusUserById } from '@/server/directus/admin-users';
import { getRoleById, listRoles } from '@/server/directus/roles';

export type AdminAssertion = { userId: string | null };

export async function assertAdmin(): Promise<AdminAssertion> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const err: any = new Error('UNAUTHORIZED');
    err.status = 401;
    throw err;
  }
  const sessionUser = session.user as any;
  const role = sessionUser?.role;
  if (role !== 'admin') {
    const err: any = new Error('FORBIDDEN');
    err.status = 403;
    throw err;
  }

  const forbid = () => {
    const err: any = new Error('FORBIDDEN');
    err.status = 403;
    throw err;
  };

  const directusAdminAccess = sessionUser?.directusAdminAccess;
  if (directusAdminAccess === false) {
    forbid();
  }

  const directusRoleId = sessionUser?.directusRoleId;
  const directusRoleName = typeof sessionUser?.directusRoleName === 'string' ? sessionUser.directusRoleName : null;

  if (directusRoleId) {
    try {
      const roleRow = await getRoleById(String(directusRoleId));
      if (!roleRow) {
        if (directusAdminAccess !== true) forbid();
      } else if (roleRow.admin_access !== true) {
        forbid();
      }
    } catch {
      if (directusAdminAccess !== true) forbid();
    }
  } else if (directusRoleName) {
    try {
      const roles = await listRoles();
      const match = roles.find((r) => String(r?.name || '').toLowerCase() === directusRoleName.toLowerCase());
      if (!match) {
        if (directusAdminAccess !== true) forbid();
      } else if (match.admin_access !== true) {
        forbid();
      }
    } catch {
      if (directusAdminAccess !== true) forbid();
    }
  } else if (directusAdminAccess !== true) {
    forbid();
  }

  // If we know a directus user id on session, we can double-check admin_access
  // Not all sessions map to directus_users; tolerate absence.
  const directusId = sessionUser?.directusId || null;
  if (directusId) {
    try {
      const du = await getDirectusUserById(String(directusId));
      if (!du?.role || (typeof du.role === 'object' && (du.role as any).admin_access !== true)) {
        forbid();
      }
    } catch {}
  }

  return { userId: sessionUser?.id ?? null };
}

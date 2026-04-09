import 'server-only';

import { directusUrl, serviceToken, USERS_TABLE } from './client';

// Mapping: role name (lowercase) -> badge emblema ID
const ROLE_BADGE_MAP: Record<string, number> = {
  'fondateur': 5,
  'responsable': 6,
  'animateurs': 7,
  'journaliste': 8,
  'correcteur': 9,
  'configurateur wired': 10,
  'constructeur': 11,
  'graphiste': 12,
  'member': 13,
};

async function userHasBadge(userId: number, badgeId: number): Promise<boolean> {
  const url = new URL(`${directusUrl}/items/emblemas_usuario`);
  url.searchParams.set('filter[id_usuario][_eq]', String(userId));
  url.searchParams.set('filter[id_emblema][_eq]', String(badgeId));
  url.searchParams.set('limit', '1');
  url.searchParams.set('fields', 'id');
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return false;
  const json = await res.json();
  return Array.isArray(json?.data) && json.data.length > 0;
}

async function grantBadge(userId: number, badgeId: number): Promise<void> {
  await fetch(`${directusUrl}/items/emblemas_usuario`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_emblema: badgeId,
      id_usuario: userId,
      autor_tipo: 'ganhado',
      autor: 'system',
      data: Math.floor(Date.now() / 1000),
      status: 'ativo',
    }),
  });
}

/**
 * Ensure a user has the badge corresponding to their role.
 * Also ensures they have the "member" badge.
 * Call this on login or role change.
 */
export async function ensureRoleBadge(userId: number, roleName: string): Promise<void> {
  try {
    const key = roleName.toLowerCase().trim();

    // Always grant member badge
    const memberBadgeId = ROLE_BADGE_MAP['member'];
    if (memberBadgeId && !(await userHasBadge(userId, memberBadgeId))) {
      await grantBadge(userId, memberBadgeId);
    }

    // Grant role-specific badge
    const roleBadgeId = ROLE_BADGE_MAP[key];
    if (roleBadgeId && roleBadgeId !== memberBadgeId && !(await userHasBadge(userId, roleBadgeId))) {
      await grantBadge(userId, roleBadgeId);
    }
  } catch {
    // Non-blocking: badge assignment failure should not break login/role change
  }
}

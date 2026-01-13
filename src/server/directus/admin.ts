import 'server-only';

import { directusUrl, serviceToken, USERS_TABLE } from './client';

export async function adminCount(table: string): Promise<number> {
  const url = `${directusUrl}/items/${encodeURIComponent(table)}?limit=0&meta=total_count`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  }).catch(() => null as any);
  if (!res || !res.ok) return 0;
  try {
    const json = await res.json();
    const n = Number((json as any)?.meta?.total_count ?? 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function adminCountUsers(): Promise<number> {
  return adminCount(USERS_TABLE);
}

import 'server-only';

import { directusUrl, serviceToken } from './client';

/**
 * Authenticated fetch to the Directus REST API.
 * Replaces ~24 manual fetch() calls across service files.
 *
 * Usage:
 * ```ts
 * const data = await directusFetch<{ data: MyType[] }>('/items/my_table?limit=10');
 * ```
 */
export async function directusFetch<T = any>(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    params?: Record<string, string>;
  },
): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : `${directusUrl}${path}`);

  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${serviceToken}`,
  };

  const fetchOptions: RequestInit = {
    method: options?.method || 'GET',
    headers,
    cache: 'no-store',
  };

  if (options?.body) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url.toString(), fetchOptions);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Directus ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Shorthand to count items via Directus meta.
 */
export async function directusCount(
  collection: string,
  filter?: Record<string, string>,
): Promise<number> {
  const url = new URL(`${directusUrl}/items/${encodeURIComponent(collection)}`);
  url.searchParams.set('limit', '0');
  url.searchParams.set('meta', 'total_count');

  if (filter) {
    for (const [key, value] of Object.entries(filter)) {
      url.searchParams.set(key, value);
    }
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return 0;
    const json = await res.json();
    return Number(json?.meta?.total_count ?? 0);
  } catch {
    return 0;
  }
}

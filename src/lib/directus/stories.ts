import { readItems } from '@directus/sdk';

import { directus } from './client';
import { resolveStoriesTables } from './tables';
import type { StoryRow } from './types';

export async function listStories(limit = 30): Promise<StoryRow[]> {
  for (const col of resolveStoriesTables()) {
    try {
      const rows = (await directus.request(
        readItems(col as string, {
          fields: ['id', 'autor', 'image', 'dta', 'data', 'status'],
          sort: ['-dta', '-data'],
          limit,
        })
      )) as StoryRow[];
      if (Array.isArray(rows) && rows.length) return rows;
    } catch {}
  }
  return [] as StoryRow[];
}

export type { StoryRow } from './types';

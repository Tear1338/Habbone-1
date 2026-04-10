import 'server-only';

import { revalidateTag, revalidatePath } from 'next/cache';

/**
 * Server-side: directly call revalidateTag for each tag.
 * Use this in API route handlers and server actions.
 */
export function serverRevalidate(tags: string[], paths?: string[]) {
  for (const tag of tags) {
    revalidateTag(tag);
  }
  if (paths) {
    for (const p of paths) {
      revalidatePath(p);
    }
  }
}

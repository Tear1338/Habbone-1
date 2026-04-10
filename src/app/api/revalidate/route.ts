import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { assertAdmin } from '@/server/authz';

export const dynamic = 'force-dynamic';

/**
 * POST /api/revalidate
 * On-demand revalidation endpoint.
 * Auth: admin session cookie OR REVALIDATION_SECRET.
 * Body: { tags?: string[], paths?: string[] }
 */
export async function POST(req: Request) {
  // Auth: either admin session or secret token
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const secret = body.secret as string | undefined;
  const envSecret = process.env.REVALIDATION_SECRET;

  if (secret && envSecret && secret === envSecret) {
    // Authenticated via secret — OK
  } else {
    // Authenticate via admin session
    try {
      await assertAdmin();
    } catch {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
  }

  const tags: string[] = Array.isArray(body.tags) ? body.tags : [];
  const paths: string[] = Array.isArray(body.paths) ? body.paths : [];

  if (tags.length === 0 && paths.length === 0) {
    return NextResponse.json({ error: 'No tags or paths provided' }, { status: 400 });
  }

  for (const tag of tags) {
    if (typeof tag === 'string') revalidateTag(tag);
  }
  for (const p of paths) {
    if (typeof p === 'string') revalidatePath(p);
  }

  return NextResponse.json({
    ok: true,
    revalidated: { tags, paths },
  });
}

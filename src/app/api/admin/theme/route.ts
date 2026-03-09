import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdmin } from '@/server/authz';
import { readThemeSettings, writeThemeSettings } from '@/server/theme-settings-store';

const Body = z.object({
  headerLogoUrl: z.string().trim().max(512).optional(),
  headerBackgroundColor: z.string().trim().max(16).optional(),
  headerBackgroundImageUrl: z.string().trim().max(512).nullable().optional(),
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await assertAdmin();
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'FORBIDDEN', code: 'FORBIDDEN' },
      { status: error?.status || 403 },
    );
  }

  const data = await readThemeSettings();
  return NextResponse.json(
    { data },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

export async function POST(req: Request) {
  try {
    await assertAdmin();
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'FORBIDDEN', code: 'FORBIDDEN' },
      { status: error?.status || 403 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', code: 'INVALID_BODY' }, { status: 400 });
  }

  const data = await writeThemeSettings(parsed.data);
  return NextResponse.json({ data });
}

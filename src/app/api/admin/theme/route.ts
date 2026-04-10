import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { assertAdmin } from '@/server/authz';
import { readThemeSettings, writeThemeSettings } from '@/server/theme-settings-store';

const Body = z.object({
  headerLogoUrl: z.string().trim().max(512).optional(),
  headerBackgroundColor: z.string().trim().max(16).optional(),
  headerBackgroundImageUrl: z.string().trim().max(512).nullable().optional(),
  showLogo: z.boolean().optional(),
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

  try {
    const data = await readThemeSettings();
    return NextResponse.json(
      { data },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'THEME_READ_FAILED', code: 'THEME_READ_FAILED' },
      { status: 500 },
    );
  }
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

  try {
    const data = await writeThemeSettings(parsed.data);
    revalidateTag('theme');
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'THEME_WRITE_FAILED', code: 'THEME_WRITE_FAILED' },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { readThemeSettings } from '@/server/theme-settings-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
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

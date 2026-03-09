import { NextResponse } from 'next/server';
import { readThemeSettings } from '@/server/theme-settings-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
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
      { data: null, error: error?.message || 'THEME_READ_FAILED', code: 'THEME_READ_FAILED' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}

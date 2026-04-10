import { NextResponse } from 'next/server';
import { listShopItems } from '@/server/directus/shop';

// Force dynamic — never cache this route (items change when admin adds/edits)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await listShopItems(true); // only active items
    return NextResponse.json({ ok: true, data: items });
  } catch (e: any) {
    console.error('[Shop Items API] Error:', e?.message || e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

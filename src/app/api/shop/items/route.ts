import { NextResponse } from 'next/server';
import { listShopItems } from '@/server/directus/shop';

export async function GET() {
  try {
    const items = await listShopItems(true); // only active items
    return NextResponse.json({ ok: true, data: items });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

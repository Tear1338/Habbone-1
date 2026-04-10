import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/auth';
import { checkRateLimit } from '@/server/rate-limit';
import { purchaseItem } from '@/server/directus/shop';

const BodySchema = z.object({
  itemId: z.number().int().min(1),
});

export async function POST(req: Request) {
  // Rate limit: 10 purchases per minute
  const rl = checkRateLimit(req, { key: 'shop:buy', limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Trop de requêtes, réessaie dans un instant' }, { status: 429, headers: rl.headers });
  }

  // Auth
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id;
  const userNick = (session as any)?.user?.nick || '';
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // Parse body
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
  }

  // Execute purchase
  const result = await purchaseItem(Number(userId), userNick, parsed.data.itemId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Erreur' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    order: result.order,
    message: 'Achat effectué ! L\'admin va te livrer le mobi.',
  });
}

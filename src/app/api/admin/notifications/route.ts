import { NextResponse } from 'next/server';
import { assertAdmin } from '@/server/authz';
import {
  listAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  countUnreadNotifications,
} from '@/server/directus/shop';

export async function GET() {
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const [notifications, unreadCount] = await Promise.all([
    listAdminNotifications({ limit: 30 }),
    countUnreadNotifications(),
  ]);

  return NextResponse.json({ ok: true, data: notifications, unreadCount });
}

export async function POST(req: Request) {
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { action } = body || {};

  if (action === 'read') {
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    await markNotificationRead(id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'read_all') {
    await markAllNotificationsRead();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

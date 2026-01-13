import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdmin } from '@/server/authz';
import { setAdminUserRole } from '@/server/services/admin-users';

const Body = z.object({ userId: z.string().min(1), roleId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    await assertAdmin();
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'FORBIDDEN', code: 'FORBIDDEN' }, { status: e?.status || 403 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', code: 'INVALID_BODY' }, { status: 400 });
  }

  const { userId, roleId } = parsed.data;
  try {
    const result = await setAdminUserRole(userId, roleId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    }
    return NextResponse.json({ data: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'SET_ROLE_FAILED', code: 'SET_ROLE_FAILED' }, { status: 500 });
  }
}

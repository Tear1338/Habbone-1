import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdmin } from '@/server/api-helpers';
import { deleteAdminUser } from '@/server/services/admin-users';

const BodySchema = z.object({
  userId: z.string().min(1),
});

export const POST = withAdmin(async (req) => {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', code: 'INVALID_BODY' }, { status: 400 });
  }

  const { userId } = parsed.data;

  try {
    const result = await deleteAdminUser(userId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    }
    return NextResponse.json({ data: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'DELETE_ACTION_FAILED', code: 'DELETE_ACTION_FAILED' }, { status: 500 });
  }
}, { key: 'admin:users:delete', limit: 10, windowMs: 60_000 });

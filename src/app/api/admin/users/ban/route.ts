import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdmin } from '@/server/api-helpers';
import { banAdminUser } from '@/server/services/admin-users';

const BodySchema = z.object({
  userId: z.string().min(1),
  ban: z.boolean(),
});

export const POST = withAdmin(async (req) => {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', code: 'INVALID_BODY' }, { status: 400 });
  }

  const { userId, ban } = parsed.data;

  try {
    const result = await banAdminUser(userId, ban);
    if ('error' in result) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    }
    return NextResponse.json({ data: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'BAN_ACTION_FAILED', code: 'BAN_ACTION_FAILED' }, { status: 500 });
  }
}, { key: 'admin:users:ban', limit: 20, windowMs: 60_000 });

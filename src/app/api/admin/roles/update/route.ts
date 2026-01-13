import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdmin } from '@/server/authz';
import { updateRole } from '@/server/directus/roles';
import { resolveHttpError } from '@/lib/http-error';

const Body = z.object({
  roleId: z.string().min(1),
  name: z.string().optional(),
  description: z.string().optional(),
  adminAccess: z.boolean().optional(),
  appAccess: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    await assertAdmin();
  } catch (error: unknown) {
    const { message, status, code } = resolveHttpError(error, 'FORBIDDEN', 403);
    return NextResponse.json({ error: message, code: code ?? 'FORBIDDEN' }, { status });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', code: 'INVALID_BODY' }, { status: 400 });
  }
  try {
    const { roleId, ...patch } = parsed.data;
    const row = await updateRole(roleId, patch);
    return NextResponse.json({ data: row });
  } catch (error: unknown) {
    const { message, status, code } = resolveHttpError(error, 'UPDATE_ROLE_FAILED', 500);
    return NextResponse.json({ error: message, code: code ?? 'UPDATE_ROLE_FAILED' }, { status });
  }
}

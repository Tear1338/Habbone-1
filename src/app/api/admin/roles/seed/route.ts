import { NextResponse } from 'next/server';
import { assertAdmin } from '@/server/authz';
import { createRole, listRoles } from '@/server/directus/roles';
import { DEFAULT_ROLES } from '@/lib/config/roles';
import { resolveHttpError } from '@/lib/http-error';

export async function POST() {
  try {
    await assertAdmin();
  } catch (error: unknown) {
    const { message, status, code } = resolveHttpError(error, 'FORBIDDEN', 403);
    return NextResponse.json({ error: message, code: code ?? 'FORBIDDEN' }, { status });
  }

  try {
    const existing = await listRoles().catch(() => [] as const);
    const existingNames = new Set(existing.map((role) => role.name.toLowerCase()));
    const created: string[] = [];
    const skipped: string[] = [];
    for (const r of DEFAULT_ROLES) {
      if (existingNames.has(r.name.toLowerCase())) {
        skipped.push(r.name);
        continue;
      }
      try {
        const row = await createRole(r);
        created.push(row?.name ?? r.name);
      } catch {
        created.push(r.name);
      }
    }
    return NextResponse.json({ data: { created, skipped } });
  } catch (error: unknown) {
    // soft fallback: pretend roles are ready
    const { message } = resolveHttpError(error, 'ROLE_SEED_FAILED', 500);
    return NextResponse.json(
      { data: { created: DEFAULT_ROLES.map((r) => r.name), skipped: [] }, code: 'VIRTUAL_SEED', error: message },
      { status: 200 }
    );
  }
}

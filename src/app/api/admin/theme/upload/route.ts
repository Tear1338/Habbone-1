import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { assertAdmin } from '@/server/authz';
import { directusUrl } from '@/server/directus/client';
import { uploadFileToDirectus } from '@/server/directus/stories';
import { isThemeStoredInDirectus, themeUploadDir, writeThemeSettings } from '@/server/theme-settings-store';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);
const TARGETS = new Set(['logo', 'background']);

export const runtime = 'nodejs';

function extensionFromFile(file: File): string {
  const mimeType = (file.type || '').toLowerCase();
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'image/svg+xml') return 'svg';
  const ext = path.extname(file.name || '').replace('.', '').toLowerCase();
  if (ext) return ext;
  return 'png';
}

async function uploadToLocalPublicDir(file: File, target: string): Promise<string> {
  const ext = extensionFromFile(file);
  const fileName = `${target}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await mkdir(themeUploadDir, { recursive: true });
  await writeFile(path.join(themeUploadDir, fileName), bytes);
  return `/uploads/theme/${fileName}`;
}

async function uploadToDirectusAssets(file: File): Promise<string> {
  const fallbackExt = extensionFromFile(file);
  const sourceName = (file.name || '').trim();
  const filename = sourceName || `theme-${Date.now()}.${fallbackExt}`;
  const uploaded = await uploadFileToDirectus(file, filename, file.type || 'application/octet-stream');
  const id = String(uploaded?.id || '').trim();
  if (!id) throw new Error('DIRECTUS_UPLOAD_NO_ID');
  return `${directusUrl}/assets/${encodeURIComponent(id)}`;
}

export async function POST(req: Request) {
  try {
    await assertAdmin();
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'FORBIDDEN', code: 'FORBIDDEN' },
      { status: error?.status || 403 },
    );
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'INVALID_FORM_DATA', code: 'INVALID_FORM_DATA' }, { status: 400 });
  }

  const target = String(formData.get('target') || '').toLowerCase();
  const file = formData.get('file');
  if (!TARGETS.has(target)) {
    return NextResponse.json({ error: 'INVALID_TARGET', code: 'INVALID_TARGET' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'FILE_REQUIRED', code: 'FILE_REQUIRED' }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'INVALID_FILE_SIZE', code: 'INVALID_FILE_SIZE' }, { status: 400 });
  }

  const mimeType = (file.type || '').toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json({ error: 'UNSUPPORTED_FILE_TYPE', code: 'UNSUPPORTED_FILE_TYPE' }, { status: 400 });
  }

  try {
    const uploadedUrl = isThemeStoredInDirectus()
      ? await uploadToDirectusAssets(file)
      : await uploadToLocalPublicDir(file, target);

    const settings = await writeThemeSettings(
      target === 'logo'
        ? { headerLogoUrl: uploadedUrl }
        : { headerBackgroundImageUrl: uploadedUrl },
    );

    return NextResponse.json({
      data: {
        url: uploadedUrl,
        settings,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'THEME_UPLOAD_FAILED', code: 'THEME_UPLOAD_FAILED' },
      { status: 500 },
    );
  }
}


import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/auth'
import { uploadFileToDirectus, createStoryRow, countStoriesThisMonthByAuthor } from '@/server/directus/stories'
import { checkRateLimit } from '@/server/rate-limit'
import { buildError, formatZodError } from '@/types/api'

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_SET = new Set(['image/png', 'image/jpeg', 'image/gif'])
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB

const StoryUploadSchema = z.object({
  file: z
    .custom<File>((value) => value instanceof File, 'Fichier requis')
    .refine((file) => ALLOWED_MIME_SET.has(file.type), 'Type de fichier invalide (png, jpg, gif uniquement)')
    .refine((file) => file.size <= MAX_FILE_BYTES, 'Fichier trop volumineux (max 10MB)'),
})

export async function POST(req: Request): Promise<NextResponse> {
  try {
    // Limit uploads: 5 uploads / 10 minutes per IP
    const rl = checkRateLimit(req, { key: 'stories:upload', limit: 5, windowMs: 10 * 60 * 1000 })
    if (!rl.ok) {
      return NextResponse.json({ error: 'Trop de requêtes', code: 'RATE_LIMITED' }, { status: 429, headers: rl.headers })
    }

    const session = await getServerSession(authOptions)
    const user = session?.user as { nick?: string | null } | undefined
    const nick = typeof user?.nick === 'string' ? user.nick.trim() : ''
    if (!nick) {
      return NextResponse.json({ error: 'Non authentifié', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const formData = await req.formData().catch(() => null)
    const parsed = StoryUploadSchema.safeParse({ file: formData?.get('file') })
    if (!parsed.success) {
      const fields = formatZodError(parsed.error).fieldErrors
      return NextResponse.json(buildError('Entrées invalides', { code: 'VALIDATION_ERROR', fields }), { status: 400 })
    }

    const file = parsed.data.file

    const used = await countStoriesThisMonthByAuthor(nick).catch(() => 0)
    if (used >= 10) {
      return NextResponse.json(
        { error: 'Quota mensuel atteint (10 stories / mois)', code: 'QUOTA_EXCEEDED' },
        { status: 429 }
      )
    }

    const filename = file.name?.trim() ? file.name.trim() : `story-${Date.now()}`
    const mime = file.type || 'application/octet-stream'

    const upload = await uploadFileToDirectus(file, filename, mime)
    const story = await createStoryRow({ author: nick, imageId: upload.id, title: filename })
    const storyId =
      story && typeof story === 'object' && story !== null ? (story as { id?: unknown }).id : null

    revalidateTag('stories')
    revalidateTag('home')
    return NextResponse.json({ ok: true, id: storyId != null ? String(storyId) : null })
  } catch (unknownError: unknown) {
    const message = unknownError instanceof Error ? unknownError.message : String(unknownError)
    const code = /UPLOAD/.test(message) ? 'UPLOAD_ERROR' : 'SERVER_ERROR'
    const status = code === 'UPLOAD_ERROR' ? 502 : 500
    const payload: { error: string; code: string; detail?: string } = { error: 'Erreur serveur', code }
    if (process.env.NODE_ENV !== 'production') payload.detail = message
    return NextResponse.json(payload, { status })
  }
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import sanitizeHtml from 'sanitize-html'
import { z } from 'zod'
import { createForumComment } from '@/server/directus-service'
import { checkRateLimit } from '@/server/rate-limit'
import { buildError, formatZodError } from '@/types/api'

const BodySchema = z.object({
  content: z.string().trim().min(1, 'Commentaire requis').max(5000, 'Commentaire trop long'),
})

function extractPlainText(html: string) {
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ')
  return stripped.replace(/\s+/g, ' ').trim()
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const topicId = Number(id || 0)
  if (!Number.isFinite(topicId) || topicId <= 0) {
    return NextResponse.json(buildError('Identifiant sujet invalide', { code: 'INVALID_ID' }), { status: 400 })
  }

  // Limit comment posting: 10 comments / 10 minutes per IP
  const rl = checkRateLimit(req, { key: 'forum:comment', limit: 10, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json(
      buildError('Trop de requêtes, réessayez plus tard.', { code: 'RATE_LIMITED' }),
      { status: 429, headers: rl.headers }
    )
  }

  const session = await getServerSession(authOptions)
  const user = session?.user as { nick?: string; email?: string } | undefined
  if (!user?.nick) {
    return NextResponse.json(buildError('Authentification requise', { code: 'UNAUTHORIZED' }), { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json(buildError('Requete invalide', { code: 'INVALID_JSON' }), { status: 400 }) }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(buildError('Corps invalide', { code: 'INVALID_BODY', fields: formatZodError(parsed.error).fieldErrors }), { status: 400 })
  }

  const htmlContent = parsed.data.content
  const sanitizedHtml = sanitizeHtml(htmlContent, {
    allowedTags: ['p','br','strong','em','ul','ol','li','a','span'],
    allowedAttributes: { a: ['href','title','rel'], span: ['class'] },
    allowedSchemes: ['http','https','mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener noreferrer' }) },
  })
  const plain = extractPlainText(sanitizedHtml)
  if (!plain) {
    return NextResponse.json(buildError('Commentaire vide', { code: 'EMPTY_COMMENT' }), { status: 400 })
  }

  try {
    const created = await createForumComment({ topicId, author: String(user.nick), content: sanitizedHtml })
    return NextResponse.json({ ok: true, data: created })
  } catch {
    return NextResponse.json(buildError('Echec de publication', { code: 'CREATE_FAILED' }), { status: 500 })
  }
}

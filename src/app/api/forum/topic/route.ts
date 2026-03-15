import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { createForumTopic } from '@/server/directus/forum'
import { checkRateLimit } from '@/server/rate-limit'

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const rl = checkRateLimit(req, { key: 'forum:topic:create', limit: 5, windowMs: 10 * 60 * 1000 })
    if (!rl.ok) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429, headers: rl.headers })
    }

    const session = await getServerSession(authOptions)
    const user = session?.user as { nick?: string | null } | undefined
    const nick = typeof user?.nick === 'string' ? user.nick.trim() : ''
    if (!nick) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Corps requis' }, { status: 400 })
    }

    const titulo = String(body.titulo || '').trim()
    const conteudo = String(body.conteudo || '').trim()
    const cat_id = body.cat_id ?? null

    if (!titulo || titulo.length < 3) {
      return NextResponse.json({ error: 'Titre trop court (min. 3 caractères)' }, { status: 400 })
    }
    if (!conteudo || conteudo.length < 10) {
      return NextResponse.json({ error: 'Contenu trop court (min. 10 caractères)' }, { status: 400 })
    }

    const topic = await createForumTopic({
      titulo,
      conteudo,
      autor: nick,
      cat_id,
    })

    const id = topic && typeof topic === 'object' ? (topic as any).id : null
    return NextResponse.json({ ok: true, id: id != null ? Number(id) : null })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur serveur', ...(process.env.NODE_ENV !== 'production' ? { detail: message } : {}) },
      { status: 500 }
    )
  }
}

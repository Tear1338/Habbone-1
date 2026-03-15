import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { checkRateLimit } from '@/server/rate-limit'
import { directusUrl, serviceToken } from '@/server/directus/client'

const ALLOWED_MIME_SET = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const rl = checkRateLimit(req, { key: 'upload:image', limit: 20, windowMs: 10 * 60 * 1000 })
    if (!rl.ok) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429, headers: rl.headers })
    }

    const session = await getServerSession(authOptions)
    const user = session?.user as { nick?: string | null } | undefined
    const nick = typeof user?.nick === 'string' ? user.nick.trim() : ''
    if (!nick) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const formData = await req.formData().catch(() => null)
    const file = formData?.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    }

    if (!ALLOWED_MIME_SET.has(file.type)) {
      return NextResponse.json({ error: 'Type de fichier invalide (png, jpg, gif, webp)' }, { status: 400 })
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 5MB)' }, { status: 400 })
    }

    const safeName = file.name?.trim() || `image-${Date.now()}`
    const uploadForm = new FormData()
    uploadForm.set('file', file, safeName)
    uploadForm.set('title', safeName)

    const response = await fetch(`${directusUrl}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceToken}` },
      body: uploadForm,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return NextResponse.json({ error: 'Upload échoué', detail: body }, { status: 502 })
    }

    const json = (await response.json().catch(() => ({}))) as Record<string, any>
    const data = (json?.data ?? json) as Record<string, any>
    const id = data?.id ?? null
    if (!id) {
      return NextResponse.json({ error: 'Upload échoué (pas d\'ID)' }, { status: 502 })
    }

    const imageUrl = `${directusUrl}/assets/${id}`
    return NextResponse.json({ ok: true, url: imageUrl, id: String(id) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur serveur', ...(process.env.NODE_ENV !== 'production' ? { detail: message } : {}) },
      { status: 500 }
    )
  }
}

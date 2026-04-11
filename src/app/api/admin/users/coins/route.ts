import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdmin } from '@/server/api-helpers'
import { directusUrl, serviceToken, USERS_TABLE } from '@/server/directus/client'

const BodySchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().min(1, 'Montant minimum: 1').max(100000, 'Montant maximum: 100 000'),
})

async function getUserById(id: string) {
  const cleanId = id.startsWith('legacy:') ? id.split(':')[1] : id
  const res = await fetch(`${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}/${cleanId}?fields=id,nick,moedas`, {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = await res.json()
  return json?.data ?? null
}

async function updateUserCoins(id: string, newBalance: number) {
  const cleanId = id.startsWith('legacy:') ? id.split(':')[1] : id
  const res = await fetch(`${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}/${cleanId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ moedas: newBalance }),
  })
  if (!res.ok) return null
  const json = await res.json()
  return json?.data ?? null
}

export const POST = withAdmin(async (req) => {
  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || 'Donnees invalides'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { userId, amount } = parsed.data

  const user = await getUserById(userId)
  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  const currentBalance = Number(user.moedas) || 0
  const newBalance = currentBalance + amount

  const updated = await updateUserCoins(userId, newBalance)
  if (!updated) {
    return NextResponse.json({ error: 'Echec de la mise a jour' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    nick: user.nick,
    previous: currentBalance,
    added: amount,
    newBalance,
  })
}, { key: 'admin:users:coins', limit: 30, windowMs: 60_000 })

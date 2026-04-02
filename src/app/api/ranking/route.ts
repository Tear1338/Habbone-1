import { NextResponse } from 'next/server'
import { directusUrl, serviceToken } from '@/server/directus/client'

export const dynamic = 'force-dynamic'

type RankingEntry = { nick: string; score: number }
type RankingCategory = 'comments' | 'articles' | 'topics' | 'coins'
type RankingResponse = Record<RankingCategory, RankingEntry[]>

async function fetchAllAutors(table: string, field = 'autor'): Promise<string[]> {
  const url = new URL(`${directusUrl}/items/${encodeURIComponent(table)}`)
  url.searchParams.set('fields', field)
  url.searchParams.set('limit', '-1')
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const json = await res.json()
  return (json?.data ?? []).map((r: any) => String(r?.[field] || '').trim()).filter(Boolean)
}

async function fetchTopCoins(limit: number): Promise<RankingEntry[]> {
  const url = new URL(`${directusUrl}/items/usuarios`)
  url.searchParams.set('fields', 'nick,moedas')
  url.searchParams.set('sort', '-moedas')
  url.searchParams.set('limit', String(limit))
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const json = await res.json()
  return (json?.data ?? [])
    .filter((r: any) => r?.nick && Number(r?.moedas) > 0)
    .map((r: any) => ({ nick: String(r.nick), score: Number(r.moedas) || 0 }))
}

function countByAutor(autors: string[], limit: number): RankingEntry[] {
  const map = new Map<string, number>()
  for (const nick of autors) {
    // Normalize case: "Decrypt" and "decrypt" count as same
    const key = nick.toLowerCase()
    const display = map.has(key) ? key : nick
    map.set(key, (map.get(key) || 0) + 1)
  }
  // Restore display names (use first seen casing)
  const displayMap = new Map<string, string>()
  for (const nick of autors) {
    const key = nick.toLowerCase()
    if (!displayMap.has(key)) displayMap.set(key, nick)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, score]) => ({ nick: displayMap.get(key) || key, score }))
}

export async function GET() {
  try {
    const TOP = 10
    const [forumComments, newsComments, articles, topics, coins] = await Promise.all([
      fetchAllAutors('forum_coment', 'autor'),
      fetchAllAutors('noticias_coment', 'autor'),
      fetchAllAutors('noticias', 'autor'),
      fetchAllAutors('forum_topicos', 'autor'),
      fetchTopCoins(TOP),
    ])

    // Merge forum + news comments
    const allComments = [...forumComments, ...newsComments]

    const result: RankingResponse = {
      comments: countByAutor(allComments, TOP),
      articles: countByAutor(articles, TOP),
      topics: countByAutor(topics, TOP),
      coins: coins.slice(0, TOP),
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { comments: [], articles: [], topics: [], coins: [] },
      { status: 500 },
    )
  }
}

import { directusUrl, serviceToken } from '@/server/directus/client'
import RankingClient from './ranking-client'

type RankingEntry = { nick: string; score: number }

async function fetchAllAutors(table: string, field = 'autor'): Promise<string[]> {
  const url = new URL(`${directusUrl}/items/${encodeURIComponent(table)}`)
  url.searchParams.set('fields', field)
  url.searchParams.set('limit', '-1')
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${serviceToken}` },
    next: { revalidate: 300 },
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
    next: { revalidate: 300 },
  })
  if (!res.ok) return []
  const json = await res.json()
  return (json?.data ?? [])
    .filter((r: any) => r?.nick && Number(r?.moedas) > 0)
    .map((r: any) => ({ nick: String(r.nick), score: Number(r.moedas) || 0 }))
}

function countByAutor(autors: string[], limit: number): RankingEntry[] {
  const map = new Map<string, number>()
  const displayMap = new Map<string, string>()
  for (const nick of autors) {
    const key = nick.toLowerCase()
    if (!displayMap.has(key)) displayMap.set(key, nick)
    map.set(key, (map.get(key) || 0) + 1)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, score]) => ({ nick: displayMap.get(key) || key, score }))
}

export default async function Ranking() {
  try {
    const [forumComments, newsComments, articles, topics, coins] = await Promise.all([
      fetchAllAutors('forum_coment', 'autor'),
      fetchAllAutors('noticias_coment', 'autor'),
      fetchAllAutors('noticias', 'autor'),
      fetchAllAutors('forum_topicos', 'autor'),
      fetchTopCoins(10),
    ])

    const data = {
      comments: countByAutor([...forumComments, ...newsComments], 10),
      articles: countByAutor(articles, 10),
      topics: countByAutor(topics, 10),
      coins: coins.slice(0, 10),
    }

    return <RankingClient data={data} />
  } catch {
    return null
  }
}

'use client'

import { useEffect, useState } from 'react'
import RankingClient from './ranking-client'

type RankingEntry = { nick: string; score: number }
type Category = 'comments' | 'articles' | 'topics' | 'coins'
type RankingData = Record<Category, RankingEntry[]>

export default function Ranking() {
  const [data, setData] = useState<RankingData | null>(null)

  useEffect(() => {
    fetch('/api/ranking', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (json) setData(json) })
      .catch(() => {})
  }, [])

  if (!data) return null
  return <RankingClient data={data} />
}

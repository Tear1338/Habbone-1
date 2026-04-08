import { NextResponse } from 'next/server'

const BADGE_API = 'https://www.habboassets.com/api/v1/badges'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const limit = Math.min(Number(searchParams.get('limit') || 50), 100)

  const url = new URL(BADGE_API)
  if (q.trim()) url.searchParams.set('term', q.trim())
  url.searchParams.set('limit', String(limit))

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } })
    if (!res.ok) return NextResponse.json({ badges: [] })
    const json = await res.json()
    const badges = (json?.badges ?? []).map((b: any) => ({
      code: String(b?.code || ''),
      name: String(b?.name || b?.code || ''),
      image: String(b?.url_habbo || ''),
    })).filter((b: any) => b.code && b.image)
    return NextResponse.json({ badges })
  } catch {
    return NextResponse.json({ badges: [] })
  }
}

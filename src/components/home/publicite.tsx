import { directusService, rItems } from '@/server/directus/client'
import { mediaUrl } from '@/lib/media-url'
import PubliciteClient, { type Partner } from './publicite-client'

// Fallback hardcoded partners in case Directus collection doesn't exist
const FALLBACK_PARTNERS: Partner[] = [
  {
    name: 'Kihabbo, un monde different',
    banner: '/uploads/news-a182f4b65f.png',
    href: 'https://discord.gg/zCFvdHsAry',
  },
  {
    name: 'Habboneco, communaute officielle',
    banner: '/uploads/news-a182f4b65f.png',
    href: 'https://discord.gg/s4NpDcgcWe',
  },
]

async function fetchPartners(): Promise<Partner[]> {
  try {
    const rows = (await directusService.request(
      rItems('publicites', {
        fields: ['id', 'name', 'banner', 'href', 'status'],
        sort: ['-id'],
        limit: 20,
        filter: { status: { _eq: 'published' } },
      } as any),
    )) as any[]

    if (!Array.isArray(rows) || rows.length === 0) return FALLBACK_PARTNERS

    return rows
      .map((row: any) => ({
        name: String(row?.name || row?.nom || '').trim(),
        banner: mediaUrl(row?.banner || row?.image || ''),
        href: String(row?.href || row?.url || row?.link || '#').trim(),
      }))
      .filter((p) => p.name && p.banner)
  } catch {
    // Collection may not exist yet — use fallback
    return FALLBACK_PARTNERS
  }
}

export default async function Publicite() {
  const partners = await fetchPartners()
  return <PubliciteClient partners={partners} />
}

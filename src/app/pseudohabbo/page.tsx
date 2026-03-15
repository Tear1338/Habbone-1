import { directusService, rItems } from '@/server/directus/client'
import { buildHabboAvatarUrl } from '@/lib/habbo-imaging'

export const revalidate = 3600

type PseudoChange = {
  id: number
  oldNick: string
  newNick: string
  hotel: string
  changedAt: string | null
}

async function fetchPseudoChanges(): Promise<PseudoChange[]> {
  try {
    const rows = (await directusService.request(
      rItems('pseudo_changes', {
        fields: ['id', 'old_nick', 'new_nick', 'hotel', 'changed_at'],
        sort: ['-changed_at', '-id'],
        limit: 100,
      } as any),
    )) as any[]

    if (!Array.isArray(rows)) return []

    return rows.map((row: any) => ({
      id: Number(row?.id ?? 0),
      oldNick: String(row?.old_nick || '').trim(),
      newNick: String(row?.new_nick || '').trim(),
      hotel: String(row?.hotel || 'fr').trim(),
      changedAt: row?.changed_at ? String(row.changed_at) : null,
    })).filter((r) => r.oldNick && r.newNick)
  } catch {
    // Collection may not exist yet
    return []
  }
}

function habboAvatarUrl(nick: string) {
  return buildHabboAvatarUrl(nick, {
    direction: 2,
    head_direction: 3,
    img_format: 'png',
    gesture: 'sml',
    headonly: 0,
    size: 'm',
  })
}

function formatDate(value: string | null): string {
  if (!value) return 'Date inconnue'
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function hotelLabel(code: string): string {
  const map: Record<string, string> = {
    fr: 'Habbo.fr',
    com: 'Habbo.com',
    'com.br': 'Habbo.com.br',
    es: 'Habbo.es',
    it: 'Habbo.it',
    de: 'Habbo.de',
    nl: 'Habbo.nl',
    fi: 'Habbo.fi',
    'com.tr': 'Habbo.com.tr',
  }
  return map[code] || `Habbo.${code}`
}

export default async function PseudoHabboPage() {
  const changes = await fetchPseudoChanges()

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-10 sm:px-6">
      {/* Header */}
      <header className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/info.png" alt="" className="h-[43px] w-auto image-pixelated" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#BEBECE]">
              Extra
            </p>
            <h1 className="text-lg font-bold uppercase tracking-[0.08em] text-[#DDD]">
              Changements de pseudo
            </h1>
          </div>
        </div>
      </header>

      {/* Info */}
      <section className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] px-5 py-4">
        <p className="text-sm leading-relaxed text-[#BEBECE]">
          Cette page enregistre les derniers changements de pseudos de tous les hôtels Habbo.
          Il peut y avoir un léger retard, mais dans la plupart des cas, le changement sera détecté dans un délai de 3 à 5 jours.
        </p>
      </section>

      {/* Changes list */}
      <section className="space-y-3">
        {changes.length === 0 ? (
          <div className="rounded-[4px] border border-dashed border-[#1F1F3E] bg-[#272746] px-6 py-14 text-center text-sm font-semibold uppercase tracking-[0.08em] text-[#BEBECE]/70">
            Aucun changement de pseudo enregistré pour le moment.
          </div>
        ) : (
          changes.map((change) => (
            <article
              key={change.id}
              className="flex items-center gap-4 rounded-[4px] border border-[#1F1F3E] bg-[#272746] px-4 py-3"
            >
              {/* Avatar */}
              <div className="h-[56px] w-[50px] shrink-0 overflow-hidden rounded-[2px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={habboAvatarUrl(change.newNick)}
                  alt={change.newNick}
                  className="h-full w-full object-cover image-pixelated"
                />
              </div>

              {/* Names */}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2 text-[14px]">
                  <span className="font-bold text-[#FF6B6B] line-through">{change.oldNick}</span>
                  <span className="text-[#BEBECE]">→</span>
                  <span className="font-bold text-[#54F296]">{change.newNick}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#BEBECE]">
                  <span className="rounded-[2px] bg-[#1F1F3E] px-2 py-0.5 text-[11px]">
                    {hotelLabel(change.hotel)}
                  </span>
                  <span>{formatDate(change.changedAt)}</span>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  )
}

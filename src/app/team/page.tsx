import { listTeamMembersByRoles } from '@/server/directus/team'
import { CalendarClock, Twitter } from 'lucide-react'

import { buildHabboAvatarUrl } from '@/lib/habbo-imaging'
import { formatDateTimeShortFr } from '@/lib/date-utils'

const TEAM_SECTIONS = [
  { role: 'Fondateur', title: 'Fondateur' },
  { role: 'Configurateur WIRED', title: 'Configurateur WIRED' },
  { role: 'Correcteur', title: 'Correcteur' },
  { role: 'Animateur', title: 'Animateur' },
]

export const revalidate = 60

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

function formatDate(value?: string | null) {
  if (!value) return 'Date inconnue'
  const formatted = formatDateTimeShortFr(value)
  return formatted || value
}

function resolveTwitterLink(value?: string | null) {
  if (!value) return null
  let handle = value.trim()
  if (!handle) return null
  if (/^https?:\/\//i.test(handle)) return handle
  if (handle.startsWith('@')) handle = handle.slice(1)
  return `https://twitter.com/${handle}`
}

export default async function TeamPage() {
  const roles = TEAM_SECTIONS.map((section) => section.role)
  const membersByRole = await listTeamMembersByRoles(roles)

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-md border border-[color:var(--bg-700)]/65 bg-[color:var(--bg-900)]/45 px-6 py-5 shadow-[0_24px_60px_-45px_rgba(0,0,0,0.85)]">
        <div className="flex flex-wrap items-center gap-3 text-[color:var(--foreground)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.habbo.com/c_images/Top_Stories_promo/radiotower1.gif"
            alt=""
            className="h-10 w-10"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
              Équipe habbone
            </p>
            <h1 className="text-lg font-bold uppercase tracking-[0.08em] text-[color:var(--foreground)]">
              Membres du staff
            </h1>
          </div>
        </div>
      </header>

      {TEAM_SECTIONS.map((section) => {
        const members = membersByRole[section.role] ?? []
        return (
          <section
            key={section.role}
            className="rounded-md border border-[color:var(--bg-700)]/55 bg-[color:var(--bg-900)]/35 shadow-[0_24px_60px_-50px_rgba(0,0,0,0.9)]"
          >
            <div className="px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/75">
              {section.title}
            </div>
            <div className="border-t border-[color:var(--bg-700)]/55 px-6 py-6">
              {members.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {members.map((member) => {
                    const twitter = resolveTwitterLink(member.twitter)
                    return (
                      <article
                        key={`${member.role}-${member.id}`}
                        className="flex flex-col gap-4 rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-800)]/55 p-4 shadow-[0_18px_55px_-45px_rgba(0,0,0,0.75)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="overflow-hidden rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/65">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={habboAvatarUrl(member.nick)}
                                alt={member.nick}
                                className="h-16 w-16 object-cover"
                              />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-sky-300">{member.nick}</p>
                              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
                                {section.title}
                              </p>
                            </div>
                          </div>
                          {twitter ? (
                            <a
                              href={twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#1d9bf0] text-white transition hover:bg-[#1086d1]"
                              aria-label={`Profil Twitter de ${member.nick}`}
                            >
                              <Twitter className="h-4 w-4" />
                            </a>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-[color:var(--foreground)]/60">
                          <CalendarClock className="h-4 w-4 text-[color:var(--foreground)]/45" />
                          <span>{formatDate(member.joinedAt)}</span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
               <p className="rounded-md border border-dashed border-[color:var(--bg-700)]/45 bg-[color:var(--bg-800)]/25 px-4 py-6 text-center text-sm italic text-[color:var(--foreground)]/55">
  Aucun membre référencé pour ce rôle pour le moment.
</p>

              )}
            </div>
          </section>
        )
      })}
    </main>
  )
}

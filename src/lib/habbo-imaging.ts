export type HabboImagingParams = Record<string, string | number | boolean | null | undefined>

const DEFAULT_BASE = 'https://www.habbo.fr'

function getBase() {
  return process.env.NEXT_PUBLIC_HABBO_BASE || DEFAULT_BASE
}

/**
 * Build a full Habbo avatar image URL.
 */
export function buildHabboAvatarUrl(user: string, params?: HabboImagingParams, base?: string) {
  const resolvedBase = base || getBase()
  let url = `${resolvedBase}/habbo-imaging/avatarimage?user=${encodeURIComponent(user || '')}`
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (key === 'user') continue
      if (value === undefined || value === null) continue
      url += `&${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    }
  }
  return url
}

/**
 * Standard avatar URL used across most components (head + smile, direction 2).
 * Use this instead of building params inline.
 */
export function habboAvatarSmile(nick: string, headonly = false) {
  return buildHabboAvatarUrl(nick, {
    direction: 2,
    head_direction: 3,
    img_format: 'png',
    gesture: 'sml',
    size: 'l',
    ...(headonly ? { headonly: 1 } : {}),
  })
}

/**
 * Build a badge image URL from its code.
 * e.g. "ACH_Login5" → "https://images.habbo.com/c_images/album1584/ACH_Login5.gif"
 */
export function badgeImageUrl(code: string) {
  if (!code) return ''
  return `https://images.habbo.com/c_images/album1584/${code}.gif`
}

/**
 * Build a group badge image URL from its badge code.
 * e.g. "b05114s06114" → "https://www.habbo.fr/habbo-imaging/badge/b05114s06114.gif"
 */
export function groupBadgeUrl(badgeCode: string) {
  return `${getBase()}/habbo-imaging/badge/${badgeCode}.gif`
}

/**
 * Extract badge code from various Habbo API badge entry formats.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function badgeCodeFromEntry(badge: any): string {
  return (
    (badge?.code || badge?.badgeCode || badge?.badge_code || badge?.badge?.code || '')
      .toString()
      .trim()
  )
}

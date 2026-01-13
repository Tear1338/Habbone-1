export type HabboImagingParams = Record<string, string | number | boolean | null | undefined>

const DEFAULT_BASE = 'https://www.habbo.fr'

export function buildHabboAvatarUrl(user: string, params?: HabboImagingParams, base?: string) {
  const resolvedBase = base || process.env.NEXT_PUBLIC_HABBO_BASE || DEFAULT_BASE
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

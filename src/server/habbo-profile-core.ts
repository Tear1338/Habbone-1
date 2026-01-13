export function enrichHabboBadges(badgesRaw: unknown, achievementsTotal: unknown) {
  const achCodeSet = new Set<string>()
  try {
    const arr: any[] = Array.isArray(achievementsTotal) ? (achievementsTotal as any[]) : []
    for (const row of arr) {
      const c = (row?.code || row?.badgeCode || row?.badge_code || row?.badge?.code || '').toString().trim().toUpperCase()
      if (c) achCodeSet.add(c)
    }
  } catch {}

  return (Array.isArray(badgesRaw) ? badgesRaw : []).map((b: any) => {
    const rawCode = (b?.code || b?.badgeCode || b?.badge_code || b?.badge?.code || '').toString().trim()
    const up = rawCode.toUpperCase()
    let album = (b?.album || b?.badgeAlbum || b?.category || b?.badgeCategory || null) as string | null
    if (!album && up && (up.startsWith('ACH_') || achCodeSet.has(up))) {
      album = 'album1584'
    }
    return { ...b, code: rawCode, album }
  })
}

type BuildHabboProfileInput = {
  core: unknown
  profile: unknown | null
  friends?: unknown
  groups?: unknown
  rooms?: unknown
  badgesRaw?: unknown
  achievements?: unknown
  achievementsTotal?: unknown
  uniqueId: string
  lite?: boolean
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function buildHabboProfilePayload(input: BuildHabboProfileInput) {
  if (input.lite) {
    return {
      user: input.core,
      profile: input.profile ?? null,
      friends: [],
      groups: [],
      rooms: [],
      badges: [],
      uniqueId: input.uniqueId,
      achievements: [],
    }
  }

  const friends = ensureArray(input.friends)
  const groups = ensureArray(input.groups)
  const rooms = ensureArray(input.rooms)
  const achievements = ensureArray(input.achievements)
  const achievementsTotal = ensureArray(input.achievementsTotal)
  const badges = enrichHabboBadges(input.badgesRaw, achievementsTotal)

  return {
    user: input.core,
    profile: input.profile ?? null,
    friends,
    groups,
    rooms,
    badges,
    uniqueId: input.uniqueId,
    achievements,
    achievementsCount: achievements.length,
    achievementsTotalCount: achievementsTotal.length,
  }
}

type Settled<T> = PromiseSettledResult<T>

function settledValue<T>(result: Settled<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback
}

function settledArray<T>(result: Settled<T>): T[] {
  const value = result.status === 'fulfilled' ? result.value : []
  return Array.isArray(value) ? (value as T[]) : []
}

export function resolveHabboProfileSettled(input: {
  profileRes: Settled<unknown>
  friendsRes: Settled<unknown>
  groupsRes: Settled<unknown>
  roomsRes: Settled<unknown>
  badgesRes: Settled<unknown>
  achievementsRes: Settled<unknown>
  achievementsCatalogRes: Settled<unknown>
}) {
  return {
    profile: settledValue(input.profileRes, null),
    friends: settledArray(input.friendsRes),
    groups: settledArray(input.groupsRes),
    rooms: settledArray(input.roomsRes),
    badgesRaw: settledArray(input.badgesRes),
    achievements: settledArray(input.achievementsRes),
    achievementsTotal: settledArray(input.achievementsCatalogRes),
  }
}

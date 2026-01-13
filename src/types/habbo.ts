import type {
  HabboAchievement,
  HabboBadge,
  HabboFriend,
  HabboGroup,
  HabboRoom,
  HabboUserCore,
} from '@/lib/habbo'

export type HabboProfileResponse = {
  user: HabboUserCore
  profile: unknown | null
  friends: HabboFriend[]
  groups: HabboGroup[]
  rooms: HabboRoom[]
  badges: HabboBadge[]
  uniqueId: string
  achievements?: HabboAchievement[]
  achievementsCount?: number
  achievementsTotalCount?: number
}

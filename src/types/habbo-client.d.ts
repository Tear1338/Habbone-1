import type { HabboProfileResponse } from "@/types/habbo"

declare global {
  interface Window {
    __habboProfile?: HabboProfileResponse
    __habboLevel?: number | null
  }

  interface WindowEventMap {
    "habbo:profile": CustomEvent<HabboProfileResponse>
  }
}

export {}

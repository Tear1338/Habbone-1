"use client"

import { useCallback, useEffect, useState } from "react"
import { cachedValue } from "@/lib/client-cache"
import { fetchHabboProfileByName } from "@/lib/habbo-client"
import type { HabboProfileResponse } from "@/types/habbo"

type UseHabboProfileOptions = {
  fallbackMessage?: string
  lite?: boolean
  enabled?: boolean
  cacheTtlMs?: number
}

export function useHabboProfile(nick: string, options?: UseHabboProfileOptions) {
  const [data, setData] = useState<HabboProfileResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(
    async (useCache: boolean) => {
      const safeNick = String(nick || "").trim()
      if (!safeNick) {
        throw new Error(options?.fallbackMessage || "Habbo profile fetch failed")
      }
      const run = () =>
        fetchHabboProfileByName(safeNick, {
          fallbackMessage: options?.fallbackMessage,
          lite: options?.lite,
        })
      const ttl = typeof options?.cacheTtlMs === "number" ? options.cacheTtlMs : 0
      return useCache ? cachedValue(`habbo-profile:${safeNick}`, ttl, run) : run()
    },
    [nick, options?.fallbackMessage, options?.lite, options?.cacheTtlMs]
  )

  useEffect(() => {
    let mounted = true
    const enabled = options?.enabled !== false
    if (!enabled) {
      setLoading(false)
      return () => {
        mounted = false
      }
    }
    setLoading(true)
    setError(null)
    setData(null)

    fetchProfile(true)
      .then((profile) => {
        if (mounted) setData(profile)
      })
      .catch((e: unknown) => {
        if (!mounted) return
        const msg = e && typeof e === "object" && "message" in e ? String((e as any).message) : "Erreur"
        setError(msg)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [fetchProfile])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const profile = await fetchProfile(false)
      setData(profile)
      return profile
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as any).message) : "Erreur"
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [fetchProfile])

  return { data, error, loading, refresh }
}

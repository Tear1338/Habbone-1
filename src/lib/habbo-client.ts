import type { HabboProfileResponse } from '@/types/habbo'

export type HabboProfileFetchOptions = {
  lite?: boolean
  signal?: AbortSignal
  cache?: RequestCache
  fallbackMessage?: string
}

function buildProfileUrlByName(name: string, lite?: boolean) {
  const qs = new URLSearchParams()
  qs.set('name', name)
  if (lite) qs.set('lite', '1')
  return `/api/habbo/profile?${qs.toString()}`
}

function buildProfileUrlById(id: string, lite?: boolean) {
  const qs = new URLSearchParams()
  qs.set('id', id)
  if (lite) qs.set('lite', '1')
  return `/api/habbo/profile?${qs.toString()}`
}

// In-flight deduplication: avoid parallel identical requests
const inflight = new Map<string, Promise<any>>()

async function fetchProfile<T extends HabboProfileResponse = HabboProfileResponse>(
  url: string,
  options?: HabboProfileFetchOptions
): Promise<T> {
  // Deduplicate identical in-flight requests
  const existing = inflight.get(url)
  if (existing) return existing as Promise<T>

  const promise = (async () => {
    try {
      const response = await fetch(url, {
        signal: options?.signal,
      })
      const json = (await response.json().catch(() => null)) as unknown
      if (!response.ok) {
        const maybeErr = (json as { error?: unknown } | null)?.error
        const msg = typeof maybeErr === 'string' ? maybeErr : options?.fallbackMessage || 'Habbo profile fetch failed'
        throw new Error(msg)
      }
      return json as T
    } finally {
      inflight.delete(url)
    }
  })()

  inflight.set(url, promise)
  return promise
}

export async function fetchHabboProfileByName<T extends HabboProfileResponse = HabboProfileResponse>(
  name: string,
  options?: HabboProfileFetchOptions
): Promise<T> {
  const safeName = String(name || '').trim()
  if (!safeName) throw new Error(options?.fallbackMessage || 'Habbo profile fetch failed')
  return fetchProfile<T>(buildProfileUrlByName(safeName, options?.lite), options)
}

export async function fetchHabboProfileById<T extends HabboProfileResponse = HabboProfileResponse>(
  id: string,
  options?: HabboProfileFetchOptions
): Promise<T> {
  const safeId = String(id || '').trim()
  if (!safeId) throw new Error(options?.fallbackMessage || 'Habbo profile fetch failed')
  return fetchProfile<T>(buildProfileUrlById(safeId, options?.lite), options)
}

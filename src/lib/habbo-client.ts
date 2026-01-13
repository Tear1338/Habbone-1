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

async function fetchProfile<T extends HabboProfileResponse = HabboProfileResponse>(
  url: string,
  options?: HabboProfileFetchOptions
): Promise<T> {
  const response = await fetch(url, {
    cache: options?.cache ?? 'no-store',
    signal: options?.signal,
  })
  const json = (await response.json().catch(() => null)) as unknown
  if (!response.ok) {
    const maybeErr = (json as { error?: unknown } | null)?.error
    const msg = typeof maybeErr === 'string' ? maybeErr : options?.fallbackMessage || 'Habbo profile fetch failed'
    throw new Error(msg)
  }
  return json as T
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

import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import {
  fetchOpenRouterModels,
  fetchOrcaModels,
  mergeModelSources,
} from '../lib/openrouter'
import type { OpenRouterModelsResponse } from '../types/openrouter'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

type Cached = { payload: OpenRouterModelsResponse; savedAt: number }

function cacheKey(source: 'or' | 'orca') {
  return `or-free:models-cache:${source}:v1`
}

function readCache(source: 'or' | 'orca'): Cached | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(cacheKey(source))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached
    if (!parsed?.payload || !Array.isArray(parsed.payload.data)) return null
    if (Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(source: 'or' | 'orca', payload: OpenRouterModelsResponse): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      cacheKey(source),
      JSON.stringify({ payload, savedAt: Date.now() } satisfies Cached),
    )
  } catch {
    // quota or disabled storage — silently ignore
  }
}

// Runs the two sources in parallel. OR is the fast primary (~120ms, has
// expiration_date/description/etc). ORCA is the secondary (~500ms, fills
// in any models OR doesn't list). Merged output prefers OR per model id.
// Either source arriving is enough to render the UI; the other merges in
// progressively when it lands.
export function useModels() {
  const orInitial = readCache('or')
  const orcaInitial = readCache('orca')

  const orQuery = useQuery({
    queryKey: ['models', 'or'],
    queryFn: ({ signal }) => fetchOpenRouterModels(signal),
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: false,
    initialData: orInitial?.payload,
    initialDataUpdatedAt: orInitial?.savedAt,
  })

  const orcaQuery = useQuery({
    queryKey: ['models', 'orca'],
    queryFn: ({ signal }) => fetchOrcaModels(signal),
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: false,
    initialData: orcaInitial?.payload,
    initialDataUpdatedAt: orcaInitial?.savedAt,
  })

  useEffect(() => {
    if (orQuery.data && orQuery.isSuccess) writeCache('or', orQuery.data)
  }, [orQuery.data, orQuery.isSuccess])

  useEffect(() => {
    if (orcaQuery.data && orcaQuery.isSuccess) writeCache('orca', orcaQuery.data)
  }, [orcaQuery.data, orcaQuery.isSuccess])

  const merged = useMemo(
    () => mergeModelSources(orQuery.data, orcaQuery.data),
    [orQuery.data, orcaQuery.data],
  )

  // Render as soon as either source lands. Loading only while *both* pending.
  const isLoading = orQuery.isLoading && orcaQuery.isLoading

  // Error only when both fail — a single-source failure is survivable.
  const isError = orQuery.isError && orcaQuery.isError
  const error = isError ? orQuery.error ?? orcaQuery.error : null

  const dataUpdatedAt = Math.max(orQuery.dataUpdatedAt ?? 0, orcaQuery.dataUpdatedAt ?? 0)

  return {
    data: merged,
    isLoading,
    isError,
    error,
    dataUpdatedAt,
    refetch: async () => {
      const [or, orca] = await Promise.all([orQuery.refetch(), orcaQuery.refetch()])
      return { or, orca }
    },
  }
}

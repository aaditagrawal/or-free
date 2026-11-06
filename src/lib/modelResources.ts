import { createResource } from './resource'
import { fetchModelsDev, fetchOpenRouterModels, fetchOrcaModels } from './openrouter'
import type { ModelsDevResponse, OpenRouterModelsResponse } from '../types/openrouter'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

type Source = 'or' | 'orca' | 'models-dev'
type Cached<TPayload> = { payload: TPayload; savedAt: number }

function cacheKey(source: Source) {
  return `or-free:models-cache:${source}:v1`
}

function hasOpenRouterModelsResponse(value: unknown): value is OpenRouterModelsResponse {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'data' in value &&
      Array.isArray(value.data),
  )
}

function hasModelsDevResponse(value: unknown): value is ModelsDevResponse {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'openrouter' in value &&
      value.openrouter &&
      typeof value.openrouter === 'object' &&
      'models' in value.openrouter,
  )
}

function readCache<TPayload>(
  source: Source,
  hasPayload: (value: unknown) => value is TPayload,
): Cached<TPayload> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(cacheKey(source))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached<unknown>
    if (!hasPayload(parsed?.payload)) return null
    const age = Date.now() - parsed.savedAt
    if (!Number.isFinite(parsed.savedAt) || age < 0 || age > CACHE_MAX_AGE_MS) return null
    return { payload: parsed.payload, savedAt: parsed.savedAt }
  } catch {
    return null
  }
}

function writeCache<TPayload>(source: Source, payload: TPayload): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      cacheKey(source),
      JSON.stringify({ payload, savedAt: Date.now() } satisfies Cached<TPayload>),
    )
  } catch {
    // quota or disabled storage — silently ignore
  }
}

export function createModelResources() {
  const orResource = createResource({
    fetch: fetchOpenRouterModels,
    initial: () => readCache('or', hasOpenRouterModelsResponse),
    onSuccess: (payload) => writeCache('or', payload),
    staleTime: REFRESH_INTERVAL_MS,
    interval: REFRESH_INTERVAL_MS,
  })
  const orcaResource = createResource({
    fetch: fetchOrcaModels,
    initial: () => readCache('orca', hasOpenRouterModelsResponse),
    onSuccess: (payload) => writeCache('orca', payload),
    staleTime: REFRESH_INTERVAL_MS,
    interval: REFRESH_INTERVAL_MS,
  })
  const modelsDevResource = createResource({
    fetch: fetchModelsDev,
    initial: () => readCache('models-dev', hasModelsDevResponse),
    onSuccess: (payload) => writeCache('models-dev', payload),
    staleTime: REFRESH_INTERVAL_MS,
    interval: REFRESH_INTERVAL_MS,
  })

  return { or: orResource, orca: orcaResource, modelsDev: modelsDevResource }
}

import type { OpenRouterModelsResponse } from '../types/openrouter'
import { fetchOrcaModels } from './orca'

// OpenRouter supports CORS, so we can hit it directly from the browser —
// no proxy needed. This is the fast primary source.
export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'

export async function fetchOpenRouterModels(
  signal?: AbortSignal,
): Promise<OpenRouterModelsResponse> {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    method: 'GET',
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`OpenRouter request failed (${response.status})`)
  }

  const payload = (await response.json()) as OpenRouterModelsResponse

  if (!payload || !Array.isArray(payload.data)) {
    throw new Error('OpenRouter payload missing model list')
  }

  return payload
}

// ORCA is routed through our same-origin proxy (no CORS upstream).
export { fetchOrcaModels }

// Back-compat alias — treats ORCA as the sole source. Not used by the
// merged hook but kept to avoid breaking any external callers.
export function fetchModels(signal?: AbortSignal): Promise<OpenRouterModelsResponse> {
  return fetchOrcaModels(signal)
}

// Union merge: OR is canonical (complete shape including expiration_date,
// description, tokenizer, default_parameters). ORCA contributes any models
// OR doesn't list. When a model appears in both, we keep OR's copy.
export function mergeModelSources(
  or: OpenRouterModelsResponse | undefined,
  orca: OpenRouterModelsResponse | undefined,
): OpenRouterModelsResponse | undefined {
  if (!or && !orca) return undefined
  if (!orca) return or
  if (!or) return orca

  const seen = new Set<string>()
  const merged = []

  for (const model of or.data) {
    seen.add(model.id)
    merged.push(model)
  }

  for (const model of orca.data) {
    if (seen.has(model.id)) continue
    merged.push(model)
  }

  return { data: merged }
}

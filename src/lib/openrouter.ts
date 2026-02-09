import type { OpenRouterModelsResponse } from '../types/openrouter'

export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'

export async function fetchModels(signal?: AbortSignal): Promise<OpenRouterModelsResponse> {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
    },
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

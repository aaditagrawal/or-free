import type { DerivedModel, PricingFilter, ProviderMode } from '../types/explorer'
import type { OpenRouterModel } from '../types/openrouter'

export const MS_PER_DAY = 24 * 60 * 60 * 1000

export function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return Number.NaN
    }

    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : Number.NaN
  }

  return Number.NaN
}

export function getUtcDateStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function unixToMs(unixMaybeSeconds: number): number {
  if (!Number.isFinite(unixMaybeSeconds)) {
    return Date.now()
  }

  // OpenRouter currently returns second-based unix timestamps.
  return unixMaybeSeconds > 1e12 ? unixMaybeSeconds : unixMaybeSeconds * 1000
}

export function isFree(model: OpenRouterModel): boolean {
  return toNumber(model.pricing.prompt) === 0 && toNumber(model.pricing.completion) === 0
}

export function isUnexpired(model: OpenRouterModel, todayUtc = getUtcDateStamp()): boolean {
  const expirationDate = model.expiration_date
  if (!expirationDate) {
    return true
  }

  return expirationDate >= todayUtc
}

export function isProviderReady(model: OpenRouterModel): boolean {
  const provider = model.top_provider ?? {}

  return provider.context_length != null && provider.max_completion_tokens != null
}

export function toDerivedModel(model: OpenRouterModel, todayUtc = getUtcDateStamp()): DerivedModel {
  const createdMs = unixToMs(model.created)
  const contextLength = model.context_length == null ? null : toNumber(model.context_length)
  const maxCompletionTokens =
    model.top_provider?.max_completion_tokens == null
      ? null
      : toNumber(model.top_provider.max_completion_tokens)

  return {
    raw: model,
    id: model.id,
    canonicalSlug: model.canonical_slug,
    name: model.name,
    description: model.description ?? '',
    createdMs,
    createdIso: new Date(createdMs).toISOString(),
    promptPrice: toNumber(model.pricing.prompt),
    completionPrice: toNumber(model.pricing.completion),
    contextLength: Number.isNaN(contextLength) ? null : contextLength,
    maxCompletionTokens:
      maxCompletionTokens == null || Number.isNaN(maxCompletionTokens)
        ? null
        : maxCompletionTokens,
    tokenizer: model.architecture.tokenizer ?? 'Unknown',
    instructType: model.architecture.instruct_type ?? null,
    modality: model.architecture.modality ?? null,
    inputModalities: model.architecture.input_modalities ?? [],
    outputModalities: model.architecture.output_modalities ?? [],
    supportedParameters: model.supported_parameters ?? [],
    expirationDate: model.expiration_date ?? null,
    moderated: Boolean(model.top_provider?.is_moderated),
    isFree: isFree(model),
    isUnexpired: isUnexpired(model, todayUtc),
    isProviderReady: isProviderReady(model),
  }
}

export function deriveModels(models: OpenRouterModel[], todayUtc = getUtcDateStamp()): DerivedModel[] {
  return models.map((model) => toDerivedModel(model, todayUtc))
}

export function selectActiveModels(
  models: OpenRouterModel[],
  providerMode: ProviderMode,
  pricingFilter: PricingFilter,
  todayUtc = getUtcDateStamp(),
): DerivedModel[] {
  const derived = deriveModels(models, todayUtc)

  return derived.filter((model) => {
    if (pricingFilter === 'free' && !model.isFree) {
      return false
    }

    if (!model.isUnexpired) {
      return false
    }

    if (providerMode === 'strict') {
      return model.isProviderReady
    }

    return true
  })
}

export function daysUntilExpiration(expirationDate: string | null, todayUtc = getUtcDateStamp()): number | null {
  if (!expirationDate) {
    return null
  }

  const start = new Date(`${todayUtc}T00:00:00.000Z`).getTime()
  const end = new Date(`${expirationDate}T00:00:00.000Z`).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null
  }

  return Math.floor((end - start) / MS_PER_DAY)
}

export function isExpiringSoon(expirationDate: string | null, todayUtc = getUtcDateStamp()): boolean {
  const days = daysUntilExpiration(expirationDate, todayUtc)
  if (days == null) {
    return false
  }

  return days >= 0 && days <= 30
}

export function getFacets(models: DerivedModel[]) {
  const providers = new Set<string>()
  const inputModalities = new Set<string>()
  const outputModalities = new Set<string>()
  const instructTypes = new Set<string>()
  const supportedParameters = new Set<string>()

  for (const model of models) {
    providers.add(model.tokenizer)

    for (const modality of model.inputModalities) {
      inputModalities.add(modality)
    }

    for (const modality of model.outputModalities) {
      outputModalities.add(modality)
    }

    instructTypes.add(model.instructType ?? 'null')

    for (const parameter of model.supportedParameters) {
      supportedParameters.add(parameter)
    }
  }

  return {
    providers: [...providers].sort((a, b) => a.localeCompare(b)),
    inputModalities: [...inputModalities].sort((a, b) => a.localeCompare(b)),
    outputModalities: [...outputModalities].sort((a, b) => a.localeCompare(b)),
    instructTypes: [...instructTypes].sort((a, b) => a.localeCompare(b)),
    supportedParameters: [...supportedParameters].sort((a, b) => a.localeCompare(b)),
  }
}

export function formatDate(dateIso: string | null): string {
  if (!dateIso) {
    return 'None'
  }

  return dateIso
}

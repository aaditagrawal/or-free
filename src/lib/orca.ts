import type {
  OpenRouterModel,
  OpenRouterModelsResponse,
  OpenRouterPricing,
  OpenRouterTopProvider,
} from '../types/openrouter'

// Routed through a same-origin proxy (Vite in dev, Cloudflare Worker in prod)
// because the upstream at https://orca.orb.town/api/preview/v2/models does
// not emit CORS headers for browser clients.
export const ORCA_MODELS_URL = '/api/models'

// ---- ORCA payload types ----

type OrcaNumericString = string | null

type OrcaDataPolicy = {
  data_retention_days: number | null
  may_publish_data: boolean
  may_retain_data: boolean
  may_train_on_data: boolean
  shares_user_id: boolean
}

type OrcaLimits = {
  image_input_tokens: number | null
  images_per_input: number | null
  requests_per_day: number | null
  requests_per_minute: number | null
  text_input_tokens: number | null
  text_output_tokens: number | null
}

type OrcaPricing = {
  audio_cache_write: OrcaNumericString
  audio_input: OrcaNumericString
  image_input: OrcaNumericString
  image_output: OrcaNumericString
  per_request: OrcaNumericString
  reasoning_output: OrcaNumericString
  text_cache_read: OrcaNumericString
  text_cache_write: OrcaNumericString
  text_input: OrcaNumericString
  text_output: OrcaNumericString
  tiers: unknown
}

type OrcaProvider = {
  chat_completions: boolean
  completions: boolean
  context_length: number | null
  data_policy?: OrcaDataPolicy
  deranked?: boolean
  implicit_caching?: boolean
  limits: OrcaLimits
  moderated: boolean
  native_web_search?: boolean
  pricing: OrcaPricing
  provider_id: string
  provider_name: string
  provider_region: string | null
  quantization?: string
  supported_parameters: string[]
}

type OrcaModel = {
  author_name: string
  created_at: string
  id: string
  input_modalities: string[]
  output_modalities: string[]
  name: string
  providers: OrcaProvider[]
  reasoning?: boolean
  variant?: string
  version_id?: string
}

type OrcaResponse = {
  models: OrcaModel[]
}

// ---- Adapter ----

function numberFromString(value: OrcaNumericString): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// OpenRouter encodes free variants as `:free` in the model id, even when
// the upstream ORCA payload leaves text_input/text_output as null.
function isFreeModelId(id: string): boolean {
  return id.endsWith(':free') || id.includes(':free:')
}

function isFreeProvider(provider: OrcaProvider): boolean {
  const input = numberFromString(provider.pricing.text_input)
  const output = numberFromString(provider.pricing.text_output)
  return input === 0 && output === 0
}

function pickRepresentativeProvider(
  modelId: string,
  providers: OrcaProvider[],
): OrcaProvider | null {
  if (providers.length === 0) return null
  if (!isFreeModelId(modelId)) {
    const free = providers.find(isFreeProvider)
    if (free) return free
  }
  const complete = providers.find(
    (p) => p.context_length != null && p.limits.text_output_tokens != null,
  )
  if (complete) return complete
  return providers[0]
}

function toOpenRouterPricing(pricing: OrcaPricing, isFree: boolean): OpenRouterPricing {
  return {
    // When the model is flagged free by id but upstream leaves pricing null,
    // normalize the core rates to "0" so downstream free/paid logic works.
    prompt: pricing.text_input ?? (isFree ? '0' : null),
    completion: pricing.text_output ?? (isFree ? '0' : null),
    request: pricing.per_request ?? null,
    image: pricing.image_input ?? null,
    image_output: pricing.image_output ?? null,
    audio: pricing.audio_input ?? null,
    internal_reasoning: pricing.reasoning_output ?? null,
    input_cache_read: pricing.text_cache_read ?? null,
    input_cache_write: pricing.text_cache_write ?? null,
  }
}

function toTopProvider(provider: OrcaProvider): OpenRouterTopProvider {
  return {
    context_length: provider.context_length,
    max_completion_tokens: provider.limits.text_output_tokens,
    is_moderated: provider.moderated,
  }
}

function pickPrimaryModality(inputs: string[]): string {
  if (inputs.includes('text')) return 'text'
  if (inputs.length > 0) return inputs[0]
  return 'text'
}

function orcaToOpenRouter(model: OrcaModel): OpenRouterModel | null {
  const provider = pickRepresentativeProvider(model.id, model.providers)
  if (!provider) return null

  const freeByConvention = isFreeModelId(model.id) || isFreeProvider(provider)

  const createdMs = Date.parse(model.created_at)
  const created = Number.isFinite(createdMs)
    ? Math.floor(createdMs / 1000)
    : Math.floor(Date.now() / 1000)

  const description = `${model.author_name} · ${model.name}${model.reasoning ? ' · reasoning' : ''}${model.variant && model.variant !== 'standard' ? ` · ${model.variant}` : ''}`

  return {
    id: model.id,
    canonical_slug: model.version_id ?? model.id,
    name: model.name,
    created,
    description,
    pricing: toOpenRouterPricing(provider.pricing, freeByConvention),
    context_length: provider.context_length,
    architecture: {
      tokenizer: provider.quantization && provider.quantization !== 'unknown' ? provider.quantization : 'Unknown',
      instruct_type: null,
      modality: pickPrimaryModality(model.input_modalities),
      input_modalities: model.input_modalities,
      output_modalities: model.output_modalities,
    },
    top_provider: toTopProvider(provider),
    per_request_limits: {
      prompt_tokens: provider.limits.text_input_tokens,
      completion_tokens: provider.limits.text_output_tokens,
    },
    supported_parameters: provider.supported_parameters,
    default_parameters: {},
    expiration_date: null,
    hugging_face_id: null,
  }
}

export function adaptOrcaResponse(payload: OrcaResponse): OpenRouterModelsResponse {
  const data: OpenRouterModel[] = []
  for (const model of payload.models) {
    const mapped = orcaToOpenRouter(model)
    if (mapped) data.push(mapped)
  }
  return { data }
}

export async function fetchOrcaModels(signal?: AbortSignal): Promise<OpenRouterModelsResponse> {
  const response = await fetch(ORCA_MODELS_URL, {
    method: 'GET',
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`ORCA request failed (${response.status})`)
  }

  const payload = (await response.json()) as OrcaResponse

  if (!payload || !Array.isArray(payload.models)) {
    throw new Error('ORCA payload missing model list')
  }

  return adaptOrcaResponse(payload)
}

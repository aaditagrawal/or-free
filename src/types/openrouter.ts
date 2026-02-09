export type NumericLike = number | string

export type OpenRouterPricing = {
  prompt?: NumericLike | null
  completion?: NumericLike | null
  request?: NumericLike | null
  image?: NumericLike | null
  image_token?: NumericLike | null
  image_output?: NumericLike | null
  audio?: NumericLike | null
  audio_output?: NumericLike | null
  input_audio_cache?: NumericLike | null
  web_search?: NumericLike | null
  internal_reasoning?: NumericLike | null
  input_cache_read?: NumericLike | null
  input_cache_write?: NumericLike | null
  discount?: NumericLike | null
}

export type OpenRouterModelArchitecture = {
  tokenizer?: string | null
  instruct_type?: string | null
  modality?: string | null
  input_modalities?: string[]
  output_modalities?: string[]
}

export type OpenRouterTopProvider = {
  context_length?: NumericLike | null
  max_completion_tokens?: NumericLike | null
  is_moderated?: boolean
}

export type OpenRouterPerRequestLimits = {
  prompt_tokens?: NumericLike | null
  completion_tokens?: NumericLike | null
}

export type OpenRouterDefaultParameters = {
  temperature?: number | null
  top_p?: number | null
  frequency_penalty?: number | null
}

export type OpenRouterModel = {
  id: string
  canonical_slug: string
  hugging_face_id?: string | null
  name: string
  created: number
  description?: string
  pricing: OpenRouterPricing
  context_length: NumericLike | null
  architecture: OpenRouterModelArchitecture
  top_provider: OpenRouterTopProvider
  per_request_limits?: OpenRouterPerRequestLimits
  supported_parameters: string[]
  default_parameters?: OpenRouterDefaultParameters
  expiration_date?: string | null
}

export type OpenRouterModelsResponse = {
  data: OpenRouterModel[]
}

export type NumericLike = number | string;

export type OpenRouterPricing = {
  prompt?: NumericLike | null;
  completion?: NumericLike | null;
  request?: NumericLike | null;
  image?: NumericLike | null;
  image_token?: NumericLike | null;
  image_output?: NumericLike | null;
  audio?: NumericLike | null;
  audio_output?: NumericLike | null;
  input_audio_cache?: NumericLike | null;
  web_search?: NumericLike | null;
  internal_reasoning?: NumericLike | null;
  input_cache_read?: NumericLike | null;
  input_cache_write?: NumericLike | null;
  discount?: NumericLike | null;
};

export type OpenRouterModelArchitecture = {
  tokenizer?: string | null;
  instruct_type?: string | null;
  modality?: string | null;
  input_modalities?: string[];
  output_modalities?: string[];
};

export type OpenRouterTopProvider = {
  context_length?: NumericLike | null;
  max_completion_tokens?: NumericLike | null;
  is_moderated?: boolean;
};

export type OpenRouterPerRequestLimits = {
  prompt_tokens?: NumericLike | null;
  completion_tokens?: NumericLike | null;
};

export type OpenRouterDefaultParameters = {
  temperature?: number | null;
  top_p?: number | null;
  frequency_penalty?: number | null;
};

export type ModelsDevModalities = {
  input?: string[];
  output?: string[];
};

export type ModelsDevLimit = {
  context?: number | null;
  output?: number | null;
};

export type ModelsDevCost = {
  input?: number | null;
  output?: number | null;
  cache_read?: number | null;
  cache_write?: number | null;
};

export type ModelsDevModel = {
  id: string;
  name?: string;
  family?: string;
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
  temperature?: boolean;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  modalities?: ModelsDevModalities;
  open_weights?: boolean;
  limit?: ModelsDevLimit;
  cost?: ModelsDevCost;
};

export type ModelsDevProvider = {
  id: string;
  env?: string[];
  npm?: string;
  api?: string;
  name?: string;
  doc?: string;
  models: Record<string, ModelsDevModel>;
};

export type ModelsDevResponse = Record<string, ModelsDevProvider>;

export type OpenRouterModel = {
  id: string;
  canonical_slug: string;
  hugging_face_id?: string | null;
  name: string;
  created: number;
  description?: string;
  pricing: OpenRouterPricing;
  context_length: NumericLike | null;
  architecture: OpenRouterModelArchitecture;
  top_provider: OpenRouterTopProvider;
  per_request_limits?: OpenRouterPerRequestLimits;
  supported_parameters: string[];
  default_parameters?: OpenRouterDefaultParameters;
  expiration_date?: string | null;
  models_dev?: ModelsDevModel;
};

export type OpenRouterModelsResponse = {
  data: OpenRouterModel[];
};

import type {
  ModelsDevModel,
  ModelsDevResponse,
  OpenRouterModel,
  OpenRouterModelsResponse,
} from "../types/openrouter";
import { fetchOrcaModels } from "./orca";

// OpenRouter supports CORS, so we can hit it directly from the browser —
// no proxy needed. This is the fast primary source.
export const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
export const MODELS_DEV_URL = "https://models.dev/api.json";

export async function fetchOpenRouterModels(
  signal?: AbortSignal,
): Promise<OpenRouterModelsResponse> {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    method: "GET",
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed (${response.status})`);
  }

  const payload: OpenRouterModelsResponse = await response.json();

  if (!payload || !Array.isArray(payload.data)) {
    throw new Error("OpenRouter payload missing model list");
  }

  return payload;
}

export async function fetchModelsDev(signal?: AbortSignal): Promise<ModelsDevResponse> {
  const response = await fetch(MODELS_DEV_URL, {
    method: "GET",
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`models.dev request failed (${response.status})`);
  }

  const payload: ModelsDevResponse = await response.json();

  if (!payload?.openrouter?.models) {
    throw new Error("models.dev payload missing OpenRouter model map");
  }

  return payload;
}

// ORCA is routed through our same-origin proxy (no CORS upstream).
export { fetchOrcaModels };

// Back-compat alias — treats ORCA as the sole source. Not used by the
// merged hook but kept to avoid breaking any external callers.
export function fetchModels(signal?: AbortSignal): Promise<OpenRouterModelsResponse> {
  return fetchOrcaModels(signal);
}

function getModelsDevOpenRouterModels(modelsDev: ModelsDevResponse | undefined) {
  return modelsDev?.openrouter?.models;
}

function joinModalities(input: string[], output: string[]): string | null {
  if (input.length === 0 || output.length === 0) {
    return null;
  }

  return `${input.join("+")}->${output.join("+")}`;
}

function mergeSupportedParameters(
  supportedParameters: string[],
  modelsDevModel: ModelsDevModel,
): string[] {
  const merged = new Set(supportedParameters);

  if (modelsDevModel.tool_call) {
    merged.add("tools");
  }

  if (modelsDevModel.structured_output) {
    merged.add("structured_outputs");
  }

  if (modelsDevModel.temperature) {
    merged.add("temperature");
  }

  return [...merged];
}

function enrichModelWithModelsDev(
  model: OpenRouterModel,
  modelsDevModel: ModelsDevModel | undefined,
): OpenRouterModel {
  if (!modelsDevModel) {
    return model;
  }

  const inputModalities = Array.isArray(modelsDevModel.modalities?.input)
    ? modelsDevModel.modalities.input
    : model.architecture.input_modalities;
  const outputModalities = Array.isArray(modelsDevModel.modalities?.output)
    ? modelsDevModel.modalities.output
    : model.architecture.output_modalities;
  const contextLength = modelsDevModel.limit?.context ?? model.context_length;
  const maxCompletionTokens =
    modelsDevModel.limit?.output ?? model.top_provider.max_completion_tokens;
  const modality = joinModalities(inputModalities ?? [], outputModalities ?? []);

  return {
    ...model,
    context_length: contextLength,
    architecture: {
      ...model.architecture,
      modality: modality ?? model.architecture.modality,
      input_modalities: inputModalities,
      output_modalities: outputModalities,
    },
    top_provider: {
      ...model.top_provider,
      context_length: modelsDevModel.limit?.context ?? model.top_provider.context_length,
      max_completion_tokens: maxCompletionTokens,
    },
    supported_parameters: mergeSupportedParameters(model.supported_parameters, modelsDevModel),
    models_dev: modelsDevModel,
  };
}

// Union merge: OR is canonical (complete shape including expiration_date,
// description, tokenizer, default_parameters). ORCA contributes any models
// OR doesn't list. When a model appears in both, we keep OR's copy.
export function mergeModelSources(
  or: OpenRouterModelsResponse | undefined,
  orca: OpenRouterModelsResponse | undefined,
  modelsDev?: ModelsDevResponse,
): OpenRouterModelsResponse | undefined {
  if (!or && !orca) return undefined;
  const modelsDevModels = getModelsDevOpenRouterModels(modelsDev);

  if (!orca) {
    if (!or) return undefined;
    return {
      data: or.data.map((model) => enrichModelWithModelsDev(model, modelsDevModels?.[model.id])),
    };
  }

  if (!or) {
    return {
      data: orca.data.map((model) => enrichModelWithModelsDev(model, modelsDevModels?.[model.id])),
    };
  }

  const seen = new Set<string>();
  const merged = [];

  for (const model of or.data) {
    seen.add(model.id);
    merged.push(enrichModelWithModelsDev(model, modelsDevModels?.[model.id]));
  }

  for (const model of orca.data) {
    if (seen.has(model.id)) continue;
    merged.push(enrichModelWithModelsDev(model, modelsDevModels?.[model.id]));
  }

  return { data: merged };
}

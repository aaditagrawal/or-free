import { describe, expect, it } from 'vitest'
import type { ExplorerState } from '../types/explorer'
import type { OpenRouterModel } from '../types/openrouter'
import { applyExplorerFilters } from './filterSort'
import { toDerivedModel } from './models'

function buildModel(overrides: Partial<OpenRouterModel>): OpenRouterModel {
  return {
    id: overrides.id ?? 'provider/model:free',
    canonical_slug: overrides.canonical_slug ?? 'provider-model-free',
    name: overrides.name ?? 'Model',
    created: overrides.created ?? 1700000000,
    pricing: overrides.pricing ?? { prompt: '0', completion: '0' },
    context_length: overrides.context_length ?? 8192,
    architecture:
      overrides.architecture ??
      {
        tokenizer: 'Other',
        instruct_type: 'none',
        modality: 'text',
        input_modalities: ['text'],
        output_modalities: ['text'],
      },
    top_provider:
      overrides.top_provider ??
      {
        context_length: 8192,
        max_completion_tokens: 4096,
        is_moderated: false,
      },
    per_request_limits:
      overrides.per_request_limits ??
      {
        prompt_tokens: 8192,
        completion_tokens: 4096,
      },
    supported_parameters: overrides.supported_parameters ?? ['temperature'],
    default_parameters: overrides.default_parameters ?? { temperature: 0.8 },
    expiration_date: overrides.expiration_date ?? null,
    hugging_face_id: overrides.hugging_face_id ?? null,
    description: overrides.description ?? 'desc',
  }
}

function baseState(overrides: Partial<ExplorerState> = {}): ExplorerState {
  return {
    q: '',
    providers: [],
    inputModalities: [],
    outputModalities: [],
    instructTypes: [],
    supportedParameters: [],
    moderated: 'all',
    minContextLength: null,
    minMaxCompletionTokens: null,
    createdFrom: null,
    createdTo: null,
    expiryMode: 'all',
    pricingFilter: 'free',
    providerMode: 'strict',
    sortKey: 'created',
    sortDirection: 'desc',
    ...overrides,
  }
}

describe('applyExplorerFilters', () => {
  const models = [
    toDerivedModel(
      buildModel({
        id: 'alpha',
        name: 'Alpha',
        created: 1700000000,
        architecture: {
          tokenizer: 'Llama3',
          instruct_type: 'chatml',
          modality: 'text',
          input_modalities: ['text'],
          output_modalities: ['text'],
        },
        supported_parameters: ['temperature', 'top_p'],
      }),
      '2026-02-09',
    ),
    toDerivedModel(
      buildModel({
        id: 'beta',
        name: 'Beta',
        created: 1710000000,
        description: 'contains vision tools',
        architecture: {
          tokenizer: 'Qwen',
          instruct_type: null,
          modality: 'image',
          input_modalities: ['text', 'image'],
          output_modalities: ['text'],
        },
        supported_parameters: ['tools'],
        top_provider: { context_length: 100000, max_completion_tokens: 6000, is_moderated: true },
      }),
      '2026-02-09',
    ),
  ]

  it('sorts newest-first by default', () => {
    const result = applyExplorerFilters(models, baseState(), '2026-02-09')

    expect(result.map((model) => model.id)).toEqual(['beta', 'alpha'])
  })

  it('searches over id, name and description', () => {
    const result = applyExplorerFilters(models, baseState({ q: 'vision' }), '2026-02-09')

    expect(result.map((model) => model.id)).toEqual(['beta'])
  })

  it('applies provider + modality + parameter filters', () => {
    const result = applyExplorerFilters(
      models,
      baseState({
        providers: ['Qwen'],
        inputModalities: ['image'],
        supportedParameters: ['tools'],
      }),
      '2026-02-09',
    )

    expect(result.map((model) => model.id)).toEqual(['beta'])
  })

  it('applies expiring-soon filter', () => {
    const expiring = toDerivedModel(
      buildModel({ id: 'soon', expiration_date: '2026-02-20', created: 1690000000 }),
      '2026-02-09',
    )

    const result = applyExplorerFilters(
      [models[0], expiring],
      baseState({ expiryMode: 'expiring-soon' }),
      '2026-02-09',
    )

    expect(result.map((model) => model.id)).toEqual(['soon'])
  })
})

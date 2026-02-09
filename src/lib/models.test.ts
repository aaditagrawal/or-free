import { describe, expect, it } from 'vitest'
import { selectActiveModels } from './models'
import type { OpenRouterModel } from '../types/openrouter'

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

describe('selectActiveModels', () => {
  it('strict mode excludes incomplete provider metadata', () => {
    const models = [
      buildModel({ id: 'ready', top_provider: { context_length: 1024, max_completion_tokens: 512, is_moderated: false } }),
      buildModel({
        id: 'incomplete',
        top_provider: { context_length: null, max_completion_tokens: 512, is_moderated: false },
      }),
    ]

    const selected = selectActiveModels(models, 'strict', 'free', '2026-02-09')

    expect(selected.map((model) => model.id)).toEqual(['ready'])
  })

  it('include_incomplete mode includes incomplete provider metadata', () => {
    const models = [
      buildModel({ id: 'ready', top_provider: { context_length: 1024, max_completion_tokens: 512, is_moderated: false } }),
      buildModel({
        id: 'incomplete',
        top_provider: { context_length: null, max_completion_tokens: 512, is_moderated: false },
      }),
    ]

    const selected = selectActiveModels(models, 'include_incomplete', 'free', '2026-02-09')

    expect(selected.map((model) => model.id)).toEqual(['ready', 'incomplete'])
  })

  it('always excludes expired or non-free models before provider mode', () => {
    const models = [
      buildModel({ id: 'expired', expiration_date: '2026-02-01' }),
      buildModel({ id: 'not-free', pricing: { prompt: '0.1', completion: '0' } }),
      buildModel({ id: 'valid', expiration_date: '2026-03-01' }),
    ]

    const selected = selectActiveModels(models, 'include_incomplete', 'free', '2026-02-09')

    expect(selected.map((model) => model.id)).toEqual(['valid'])
  })

  it('pricing filter "all" includes non-free models', () => {
    const models = [
      buildModel({ id: 'free-model' }),
      buildModel({ id: 'paid-model', pricing: { prompt: '0.1', completion: '0.2' } }),
    ]

    const selected = selectActiveModels(models, 'include_incomplete', 'all', '2026-02-09')

    expect(selected.map((model) => model.id)).toEqual(['free-model', 'paid-model'])
  })

  it('pricing filter "free" excludes non-free models', () => {
    const models = [
      buildModel({ id: 'free-model' }),
      buildModel({ id: 'paid-model', pricing: { prompt: '0.1', completion: '0.2' } }),
    ]

    const selected = selectActiveModels(models, 'include_incomplete', 'free', '2026-02-09')

    expect(selected.map((model) => model.id)).toEqual(['free-model'])
  })
})

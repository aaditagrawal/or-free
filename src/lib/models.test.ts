import { describe, expect, it } from 'vitest'
import { selectActiveModels, toDerivedModel } from './models'
import { mergeModelSources } from './openrouter'
import type { ModelsDevResponse, OpenRouterModel } from '../types/openrouter'

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

describe('models.dev enrichment', () => {
  it('applies OpenRouter model metadata from the models.dev api.json shape', () => {
    const modelsDev = {
      openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        models: {
          'openai/gpt-4o': {
            id: 'openai/gpt-4o',
            name: 'GPT-4o',
            family: 'gpt',
            attachment: true,
            reasoning: false,
            tool_call: true,
            structured_output: true,
            temperature: true,
            knowledge: '2023-09',
            release_date: '2024-05-13',
            last_updated: '2024-08-06',
            modalities: {
              input: ['text', 'image', 'pdf'],
              output: ['text'],
            },
            open_weights: false,
            limit: {
              context: 128000,
              output: 16384,
            },
            cost: {
              input: 2.5,
              output: 10,
            },
          },
        },
      },
    } satisfies ModelsDevResponse
    const openRouterModel = buildModel({
      id: 'openai/gpt-4o',
      name: 'GPT-4o',
      context_length: 8000,
      architecture: {
        tokenizer: 'GPT',
        instruct_type: null,
        modality: 'text+image+file->text',
        input_modalities: ['text', 'image', 'file'],
        output_modalities: ['text'],
      },
      top_provider: { context_length: 8000, max_completion_tokens: 4096, is_moderated: false },
      supported_parameters: [],
    })

    const merged = mergeModelSources({ data: [openRouterModel] }, undefined, modelsDev)
    const derived = toDerivedModel(merged?.data[0] ?? openRouterModel, '2026-02-09')

    expect(derived.inputModalities).toEqual(['text', 'image', 'pdf'])
    expect(derived.providerId).toBe('openai')
    expect(derived.providerLogoUrl).toBe('https://models.dev/logos/openai.svg')
    expect(derived.contextLength).toBe(128000)
    expect(derived.maxCompletionTokens).toBe(16384)
    expect(derived.supportedParameters).toEqual(['tools', 'structured_outputs', 'temperature'])
    expect(derived.family).toBe('gpt')
    expect(derived.knowledge).toBe('2023-09')
    expect(derived.attachment).toBe(true)
    expect(derived.toolCall).toBe(true)
    expect(derived.structuredOutput).toBe(true)
  })

  it('strips models.dev alias prefixes when deriving provider logo URLs', () => {
    const derived = toDerivedModel(buildModel({ id: '~anthropic/claude-haiku-latest' }), '2026-02-09')

    expect(derived.providerId).toBe('anthropic')
    expect(derived.providerLogoUrl).toBe('https://models.dev/logos/anthropic.svg')
  })
})

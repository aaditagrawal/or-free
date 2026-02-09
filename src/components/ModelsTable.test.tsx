import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { OpenRouterModel } from '../types/openrouter'
import { toDerivedModel } from '../lib/models'
import { ModelsTable } from './ModelsTable'

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

describe('ModelsTable', () => {
  it('shows incomplete provider badge only in include_incomplete mode', () => {
    const model = toDerivedModel(
      buildModel({
        id: 'incomplete',
        top_provider: { context_length: null, max_completion_tokens: null, is_moderated: false },
      }),
      '2026-02-09',
    )

    const { rerender } = render(
      <ModelsTable
        models={[model]}
        providerMode="strict"
        pricingFilter="free"
        sortKey="created"
        sortDirection="desc"
        onSortChange={vi.fn()}
      />,
    )

    expect(screen.queryByText(/INCOMPLETE PROVIDER LIMITS/i)).toBeNull()

    rerender(
      <ModelsTable
        models={[model]}
        providerMode="include_incomplete"
        pricingFilter="free"
        sortKey="created"
        sortDirection="desc"
        onSortChange={vi.fn()}
      />,
    )

    expect(screen.getByText(/INCOMPLETE PROVIDER LIMITS/i)).not.toBeNull()
  })

  it('expands row details and renders copy json button', async () => {
    const user = userEvent.setup()
    const model = toDerivedModel(buildModel({ id: 'expand-me' }), '2026-02-09')

    render(
      <ModelsTable
        models={[model]}
        providerMode="include_incomplete"
        pricingFilter="free"
        sortKey="created"
        sortDirection="desc"
        onSortChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Details/i }))

    expect(screen.getByRole('button', { name: /Copy JSON/i })).not.toBeNull()
  })
})

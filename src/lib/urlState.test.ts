import { describe, expect, it } from 'vitest'
import { buildInitialExplorerState, resolveInitialProviderMode } from '../state/useExplorerState'
import { createDefaultExplorerState, parseExplorerStateFromSearch, serializeExplorerState } from './urlState'

describe('url state serialization', () => {
  it('preserves providerMode on round-trip', () => {
    const state = {
      ...createDefaultExplorerState('include_incomplete'),
      q: 'llama',
      providerMode: 'include_incomplete' as const,
      providers: ['Llama3'],
      sortKey: 'name' as const,
      sortDirection: 'asc' as const,
    }

    const query = serializeExplorerState(state)
    const parsed = parseExplorerStateFromSearch(`?${query}`, 'strict')

    expect(parsed.providerMode).toBe('include_incomplete')
    expect(parsed.q).toBe('llama')
    expect(parsed.providers).toEqual(['Llama3'])
    expect(parsed.sortKey).toBe('name')
    expect(parsed.sortDirection).toBe('asc')
  })

  it('local storage provider mode is used when URL param is absent', () => {
    const mode = resolveInitialProviderMode('?q=test', 'include_incomplete')
    const initialState = buildInitialExplorerState('?q=test', 'include_incomplete')

    expect(mode).toBe('include_incomplete')
    expect(initialState.providerMode).toBe('include_incomplete')
  })

  it('URL provider mode overrides local storage mode', () => {
    const mode = resolveInitialProviderMode('?providerMode=strict', 'include_incomplete')
    const initialState = buildInitialExplorerState('?providerMode=strict', 'include_incomplete')

    expect(mode).toBe('strict')
    expect(initialState.providerMode).toBe('strict')
  })
})

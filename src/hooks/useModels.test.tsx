import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createModelResources } from '../lib/modelResources'
import { useModels } from './useModels'

function deferred() {
  let resolve!: (value: Response) => void
  const promise = new Promise<Response>((yes) => { resolve = yes })
  return { promise, resolve }
}
const json = (payload: unknown) => new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } })

const primaryPayload = { data: [{
  id: 'provider/primary:free', name: 'Primary', context_length: 8192,
  pricing: { prompt: '0', completion: '0' },
  architecture: { modality: 'text', input_modalities: ['text'], output_modalities: ['text'] },
  top_provider: { context_length: 8192, max_completion_tokens: 4096, is_moderated: false },
  supported_parameters: [],
}] }
const orcaPayload = { models: [{
  id: 'provider/orca:free', name: 'ORCA', author_name: 'Provider', created_at: '2026-01-01',
  input_modalities: ['text'], output_modalities: ['text'],
  providers: [{ pricing: { text_input: '0', text_output: '0' }, context_length: 4096,
    limits: { text_input_tokens: 4096, text_output_tokens: 2048 }, moderated: false, supported_parameters: [] }],
}] }
const metadataPayload = { openrouter: { models: {
  'provider/primary:free': { limit: { context: 32768, output: 8192 }, modalities: { input: ['text', 'image'], output: ['text'] }, tool_call: true },
} } }

beforeEach(() => { localStorage.clear() })
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers() })

describe('model source resources', () => {
  it('merges progressively, persists compatible caches, and refreshes all sources', async () => {
    const or = deferred()
    const orca = deferred()
    const modelsDev = deferred()
    const fetch = vi.fn((url: string) => url.includes('openrouter.ai') ? or.promise : url.includes('models.dev') ? modelsDev.promise : orca.promise)
    vi.stubGlobal('fetch', fetch)
    const sources = createModelResources()
    const { result, unmount } = renderHook(() => useModels(sources))
    expect(result.current.isLoading).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(3)
    await act(async () => { or.resolve(json(primaryPayload)) })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.data?.data.map((model) => model.id)).toEqual(['provider/primary:free'])
    expect(result.current.data?.data[0].context_length).toBe(8192)
    expect(JSON.parse(localStorage.getItem('or-free:models-cache:or:v1') ?? 'null').payload).toEqual(primaryPayload)
    await act(async () => { orca.resolve(json(orcaPayload)) })
    expect(result.current.data?.data.map((model) => model.id)).toEqual(['provider/primary:free', 'provider/orca:free'])
    await act(async () => { modelsDev.resolve(json(metadataPayload)) })
    expect(result.current.data?.data[0].context_length).toBe(32768)
    expect(result.current.data?.data[0].architecture.input_modalities).toEqual(['text', 'image'])
    expect(result.current.data?.data[0].supported_parameters).toContain('tools')
    await waitFor(() => expect(result.current.dataUpdatedAt).toBeGreaterThan(0))
    expect(localStorage.getItem('or-free:models-cache:orca:v1')).not.toBeNull()
    expect(localStorage.getItem('or-free:models-cache:models-dev:v1')).not.toBeNull()
    fetch.mockImplementation((url: string) => Promise.resolve(json(url.includes('models.dev') ? metadataPayload : url.includes('openrouter.ai') ? primaryPayload : orcaPayload)))
    await act(async () => { await result.current.refetch() })
    expect(fetch).toHaveBeenCalledTimes(6)
    expect(result.current.isError).toBe(false)
    expect(sources.or.getSnapshot().error).toBeNull()
    expect(sources.orca.getSnapshot().error).toBeNull()
    expect(sources.modelsDev.getSnapshot().error).toBeNull()
    unmount()
  })

  it('uses fresh caches without fetching and rejects expired, malformed and future timestamps', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)))
    const key = 'or-free:models-cache:or:v1'
    localStorage.setItem(key, JSON.stringify({ payload: { data: [] }, savedAt: Date.now() }))
    const fresh = createModelResources()
    const { result, unmount } = renderHook(() => useModels(fresh))
    expect(result.current.isLoading).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(2)
    unmount()
    for (const savedAt of [Date.now() - 86_400_001, Date.now() + 60_000, 'invalid', null]) {
      localStorage.setItem(key, JSON.stringify({ payload: { data: [] }, savedAt }))
      expect(createModelResources().or.getSnapshot().data).toBeUndefined()
    }
  })

  it('keeps one successful source usable and only reports both source failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('openrouter.ai') ? json({ data: [] }) : new Response('', { status: 503 })))
    vi.useFakeTimers()
    const sources = createModelResources()
    const { result, unmount } = renderHook(() => useModels(sources))
    await act(async () => { await vi.advanceTimersByTimeAsync(7_000) })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    unmount()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))
    localStorage.clear()
    const failedSources = createModelResources()
    const failed = renderHook(() => useModels(failedSources))
    await act(async () => { await vi.advanceTimersByTimeAsync(7_000) })
    expect(failed.result.current.isError).toBe(true)
    expect(failed.result.current.error).toBeInstanceOf(Error)
    failed.unmount()
    vi.useRealTimers()
  })

  it('ignores disabled storage without failing successful source requests', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('disabled') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    vi.stubGlobal('fetch', vi.fn(async (url: string) => json(url.includes('models.dev') ? { openrouter: { models: {} } } : url.includes('openrouter.ai') ? { data: [] } : { models: [] })))
    const sources = createModelResources()
    const { result, unmount } = renderHook(() => useModels(sources))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isError).toBe(false)
    unmount()
  })
})

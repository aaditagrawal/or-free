import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createResource } from './resource'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

const subscriptions: (() => void)[] = []
function observe<T>(resource: ReturnType<typeof createResource<T>>) {
  const unsubscribe = resource.subscribe(vi.fn())
  subscriptions.push(unsubscribe)
  return unsubscribe
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T00:00:00Z'))
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
})
afterEach(() => {
  subscriptions.splice(0).forEach((unsubscribe) => unsubscribe())
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('shared resources', () => {
  it('finishes unused logo requests and reuses their result after rows remount', async () => {
    const response = deferred<string>()
    const fetch = vi.fn<(signal: AbortSignal) => Promise<string>>().mockReturnValue(response.promise)
    const resource = createResource({ fetch, staleTime: 86_400_000, gcTime: 86_400_000, retries: 0, cancelOnUnused: false })
    const leave = resource.subscribe(vi.fn())
    await vi.advanceTimersByTimeAsync(0)
    leave()
    expect(fetch.mock.calls[0][0].aborted).toBe(false)
    response.resolve('<svg/>')
    await vi.advanceTimersByTimeAsync(0)
    observe(resource)
    expect(resource.getSnapshot().data).toBe('<svg/>')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('resumes an initially offline logo request even after its last row unmounts', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const fetch = vi.fn(async () => '<svg/>')
    const resource = createResource({ fetch, staleTime: 86_400_000, gcTime: 86_400_000, retries: 0, cancelOnUnused: false })
    const leave = resource.subscribe(vi.fn())
    leave()
    expect(fetch).not.toHaveBeenCalled()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(resource.getSnapshot().data).toBe('<svg/>')
    observe(resource)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('shares concurrent loads, keeps requests until the last subscriber leaves, and cancels stale writes', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const fetch = vi.fn<(signal: AbortSignal) => Promise<string>>()
      .mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const save = vi.fn()
    const resource = createResource({ fetch, onSuccess: save, staleTime: 100 })
    const one = resource.subscribe(vi.fn())
    const two = resource.subscribe(vi.fn())
    await vi.advanceTimersByTimeAsync(0)
    expect(fetch).toHaveBeenCalledTimes(1)
    const signal = fetch.mock.calls[0][0]
    one()
    expect(signal.aborted).toBe(false)
    two()
    expect(signal.aborted).toBe(true)
    observe(resource)
    await vi.advanceTimersByTimeAsync(0)
    second.resolve('new')
    await vi.advanceTimersByTimeAsync(0)
    first.resolve('obsolete')
    await vi.advanceTimersByTimeAsync(0)
    expect(resource.getSnapshot().data).toBe('new')
    expect(save).toHaveBeenCalledExactlyOnceWith('new')
  })

  it('keeps a fresh snapshot, polls while visible, and refreshes stale data on reconnect', async () => {
    const fetch = vi.fn(async () => 'fresh')
    const resource = createResource({
      fetch, staleTime: 300_000, interval: 300_000,
      initial: () => ({ payload: 'cached', savedAt: Date.now() }),
    })
    observe(resource)
    expect(resource.getSnapshot().data).toBe('cached')
    expect(fetch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(300_000)
    expect(fetch).toHaveBeenCalledTimes(1)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await vi.advanceTimersByTimeAsync(300_000)
    expect(fetch).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('retries three times with exponential delays, pausing offline and recovering on reconnect', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('1')).mockRejectedValueOnce(new Error('2')).mockRejectedValueOnce(new Error('3')).mockResolvedValue('recovered')
    const resource = createResource({ fetch, staleTime: 1 })
    observe(resource)
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetch).toHaveBeenCalledTimes(2)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await vi.advanceTimersByTimeAsync(2000)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(resource.getSnapshot().isLoading).toBe(false)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(fetch).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(4000)
    expect(fetch).toHaveBeenCalledTimes(4)
    expect(resource.getSnapshot()).toMatchObject({ data: 'recovered', error: null, isLoading: false })
  })

  it('surfaces failure after retries and retains data and timestamp on failed refresh', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('unavailable'))
    const resource = createResource({ fetch, staleTime: 100, retries: 0, initial: () => ({ payload: 'old', savedAt: Date.now() }) })
    observe(resource)
    const savedAt = resource.getSnapshot().dataUpdatedAt
    await resource.refetch()
    expect(resource.getSnapshot()).toMatchObject({ data: 'old', dataUpdatedAt: savedAt, isLoading: false })
    expect(resource.getSnapshot().error).toBeInstanceOf(Error)
  })

  it('supersedes a background refresh without letting it overwrite the newer response', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const fetch = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const resource = createResource({ fetch, staleTime: 1, initial: () => ({ payload: 'old', savedAt: Date.now() }) })
    observe(resource)
    void resource.refetch()
    await vi.advanceTimersByTimeAsync(0)
    void resource.refetch()
    await vi.advanceTimersByTimeAsync(0)
    second.resolve('latest')
    await vi.advanceTimersByTimeAsync(0)
    first.resolve('late')
    await vi.advanceTimersByTimeAsync(0)
    expect(resource.getSnapshot().data).toBe('latest')
  })

  it('preserves equal refreshed payload identity for model memoization', async () => {
    const initial = { data: [{ id: 'model', pricing: { prompt: '0', completion: '0' } }] }
    const fetch = vi.fn(async () => JSON.parse(JSON.stringify(initial)))
    const resource = createResource({ fetch, staleTime: 100, initial: () => ({ payload: initial, savedAt: Date.now() }) })
    observe(resource)
    await resource.refetch()
    expect(resource.getSnapshot().data).toBe(initial)
    const changed = structuredClone(initial)
    changed.data[0].pricing.prompt = '1'
    fetch.mockResolvedValue(changed)
    await resource.refetch()
    expect(resource.getSnapshot().data).not.toBe(initial)
    expect(resource.getSnapshot().data?.data[0].pricing.prompt).toBe('1')
  })

  it('retains unused logo data for 24h, expires it, and only refetches stale logos on focus', async () => {
    const fetch = vi.fn(async () => '<svg/>')
    const onUnused = vi.fn()
    const resource = createResource({ fetch, staleTime: 86_400_000, gcTime: 86_400_000, refreshOnFocus: true, retries: 0, onUnused })
    const leave = resource.subscribe(vi.fn())
    await vi.advanceTimersByTimeAsync(0)
    leave()
    await vi.advanceTimersByTimeAsync(86_399_999)
    const leaveAgain = resource.subscribe(vi.fn())
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)
    expect(fetch).toHaveBeenCalledTimes(2)
    leaveAgain()
    await vi.advanceTimersByTimeAsync(86_400_000)
    expect(onUnused).toHaveBeenCalledTimes(1)
    expect(resource.getSnapshot().data).toBeUndefined()
  })
})

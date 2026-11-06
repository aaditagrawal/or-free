export type ResourceSnapshot<T> = {
  data: T | undefined
  dataUpdatedAt: number
  error: unknown
  isLoading: boolean
}

type ResourceOptions<T> = {
  fetch: (signal: AbortSignal) => Promise<T>
  initial?: () => { payload: T; savedAt: number } | null
  onSuccess?: (payload: T) => void
  staleTime: number
  gcTime?: number
  interval?: number
  retries?: number
  refreshOnFocus?: boolean
  cancelOnUnused?: boolean
  onUnused?: () => void
}

// Resource payloads are JSON data or SVG text. Keep the previous root when a
// refreshed payload is equal so downstream model derivation can reuse its memo.
function samePayload(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false
  if (Array.isArray(left)) {
    if (!Array.isArray(right) || left.length !== right.length) return false
    return left.every((value, index) => samePayload(value, right[index]))
  }
  if (Array.isArray(right)) return false
  const keys = Object.keys(left)
  if (keys.length !== Object.keys(right).length) return false
  return keys.every((key) => Object.hasOwn(right, key) && samePayload(Reflect.get(left, key), Reflect.get(right, key)))
}

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

function isVisible() {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden'
}

// One shared request and immutable snapshot per resource. React only subscribes;
// timers, retry state and cancellation belong to the resource's lifetime.
export function createResource<T>(options: ResourceOptions<T>) {
  let snapshot: ResourceSnapshot<T> | undefined
  const listeners = new Set<() => void>()
  let active: AbortController | undefined
  let pending: Promise<ResourceSnapshot<T>> | undefined
  let poll: ReturnType<typeof setTimeout> | undefined
  let gc: ReturnType<typeof setTimeout> | undefined
  let resume: (() => void) | undefined

  function getSnapshot(): ResourceSnapshot<T> {
    if (!snapshot) {
      const cached = options.initial?.()
      snapshot = {
        data: cached?.payload,
        dataUpdatedAt: cached?.savedAt ?? 0,
        error: null,
        isLoading: !cached && isOnline(),
      }
    }
    return snapshot
  }

  function update(patch: Partial<ResourceSnapshot<T>>) {
    const previous = getSnapshot()
    const next = { ...previous, ...patch }
    if (next.data === previous.data && next.dataUpdatedAt === previous.dataUpdatedAt && next.error === previous.error && next.isLoading === previous.isLoading) return
    snapshot = next
    listeners.forEach((listener) => listener())
  }

  function stale() {
    const current = getSnapshot()
    return current.data === undefined || Date.now() - current.dataUpdatedAt >= options.staleTime
  }

  function schedulePoll() {
    clearTimeout(poll)
    if (listeners.size && options.interval) {
      poll = setTimeout(() => {
        if (isOnline() && isVisible()) void request()
        else schedulePoll()
      }, options.interval)
    }
  }

  function removeEvents() {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisibility)
  }

  function scheduleGc() {
    clearTimeout(gc)
    gc = setTimeout(() => {
      if (pending) return
      snapshot = undefined
      options.onUnused?.()
    }, options.gcTime ?? 5 * 60 * 1000)
  }

  function waitForReady(signal: AbortSignal, visible: boolean): Promise<void> {
    if (isOnline() && (!visible || isVisible())) return Promise.resolve()
    return new Promise((resolve) => {
      const finish = () => {
        signal.removeEventListener('abort', finish)
        resume = undefined
        resolve()
      }
      resume = () => {
        if (isOnline() && (!visible || isVisible())) finish()
      }
      signal.addEventListener('abort', finish, { once: true })
    })
  }

  function delay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const finish = () => {
        clearTimeout(timer)
        signal.removeEventListener('abort', finish)
        resolve()
      }
      const timer = setTimeout(finish, ms)
      signal.addEventListener('abort', finish, { once: true })
    })
  }

  function cancel() {
    active?.abort()
    active = undefined
    pending = undefined
    if (getSnapshot().isLoading) update({ isLoading: false })
  }

  function request(replace = false): Promise<ResourceSnapshot<T>> {
    if (pending) {
      // An initial load is shared even for repeated manual refreshes. A refresh
      // with existing data supersedes an older background refresh.
      if (!replace || getSnapshot().data === undefined) return pending
      cancel()
    }
    clearTimeout(poll)
    const controller = new AbortController()
    active = controller
    const { signal } = controller
    update(getSnapshot().data === undefined ? { isLoading: isOnline(), error: null } : {})
    pending = (async () => {
      for (let attempt = 0; !signal.aborted; attempt++) {
        if (!isOnline() || (attempt > 0 && !isVisible())) {
          update({ isLoading: false })
          await waitForReady(signal, attempt > 0)
        }
        if (signal.aborted) break
        update({ isLoading: getSnapshot().data === undefined })
        try {
          const data = await options.fetch(signal)
          if (signal.aborted || active !== controller) break
          options.onSuccess?.(data)
          const previous = getSnapshot().data
          update({ data: samePayload(previous, data) ? previous : data, dataUpdatedAt: Date.now(), error: null, isLoading: false })
          break
        } catch (error) {
          if (signal.aborted || active !== controller) break
          if (attempt >= (options.retries ?? 3)) {
            update({ error, isLoading: false })
            break
          }
          await delay(Math.min(1000 * 2 ** attempt, 30_000), signal)
        }
      }
      if (active === controller) {
        active = undefined
        pending = undefined
        if (listeners.size) schedulePoll()
        else {
          removeEvents()
          scheduleGc()
        }
      }
      return getSnapshot()
    })()
    return pending
  }

  function onOnline() {
    resume?.()
    if (!pending && stale()) void request()
  }

  function onVisibility() {
    resume?.()
    if (options.refreshOnFocus && isVisible() && !pending && stale()) void request()
  }

  function subscribe(listener: () => void) {
    clearTimeout(gc)
    listeners.add(listener)
    if (listeners.size === 1) {
      window.addEventListener('online', onOnline)
      document.addEventListener('visibilitychange', onVisibility)
      if (stale()) void request()
      else schedulePoll()
    }
    return () => {
      listeners.delete(listener)
      if (listeners.size) return
      clearTimeout(poll)
      if (options.cancelOnUnused !== false) cancel()
      if (!pending) removeEvents()
      scheduleGc()
    }
  }

  return { getSnapshot, getData: () => getSnapshot().data, subscribe, refetch: () => request(true) }
}

export type Resource<T> = ReturnType<typeof createResource<T>>

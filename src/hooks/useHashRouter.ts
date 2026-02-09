import { useCallback, useSyncExternalStore } from 'react'

export type Route = 'explorer' | 'request'

type HashState = {
  route: Route
  search: string
}

export function parseHash(hash: string): HashState {
  const stripped = hash.replace(/^#\/?/, '')
  const [segment, ...rest] = stripped.split('?')
  const route = segment === 'request' ? 'request' : 'explorer'
  const search = rest.join('?')
  return { route, search: search ? `?${search}` : '' }
}

export function buildHash(route: Route, search?: string): string {
  const q = search ? search.replace(/^\??/, '?') : ''
  return `#/${route}${q}`
}

function getSnapshot(): string {
  return window.location.hash
}

function getServerSnapshot(): string {
  return '#/explorer'
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('hashchange', onStoreChange)
  return () => window.removeEventListener('hashchange', onStoreChange)
}

export function useHashRouter() {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const { route, search } = parseHash(hash)

  const navigate = useCallback((nextRoute: Route, nextSearch?: string) => {
    window.location.hash = buildHash(nextRoute, nextSearch)
  }, [])

  return { route, search, navigate }
}

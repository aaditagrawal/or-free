import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildHash, parseHash } from '../hooks/useHashRouter'
import type { ExplorerState, ProviderMode } from '../types/explorer'
import {
  createDefaultExplorerState,
  parseExplorerStateFromSearch,
  parseProviderMode,
  PROVIDER_MODE_STORAGE_KEY,
  serializeExplorerState,
} from '../lib/urlState'

type ListField =
  | 'providers'
  | 'inputModalities'
  | 'outputModalities'
  | 'instructTypes'
  | 'supportedParameters'

function readStoredProviderMode(): ProviderMode | null {
  const stored = window.localStorage.getItem(PROVIDER_MODE_STORAGE_KEY)
  return parseProviderMode(stored)
}

export function resolveInitialProviderMode(
  search: string,
  storedProviderMode: ProviderMode | null,
): ProviderMode {
  const params = new URLSearchParams(search)
  const urlProviderMode = parseProviderMode(params.get('providerMode'))

  return urlProviderMode ?? storedProviderMode ?? 'include_incomplete'
}

export function buildInitialExplorerState(
  search: string,
  storedProviderMode: ProviderMode | null,
): ExplorerState {
  const fallbackMode = resolveInitialProviderMode(search, storedProviderMode)
  return parseExplorerStateFromSearch(search, fallbackMode)
}

export function useExplorerState(hashSearch: string) {
  const [state, setState] = useState<ExplorerState>(() =>
    buildInitialExplorerState(hashSearch, readStoredProviderMode()),
  )

  const isInternalUpdate = useRef(false)

  useEffect(() => {
    const { route } = parseHash(window.location.hash)
    if (route !== 'explorer') return

    const search = serializeExplorerState(state)
    const nextHash = buildHash('explorer', search ? `?${search}` : undefined)

    if (window.location.hash !== nextHash) {
      isInternalUpdate.current = true
      window.history.replaceState(null, '', nextHash)
    }

    window.localStorage.setItem(PROVIDER_MODE_STORAGE_KEY, state.providerMode)
  }, [state])

  useEffect(() => {
    const onHashChange = () => {
      if (isInternalUpdate.current) {
        isInternalUpdate.current = false
        return
      }

      const { route, search } = parseHash(window.location.hash)
      if (route !== 'explorer') return

      const fallbackMode = readStoredProviderMode() ?? 'include_incomplete'
      setState(parseExplorerStateFromSearch(search, fallbackMode))
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const update = useCallback((patch: Partial<ExplorerState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const toggleListFilter = useCallback((key: ListField, value: string) => {
    setState((prev) => {
      const currentSet = new Set(prev[key])
      if (currentSet.has(value)) {
        currentSet.delete(value)
      } else {
        currentSet.add(value)
      }

      return {
        ...prev,
        [key]: [...currentSet].sort((a, b) => a.localeCompare(b)),
      }
    })
  }, [])

  const clearFilters = useCallback(() => {
    setState((prev) => {
      const defaults = createDefaultExplorerState(prev.providerMode)
      return {
        ...defaults,
        providerMode: prev.providerMode,
      }
    })
  }, [])

  const setProviderMode = useCallback((providerMode: ProviderMode) => {
    setState((prev) => ({ ...prev, providerMode }))
  }, [])

  const setSort = useCallback((sortKey: ExplorerState['sortKey'], sortDirection?: ExplorerState['sortDirection']) => {
    setState((prev) => ({
      ...prev,
      sortKey,
      sortDirection: sortDirection ?? prev.sortDirection,
    }))
  }, [])

  return useMemo(
    () => ({
      state,
      update,
      setState,
      setProviderMode,
      toggleListFilter,
      clearFilters,
      setSort,
    }),
    [clearFilters, setProviderMode, setSort, state, toggleListFilter, update],
  )
}

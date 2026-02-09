import { useMemo, useState, useEffect } from 'react'
import { CommandPalette } from './components/CommandPalette'
import { EmptyState } from './components/EmptyState'
import { ErrorState } from './components/ErrorState'
import { Header } from './components/Header'
import { ModelsTable } from './components/ModelsTable'
import { Toolbar } from './components/Toolbar'
import { useHashRouter } from './hooks/useHashRouter'
import { useModels } from './hooks/useModels'
import { useTheme } from './hooks/useTheme'
import { applyExplorerFilters } from './lib/filterSort'
import { deriveModels, getFacets, getUtcDateStamp, selectActiveModels } from './lib/models'
import { useExplorerState } from './state/useExplorerState'

function formatUpdatedAt(timestamp: number): string {
  if (!timestamp) {
    return 'Not yet loaded'
  }

  const d = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function App() {
  const todayUtc = getUtcDateStamp()
  const { search } = useHashRouter()
  const [isPaletteOpen, setPaletteOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const { state, update, toggleListFilter, clearFilters, setProviderMode, setSort } = useExplorerState(search)
  const { theme, toggleTheme } = useTheme()

  const modelsQuery = useModels()
  const models = useMemo(() => modelsQuery.data?.data ?? [], [modelsQuery.data])

  const derived = useMemo(() => deriveModels(models, todayUtc), [models, todayUtc])
  const freeAndUnexpired = useMemo(
    () => derived.filter((model) => model.isFree && model.isUnexpired),
    [derived],
  )

  const activeModels = useMemo(
    () => selectActiveModels(models, state.providerMode, state.pricingFilter, todayUtc),
    [models, state.providerMode, state.pricingFilter, todayUtc],
  )

  const filteredModels = useMemo(
    () => applyExplorerFilters(activeModels, state, todayUtc),
    [activeModels, state, todayUtc],
  )

  const facetSource = useMemo(
    () => (state.pricingFilter === 'free' ? freeAndUnexpired : derived.filter((m) => m.isUnexpired)),
    [state.pricingFilter, freeAndUnexpired, derived],
  )
  const facets = useMemo(() => getFacets(facetSource), [facetSource])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((prev) => !prev)
      }

      if (event.key === 'Escape') {
        setPaletteOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setNotice('Share URL copied to clipboard')
      window.setTimeout(() => setNotice(null), 1800)
    } catch {
      setNotice('Clipboard access failed')
      window.setTimeout(() => setNotice(null), 1800)
    }
  }

  return (
    <div className="app-shell">
      <main className="app-layout">
        <Header
          totalCount={models.length}
          freeCount={freeAndUnexpired.length}
          visibleCount={filteredModels.length}
          providerMode={state.providerMode}
          pricingFilter={state.pricingFilter}
          lastUpdatedText={formatUpdatedAt(modelsQuery.dataUpdatedAt)}
          onRefresh={() => void modelsQuery.refetch()}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <Toolbar
          state={state}
          facets={facets}
          onUpdate={update}
          onToggleListFilter={toggleListFilter}
          onOpenPalette={() => setPaletteOpen(true)}
          onClearFilters={clearFilters}
          onProviderModeChange={setProviderMode}
        />

        {notice ? <p className="notice-banner">{notice}</p> : null}

        {modelsQuery.isLoading ? (
          <section className="panel state-panel">
            <h2>Loading models...</h2>
          </section>
        ) : null}

        {modelsQuery.isError ? (
          <ErrorState
            message={modelsQuery.error instanceof Error ? modelsQuery.error.message : 'Unknown request error'}
            onRetry={() => void modelsQuery.refetch()}
          />
        ) : null}

        {!modelsQuery.isLoading && !modelsQuery.isError && filteredModels.length === 0 ? (
          <EmptyState hasModels={freeAndUnexpired.length > 0} />
        ) : null}

        {!modelsQuery.isLoading && !modelsQuery.isError && filteredModels.length > 0 ? (
          <ModelsTable
            models={filteredModels}
            providerMode={state.providerMode}
            pricingFilter={state.pricingFilter}
            sortKey={state.sortKey}
            sortDirection={state.sortDirection}
            onSortChange={setSort}
          />
        ) : null}
      </main>

      <CommandPalette
        open={isPaletteOpen}
        onOpenChange={setPaletteOpen}
        state={state}
        models={activeModels}
        providerFacets={facets.providers}
        onUpdate={update}
        onToggleProvider={(provider) => toggleListFilter('providers', provider)}
        onProviderModeChange={setProviderMode}
        onSortChange={setSort}
        onClearFilters={clearFilters}
        onRefresh={() => void modelsQuery.refetch()}
        onCopyShareUrl={handleCopyShareUrl}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </div>
  )
}

export default App

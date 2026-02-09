import type { ExplorerState, PricingFilter, ProviderMode, SortDirection, SortKey } from '../types/explorer'
import { FilterGroup } from './FilterGroup'

type Facets = {
  providers: string[]
  inputModalities: string[]
  outputModalities: string[]
  instructTypes: string[]
  supportedParameters: string[]
}

type FilterPanelProps = {
  state: ExplorerState
  facets: Facets
  onUpdate: (patch: Partial<ExplorerState>) => void
  onToggleListFilter: (
    key:
      | 'providers'
      | 'inputModalities'
      | 'outputModalities'
      | 'instructTypes'
      | 'supportedParameters',
    value: string,
  ) => void
  onOpenPalette: () => void
  onClearFilters: () => void
  onProviderModeChange: (mode: ProviderMode) => void
}

const SORT_KEY_OPTIONS: Array<{ label: string; value: SortKey }> = [
  { label: 'Newest', value: 'created' },
  { label: 'Model ID', value: 'id' },
  { label: 'Name', value: 'name' },
  { label: 'Context length', value: 'context' },
  { label: 'Max completion tokens', value: 'max_completion' },
  { label: 'Expiration', value: 'expiration' },
]

const SORT_DIRECTION_OPTIONS: Array<{ label: string; value: SortDirection }> = [
  { label: 'Descending', value: 'desc' },
  { label: 'Ascending', value: 'asc' },
]

function countActiveFilters(state: ExplorerState): number {
  let count = 0

  if (state.providers.length > 0) count += 1
  if (state.inputModalities.length > 0) count += 1
  if (state.outputModalities.length > 0) count += 1
  if (state.instructTypes.length > 0) count += 1
  if (state.supportedParameters.length > 0) count += 1
  if (state.moderated !== 'all') count += 1
  if (state.expiryMode !== 'all') count += 1
  if (state.minContextLength != null) count += 1
  if (state.minMaxCompletionTokens != null) count += 1
  if (state.createdFrom != null) count += 1
  if (state.createdTo != null) count += 1

  return count
}

export function FilterPanel({
  state,
  facets,
  onUpdate,
  onToggleListFilter,
  onOpenPalette,
  onClearFilters,
  onProviderModeChange,
}: FilterPanelProps) {
  const activeFilterCount = countActiveFilters(state)

  return (
    <section className="panel filter-panel" aria-label="Search, settings and filters">
      <div className="fp-search">
        <label className="field search-field">
          <span>Search</span>
          <input
            type="search"
            value={state.q}
            onChange={(event) => onUpdate({ q: event.target.value })}
            placeholder="id, name, slug, description"
          />
        </label>
      </div>

      <div className="fp-controls">
        <label className="field compact-field">
          <span>Pricing</span>
          <select
            value={state.pricingFilter}
            onChange={(event) => onUpdate({ pricingFilter: event.target.value as PricingFilter })}
            aria-label="Pricing filter"
          >
            <option value="free">Free only</option>
            <option value="all">All (incl. paid)</option>
          </select>
        </label>

        <label className="field compact-field">
          <span>Provider mode</span>
          <select
            value={state.providerMode}
            onChange={(event) => onProviderModeChange(event.target.value as ProviderMode)}
            aria-label="Provider readiness mode"
          >
            <option value="include_incomplete">Include incomplete</option>
            <option value="strict">Strict</option>
          </select>
        </label>

        <label className="field compact-field">
          <span>Sort</span>
          <select
            value={state.sortKey}
            onChange={(event) => onUpdate({ sortKey: event.target.value as SortKey })}
            aria-label="Sort key"
          >
            {SORT_KEY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field compact-field">
          <span>Direction</span>
          <select
            value={state.sortDirection}
            onChange={(event) => onUpdate({ sortDirection: event.target.value as SortDirection })}
            aria-label="Sort direction"
          >
            {SORT_DIRECTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field compact-field">
          <span>Moderation</span>
          <select
            value={state.moderated}
            onChange={(event) => onUpdate({ moderated: event.target.value as ExplorerState['moderated'] })}
            aria-label="Moderation filter"
          >
            <option value="all">All</option>
            <option value="true">Moderated</option>
            <option value="false">Unmoderated</option>
          </select>
        </label>

        <label className="field compact-field">
          <span>Expiration</span>
          <select
            value={state.expiryMode}
            onChange={(event) => onUpdate({ expiryMode: event.target.value as ExplorerState['expiryMode'] })}
            aria-label="Expiration filter"
          >
            <option value="all">All</option>
            <option value="no-expiry">No expiry date</option>
            <option value="expiring-soon">Expiring soon</option>
          </select>
        </label>

        <label className="field compact-field">
          <span>Min context length</span>
          <input
            type="number"
            min={0}
            value={state.minContextLength ?? ''}
            onChange={(event) =>
              onUpdate({
                minContextLength: event.target.value ? Number(event.target.value) : null,
              })
            }
            placeholder="32768"
          />
        </label>

        <label className="field compact-field">
          <span>Min max completion</span>
          <input
            type="number"
            min={0}
            value={state.minMaxCompletionTokens ?? ''}
            onChange={(event) =>
              onUpdate({
                minMaxCompletionTokens: event.target.value ? Number(event.target.value) : null,
              })
            }
            placeholder="8192"
          />
        </label>

        <label className="field compact-field">
          <span>Created from</span>
          <input
            type="date"
            value={state.createdFrom ?? ''}
            onChange={(event) => onUpdate({ createdFrom: event.target.value || null })}
          />
        </label>

        <label className="field compact-field">
          <span>Created to</span>
          <input
            type="date"
            value={state.createdTo ?? ''}
            onChange={(event) => onUpdate({ createdTo: event.target.value || null })}
          />
        </label>
      </div>

      <div className="fp-utility">
        <p className="filters-summary">{activeFilterCount} filters active</p>
        <button type="button" className="button" onClick={onClearFilters}>
          Reset filters
        </button>
        <button type="button" className="button button-accent" onClick={onOpenPalette}>
          Cmd/Ctrl + K
        </button>
      </div>

      <div className="fp-chips">
        <FilterGroup
          title="Providers"
          options={facets.providers}
          selected={state.providers}
          onToggle={(value) => onToggleListFilter('providers', value)}
        />
        <FilterGroup
          title="Input modalities"
          options={facets.inputModalities}
          selected={state.inputModalities}
          onToggle={(value) => onToggleListFilter('inputModalities', value)}
        />
        <FilterGroup
          title="Output modalities"
          options={facets.outputModalities}
          selected={state.outputModalities}
          onToggle={(value) => onToggleListFilter('outputModalities', value)}
        />
        <FilterGroup
          title="Instruct format"
          options={facets.instructTypes}
          selected={state.instructTypes}
          onToggle={(value) => onToggleListFilter('instructTypes', value)}
          formatOption={(value) => (value === 'null' ? 'none' : value)}
        />
        <FilterGroup
          title="Parameters"
          options={facets.supportedParameters}
          selected={state.supportedParameters}
          onToggle={(value) => onToggleListFilter('supportedParameters', value)}
          maxVisible={18}
        />
      </div>
    </section>
  )
}

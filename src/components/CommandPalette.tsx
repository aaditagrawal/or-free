import { Command } from 'cmdk'
import { useMemo } from 'react'
import type { DerivedModel, ExplorerState, ProviderMode, SortDirection, SortKey } from '../types/explorer'

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: ExplorerState
  models: DerivedModel[]
  providerFacets: string[]
  onUpdate: (patch: Partial<ExplorerState>) => void
  onToggleProvider: (provider: string) => void
  onProviderModeChange: (mode: ProviderMode) => void
  onSortChange: (key: SortKey, direction: SortDirection) => void
  onClearFilters: () => void
  onRefresh: () => void
  onCopyShareUrl: () => Promise<void>
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

type PaletteAction = {
  id: string
  group: string
  label: string
  keywords: string
  run: () => void | Promise<void>
}

export function CommandPalette({
  open,
  onOpenChange,
  state,
  models,
  providerFacets,
  onUpdate,
  onToggleProvider,
  onProviderModeChange,
  onSortChange,
  onClearFilters,
  onRefresh,
  onCopyShareUrl,
  theme,
  onToggleTheme,
}: CommandPaletteProps) {
  const actions = useMemo<PaletteAction[]>(() => {
    const quickProviderActions = providerFacets.slice(0, 8).map((provider) => ({
      id: `provider-${provider}`,
      group: 'Providers',
      label: `${state.providers.includes(provider) ? 'Disable' : 'Enable'} provider: ${provider}`,
      keywords: `provider ${provider}`,
      run: () => onToggleProvider(provider),
    }))

    return [
      {
        id: 'pricing-free',
        group: 'Settings',
        label: `Pricing: Free only${state.pricingFilter === 'free' ? ' (active)' : ''}`,
        keywords: 'pricing free only models',
        run: () => onUpdate({ pricingFilter: 'free' }),
      },
      {
        id: 'pricing-all',
        group: 'Settings',
        label: `Pricing: All models${state.pricingFilter === 'all' ? ' (active)' : ''}`,
        keywords: 'pricing all paid non-free models',
        run: () => onUpdate({ pricingFilter: 'all' }),
      },
      {
        id: 'provider-strict',
        group: 'Settings',
        label: `Provider mode: Strict${state.providerMode === 'strict' ? ' (active)' : ''}`,
        keywords: 'provider mode strict complete metadata',
        run: () => onProviderModeChange('strict'),
      },
      {
        id: 'provider-include',
        group: 'Settings',
        label: `Provider mode: Include incomplete${
          state.providerMode === 'include_incomplete' ? ' (active)' : ''
        }`,
        keywords: 'provider mode include incomplete warning badge',
        run: () => onProviderModeChange('include_incomplete'),
      },
      {
        id: 'sort-newest',
        group: 'Sort',
        label: 'Sort: Newest first',
        keywords: 'sort created newest',
        run: () => onSortChange('created', 'desc'),
      },
      {
        id: 'sort-id',
        group: 'Sort',
        label: 'Sort: Model ID ascending',
        keywords: 'sort id alphabetical',
        run: () => onSortChange('id', 'asc'),
      },
      {
        id: 'sort-context',
        group: 'Sort',
        label: 'Sort: Largest context first',
        keywords: 'sort context tokens',
        run: () => onSortChange('context', 'desc'),
      },
      {
        id: 'sort-cheapest',
        group: 'Sort',
        label: 'Sort: Cheapest first',
        keywords: 'sort price cost cheap pricing',
        run: () => onSortChange('prompt_price', 'asc'),
      },
      {
        id: 'sort-expensive',
        group: 'Sort',
        label: 'Sort: Most expensive first',
        keywords: 'sort price cost expensive pricing',
        run: () => onSortChange('prompt_price', 'desc'),
      },
      {
        id: 'moderated-all',
        group: 'Filters',
        label: 'Moderation filter: All',
        keywords: 'moderation all',
        run: () => onUpdate({ moderated: 'all' }),
      },
      {
        id: 'moderated-true',
        group: 'Filters',
        label: 'Moderation filter: Moderated only',
        keywords: 'moderation true',
        run: () => onUpdate({ moderated: 'true' }),
      },
      {
        id: 'moderated-false',
        group: 'Filters',
        label: 'Moderation filter: Unmoderated only',
        keywords: 'moderation false',
        run: () => onUpdate({ moderated: 'false' }),
      },
      {
        id: 'expiry-all',
        group: 'Filters',
        label: 'Expiration filter: All',
        keywords: 'expiration all',
        run: () => onUpdate({ expiryMode: 'all' }),
      },
      {
        id: 'expiry-none',
        group: 'Filters',
        label: 'Expiration filter: No expiration date',
        keywords: 'expiration none no expiry',
        run: () => onUpdate({ expiryMode: 'no-expiry' }),
      },
      {
        id: 'expiry-soon',
        group: 'Filters',
        label: 'Expiration filter: Expiring in 30 days',
        keywords: 'expiration soon 30 days',
        run: () => onUpdate({ expiryMode: 'expiring-soon' }),
      },
      ...quickProviderActions,
      {
        id: 'clear',
        group: 'Actions',
        label: 'Clear all filters',
        keywords: 'reset clear filters',
        run: onClearFilters,
      },
      {
        id: 'refresh',
        group: 'Actions',
        label: 'Refresh data now',
        keywords: 'reload refetch refresh',
        run: onRefresh,
      },
      {
        id: 'copy-link',
        group: 'Actions',
        label: 'Copy share URL',
        keywords: 'copy share link url',
        run: onCopyShareUrl,
      },
      {
        id: 'toggle-theme',
        group: 'Actions',
        label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`,
        keywords: 'theme dark light mode toggle',
        run: onToggleTheme,
      },
    ]
  }, [
    onClearFilters,
    onCopyShareUrl,
    onProviderModeChange,
    onRefresh,
    onSortChange,
    onToggleProvider,
    onToggleTheme,
    onUpdate,
    providerFacets,
    state.pricingFilter,
    state.providerMode,
    state.providers,
    theme,
  ])

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteAction[]>()

    for (const action of actions) {
      const current = map.get(action.group) ?? []
      current.push(action)
      map.set(action.group, current)
    }

    return [...map.entries()]
  }, [actions])

  if (!open) {
    return null
  }

  return (
    <div className="palette-root" role="dialog" aria-modal="true" aria-label="Command palette">
      <button className="palette-backdrop" onClick={() => onOpenChange(false)} aria-label="Close command palette" />
      <div className="palette-shell">
        <Command label="Command palette" className="palette-command">
          <Command.Input placeholder="Type a command or filter..." autoFocus className="palette-input" />
          <Command.List className="palette-list">
            <Command.Empty>No results found.</Command.Empty>
            {grouped.map(([groupName, groupActions]) => (
              <Command.Group key={groupName} heading={groupName}>
                {groupActions.map((action) => (
                  <Command.Item
                    key={action.id}
                    value={`${action.label} ${action.keywords}`}
                    onSelect={() => {
                      void action.run()
                      onOpenChange(false)
                    }}
                    className="palette-item"
                  >
                    {action.label}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
            <Command.Group heading="Models">
              {models.map((model) => (
                <Command.Item
                  key={model.id}
                  value={`${model.id} ${model.name} ${model.description}`}
                  onSelect={() => {
                    onUpdate({ q: model.id })
                    onOpenChange(false)
                  }}
                  className="palette-item palette-model-item"
                >
                  <span className="palette-model-name">{model.name}</span>
                  <span className="palette-model-id">{model.id}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}

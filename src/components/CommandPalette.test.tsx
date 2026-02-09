import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ExplorerState } from '../types/explorer'
import { CommandPalette } from './CommandPalette'

function buildState(): ExplorerState {
  return {
    q: '',
    providers: [],
    inputModalities: [],
    outputModalities: [],
    instructTypes: [],
    supportedParameters: [],
    moderated: 'all',
    minContextLength: null,
    minMaxCompletionTokens: null,
    createdFrom: null,
    createdTo: null,
    expiryMode: 'all',
    pricingFilter: 'free',
    providerMode: 'strict',
    sortKey: 'created',
    sortDirection: 'desc',
  }
}

describe('CommandPalette', () => {
  it('switches provider mode to include_incomplete from command action', async () => {
    const user = userEvent.setup()
    const onProviderModeChange = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        state={buildState()}
        models={[]}
        providerFacets={['Llama3']}
        onUpdate={vi.fn()}
        onToggleProvider={vi.fn()}
        onProviderModeChange={onProviderModeChange}
        onSortChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRefresh={vi.fn()}
        onCopyShareUrl={vi.fn(async () => undefined)}
        theme="dark"
        onToggleTheme={vi.fn()}
      />,
    )

    await user.click(screen.getByText(/Provider mode: Include incomplete/i))

    expect(onProviderModeChange).toHaveBeenCalledWith('include_incomplete')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('runs copy share url action', async () => {
    const user = userEvent.setup()
    const onCopyShareUrl = vi.fn(async () => undefined)

    render(
      <CommandPalette
        open
        onOpenChange={vi.fn()}
        state={buildState()}
        models={[]}
        providerFacets={['Llama3']}
        onUpdate={vi.fn()}
        onToggleProvider={vi.fn()}
        onProviderModeChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRefresh={vi.fn()}
        onCopyShareUrl={onCopyShareUrl}
        theme="dark"
        onToggleTheme={vi.fn()}
      />,
    )

    await user.click(screen.getByText(/Copy share URL/i))

    expect(onCopyShareUrl).toHaveBeenCalledTimes(1)
  })
})

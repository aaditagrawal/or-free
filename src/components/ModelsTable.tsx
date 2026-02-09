import clsx from 'clsx'
import { Fragment, useCallback, useMemo, useState } from 'react'
import type { DerivedModel, PricingFilter, ProviderMode, SortDirection, SortKey } from '../types/explorer'
import { ModelRowExpanded } from './ModelRowExpanded'

type ModelsTableProps = {
  models: DerivedModel[]
  providerMode: ProviderMode
  pricingFilter: PricingFilter
  sortKey: SortKey
  sortDirection: SortDirection
  onSortChange: (key: SortKey, direction: SortDirection) => void
}

const SORTABLE_HEADERS: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: 'Model' },
  { key: 'context', label: 'Context' },
  { key: 'max_completion', label: 'Max output' },
  { key: 'expiration', label: 'Expiration' },
]

function formatNumber(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return 'n/a'
  }

  return Intl.NumberFormat().format(value)
}

function getNextSortDirection(key: SortKey, activeSortKey: SortKey, activeDirection: SortDirection) {
  if (key === activeSortKey) {
    return activeDirection === 'asc' ? 'desc' : 'asc'
  }

  if (key === 'id' || key === 'name' || key === 'prompt_price') {
    return 'asc'
  }

  return 'desc'
}

function getRowId(id: string) {
  return `model-row-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free'
  const perMillion = price * 1_000_000
  return `$${perMillion.toFixed(2)}/M`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [text])

  return (
    <button
      type="button"
      className="copy-button"
      onClick={(e) => {
        e.stopPropagation()
        handleCopy()
      }}
      aria-label={`Copy ${text}`}
      title="Copy model ID"
    >
      {copied ? '✓' : '⧉'}
    </button>
  )
}

export function ModelsTable({
  models,
  providerMode,
  pricingFilter,
  sortKey,
  sortDirection,
  onSortChange,
}: ModelsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const rows = useMemo(() => models, [models])

  const toggleRow = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <section className="panel table-panel" aria-label="Model results">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Row</th>
              {SORTABLE_HEADERS.map((header) => {
                const active = header.key === sortKey
                return (
                  <th key={header.key}>
                    <button
                      type="button"
                      className={clsx('sort-button', active && 'sort-active')}
                      onClick={() =>
                        onSortChange(
                          header.key,
                          getNextSortDirection(header.key, sortKey, sortDirection),
                        )
                      }
                    >
                      {header.label}
                      {active ? (sortDirection === 'asc' ? ' [asc]' : ' [desc]') : ''}
                    </button>
                  </th>
                )
              })}
              {pricingFilter === 'all' ? (
                <th>
                  <button
                    type="button"
                    className={clsx('sort-button', sortKey === 'prompt_price' && 'sort-active')}
                    onClick={() =>
                      onSortChange(
                        'prompt_price',
                        getNextSortDirection('prompt_price', sortKey, sortDirection),
                      )
                    }
                  >
                    Pricing
                    {sortKey === 'prompt_price' ? (sortDirection === 'asc' ? ' [asc]' : ' [desc]') : ''}
                  </button>
                </th>
              ) : null}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((model) => {
              const isOpen = expanded.has(model.id)
              const showIncompleteWarning = providerMode === 'include_incomplete' && !model.isProviderReady
              const isPaid = !model.isFree
              const rowId = getRowId(model.id)

              return (
                <Fragment key={model.id}>
                  <tr className={clsx(showIncompleteWarning && 'row-warning', isPaid && 'row-paid')}>
                    <td className="td-actions">
                      <button
                        type="button"
                        className="button button-small"
                        onClick={() => toggleRow(model.id)}
                        aria-expanded={isOpen}
                        aria-controls={rowId}
                      >
                        {isOpen ? 'Hide' : 'Details'}
                      </button>
                    </td>
                    <td className="td-model">
                      <div className="model-name-cell">
                        <strong>{model.name}</strong>
                        <span className="model-id-row">
                          {model.id}
                          <CopyButton text={model.id} />
                        </span>
                      </div>
                      {showIncompleteWarning ? (
                        <span className="badge badge-warning">
                          INCOMPLETE PROVIDER LIMITS
                          <span className="info-icon" data-tooltip="This model is missing a listed context_length or max_completion_tokens in its upstream provider metadata">i</span>
                        </span>
                      ) : null}
                      {isPaid ? (
                        <span className="badge badge-paid">PAID</span>
                      ) : null}
                    </td>
                    <td data-label="Context">{formatNumber(model.contextLength)}</td>
                    <td data-label="Max output">{formatNumber(model.maxCompletionTokens)}</td>
                    <td data-label="Expiration">{model.expirationDate ?? 'none'}</td>
                    {pricingFilter === 'all' ? (
                      <td data-label="Pricing">
                        <div className="pricing-cell">
                          <span>In: {formatPrice(model.promptPrice)}</span>
                          <span>Out: {formatPrice(model.completionPrice)}</span>
                        </div>
                      </td>
                    ) : null}
                    <td data-label="Status">
                      <div className="status-cell">
                        <span>{model.moderated ? 'Moderated' : 'Unmoderated'}</span>
                        <span>{model.inputModalities.join(', ') || 'n/a'}</span>
                      </div>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr id={rowId} className="row-expanded">
                      <td colSpan={pricingFilter === 'all' ? 7 : 6}>
                        <ModelRowExpanded
                          model={model}
                          showIncompleteWarning={showIncompleteWarning}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

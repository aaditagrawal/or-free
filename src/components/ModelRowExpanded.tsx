import { useState } from 'react'
import type { DerivedModel } from '../types/explorer'
import type { OpenRouterPricing } from '../types/openrouter'

type ModelRowExpandedProps = {
  model: DerivedModel
  showIncompleteWarning: boolean
}

function formatValue(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return 'n/a'
  }

  return Intl.NumberFormat().format(value)
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatJson(model: DerivedModel): string {
  return JSON.stringify(model.raw, null, 2)
}

const PRICING_LABELS: Array<{ key: keyof OpenRouterPricing; label: string }> = [
  { key: 'prompt', label: 'Prompt' },
  { key: 'completion', label: 'Completion' },
  { key: 'request', label: 'Request' },
  { key: 'image', label: 'Image' },
  { key: 'image_token', label: 'Image token' },
  { key: 'image_output', label: 'Image output' },
  { key: 'audio', label: 'Audio' },
  { key: 'audio_output', label: 'Audio output' },
  { key: 'input_audio_cache', label: 'Audio cache' },
  { key: 'web_search', label: 'Web search' },
  { key: 'internal_reasoning', label: 'Internal reasoning' },
  { key: 'input_cache_read', label: 'Cache read' },
  { key: 'input_cache_write', label: 'Cache write' },
  { key: 'discount', label: 'Discount' },
]

export function ModelRowExpanded({ model, showIncompleteWarning }: ModelRowExpandedProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyJson = async () => {
    const json = formatJson(model)

    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const pricingEntries = PRICING_LABELS.filter(
    ({ key }) => model.raw.pricing[key] != null,
  )

  const defaultParams = model.raw.default_parameters ?? {}
  const paramEntries = Object.entries(defaultParams).filter(([, v]) => v != null)

  return (
    <div className="expanded-panel">
      <div className="expanded-top">
        <p className="expanded-description">{model.description || 'No description provided by OpenRouter.'}</p>
        {showIncompleteWarning && !model.isProviderReady ? (
          <p className="warning-inline">Incomplete provider token limits in upstream metadata.</p>
        ) : null}
      </div>

      <div className="expanded-section">
        <h4 className="expanded-section-title">Model</h4>
        <dl className="expanded-grid">
          <div>
            <dt>ID</dt>
            <dd>{model.id}</dd>
          </div>
          <div>
            <dt>Canonical slug</dt>
            <dd>{model.canonicalSlug}</dd>
          </div>
          <div>
            <dt>Name</dt>
            <dd>{model.name}</dd>
          </div>
          <div>
            <dt>Hugging Face ID</dt>
            <dd className={model.raw.hugging_face_id ? undefined : 'dd-dim'}>{model.raw.hugging_face_id ?? 'n/a'}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDate(model.createdIso)}</dd>
          </div>
          <div>
            <dt>Expiration date</dt>
            <dd className={model.expirationDate ? undefined : 'dd-dim'}>{model.expirationDate ?? 'None'}</dd>
          </div>
        </dl>
      </div>

      <div className="expanded-section">
        <h4 className="expanded-section-title">Provider</h4>
        <dl className="expanded-grid">
          <div>
            <dt>Context length</dt>
            <dd>{formatValue(model.contextLength)}</dd>
          </div>
          <div>
            <dt>Provider context</dt>
            <dd>
              {formatValue(
                model.raw.top_provider.context_length == null
                  ? null
                  : Number(model.raw.top_provider.context_length),
              )}
            </dd>
          </div>
          <div>
            <dt>Max completion tokens</dt>
            <dd className={model.maxCompletionTokens != null ? undefined : 'dd-dim'}>{formatValue(model.maxCompletionTokens)}</dd>
          </div>
          <div>
            <dt>Moderated</dt>
            <dd>{model.moderated ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt>Tokenizer</dt>
            <dd>{model.tokenizer}</dd>
          </div>
          <div>
            <dt>Instruct type</dt>
            <dd className={model.instructType ? undefined : 'dd-dim'}>{model.instructType ?? 'None'}</dd>
          </div>
          <div>
            <dt>Per-request prompt limit</dt>
            <dd className={model.raw.per_request_limits?.prompt_tokens ? undefined : 'dd-dim'}>{String(model.raw.per_request_limits?.prompt_tokens ?? 'n/a')}</dd>
          </div>
          <div>
            <dt>Per-request completion limit</dt>
            <dd className={model.raw.per_request_limits?.completion_tokens ? undefined : 'dd-dim'}>{String(model.raw.per_request_limits?.completion_tokens ?? 'n/a')}</dd>
          </div>
          {paramEntries.length > 0 ? (
            paramEntries.map(([key, val]) => (
              <div key={key}>
                <dt>Default: {key.replace(/_/g, ' ')}</dt>
                <dd className="dd-dim">{String(val)}</dd>
              </div>
            ))
          ) : (
            <div>
              <dt>Default parameters</dt>
              <dd className="dd-dim">None</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="expanded-section">
        <h4 className="expanded-section-title">Pricing</h4>
        <dl className="expanded-grid">
          {pricingEntries.length > 0 ? (
            pricingEntries.map(({ key, label }) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{String(model.raw.pricing[key])}</dd>
              </div>
            ))
          ) : (
            <div>
              <dt>Pricing</dt>
              <dd className="dd-dim">n/a</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="expanded-section">
        <h4 className="expanded-section-title">Modalities & Parameters</h4>
        <dl className="expanded-grid">
          <div>
            <dt>Primary modality</dt>
            <dd>{model.modality ?? 'n/a'}</dd>
          </div>
          <div>
            <dt>Input modalities</dt>
            <dd>{model.inputModalities.join(', ') || 'n/a'}</dd>
          </div>
          <div>
            <dt>Output modalities</dt>
            <dd>{model.outputModalities.join(', ') || 'n/a'}</dd>
          </div>
          <div>
            <dt>Supported parameters</dt>
            <dd>{model.supportedParameters.join(', ') || 'n/a'}</dd>
          </div>
        </dl>
      </div>

      <details className="json-details">
        <summary>Raw JSON</summary>
        <div className="json-details-toolbar">
          <button type="button" className="button button-small" onClick={handleCopyJson}>
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
        </div>
        <pre className="json-preview" aria-label={`Raw JSON for ${model.id}`}>
          {formatJson(model)}
        </pre>
      </details>
    </div>
  )
}

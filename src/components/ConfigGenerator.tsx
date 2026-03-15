import { useCallback, useMemo, useState } from 'react'
import clsx from 'clsx'
import type { DerivedModel } from '../types/explorer'
import { formatFullConfig } from '../lib/opencode'

type ConfigGeneratorProps = {
  models: DerivedModel[]
  onBack: () => void
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch { /* noop */ }
  }, [text])

  return (
    <button type="button" className="button button-small" onClick={handleCopy}>
      {copied ? 'Copied' : 'Copy JSON'}
    </button>
  )
}

export function ConfigGenerator({ models, onBack }: ConfigGeneratorProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return models
    const q = search.toLowerCase()
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q),
    )
  }, [models, search])

  const selectedModels = useMemo(
    () => models.filter((m) => selected.has(m.id)),
    [models, selected],
  )

  const configJson = useMemo(
    () => (selectedModels.length > 0 ? formatFullConfig(selectedModels) : ''),
    [selectedModels],
  )

  const toggleModel = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelected(new Set(filtered.map((m) => m.id)))
  }

  const clearAll = () => {
    setSelected(new Set())
  }

  return (
    <div className="config-page">
      <div className="config-header">
        <div className="config-header-top">
          <button type="button" className="button button-small" onClick={onBack}>
            Back to Explorer
          </button>
          <h2 className="config-title">OpenCode Config Generator</h2>
        </div>
        <p className="config-lede">
          Select free models below to generate an <code>opencode.json</code> configuration file.
          Models are configured under the OpenRouter provider. Set <code>OPENROUTER_API_KEY</code> in
          your shell profile (<code>~/.bashrc</code> or <code>~/.zshrc</code>):
        </p>
        <pre className="config-env-hint">export OPENROUTER_API_KEY="sk-or-..."</pre>
      </div>

      <div className="config-schema-info">
        <details className="json-details">
          <summary>Schema Reference</summary>
          <div className="config-schema-content">
            <dl className="expanded-grid">
              <div>
                <dt>$schema</dt>
                <dd>JSON schema URL for validation and editor autocomplete</dd>
              </div>
              <div>
                <dt>model</dt>
                <dd>Default model in <code>provider/model-id</code> format</dd>
              </div>
              <div>
                <dt>provider.*.npm</dt>
                <dd>AI SDK npm package (e.g. <code>@ai-sdk/openai-compatible</code>)</dd>
              </div>
              <div>
                <dt>provider.*.name</dt>
                <dd>Display name for the provider</dd>
              </div>
              <div>
                <dt>provider.*.options.baseURL</dt>
                <dd>API endpoint URL for the provider</dd>
              </div>
              <div>
                <dt>provider.*.options.apiKey</dt>
                <dd>API key, supports <code>{'{env:VAR_NAME}'}</code> syntax</dd>
              </div>
              <div>
                <dt>provider.*.models.*.name</dt>
                <dd>Human-readable display name for the model</dd>
              </div>
              <div>
                <dt>provider.*.models.*.limit.context</dt>
                <dd>Maximum input context window in tokens</dd>
              </div>
              <div>
                <dt>provider.*.models.*.limit.output</dt>
                <dd>Maximum output/completion tokens</dd>
              </div>
            </dl>
          </div>
        </details>
      </div>

      <div className="config-layout">
        <div className="config-selector">
          <div className="config-selector-toolbar">
            <input
              type="text"
              className="config-search"
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="config-selector-actions">
              <button type="button" className="button button-small" onClick={selectAll}>
                All
              </button>
              <button type="button" className="button button-small" onClick={clearAll}>
                None
              </button>
              <span className="config-count">{selected.size} selected</span>
            </div>
          </div>

          <div className="config-model-list">
            {filtered.map((model) => {
              const isSelected = selected.has(model.id)
              return (
                <button
                  key={model.id}
                  type="button"
                  className={clsx('config-model-item', isSelected && 'config-model-active')}
                  onClick={() => toggleModel(model.id)}
                >
                  <div className="config-model-info">
                    <strong>{model.name}</strong>
                    <span>{model.id}</span>
                  </div>
                  <div className="config-model-meta">
                    <span>ctx: {model.contextLength ? Intl.NumberFormat().format(model.contextLength) : 'n/a'}</span>
                    <span>out: {model.maxCompletionTokens ? Intl.NumberFormat().format(model.maxCompletionTokens) : 'n/a'}</span>
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 ? (
              <p className="config-empty">No models match your search.</p>
            ) : null}
          </div>
        </div>

        <div className="config-output">
          <div className="config-output-header">
            <span className="config-output-label">opencode.json</span>
            {configJson ? <CopyButton text={configJson} /> : null}
          </div>
          {configJson ? (
            <pre className="config-preview">{configJson}</pre>
          ) : (
            <div className="config-placeholder">
              <p>Select models from the list to generate your config.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

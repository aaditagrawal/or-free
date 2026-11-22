import clsx from "clsx";
import { Fragment, useCallback, useMemo, useState, type ReactElement } from "react";
import type {
  DerivedModel,
  PricingFilter,
  ProviderMode,
  SortDirection,
  SortKey,
} from "../types/explorer";
import { cssVars } from "../lib/cssVars";
import { ModelRowExpanded } from "./ModelRowExpanded";
import { ProviderLogo } from "./ProviderLogo";

type ModelsTableProps = {
  models: DerivedModel[];
  providerMode: ProviderMode;
  pricingFilter: PricingFilter;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSortChange: (key: SortKey, direction: SortDirection) => void;
};

const SORTABLE_HEADERS: Array<{ key: SortKey; label: string }> = [
  { key: "name", label: "Model" },
  { key: "context", label: "Context" },
  { key: "max_completion", label: "Max out" },
  { key: "expiration", label: "Expires" },
];

function formatCompact(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function getNextSortDirection(
  key: SortKey,
  activeSortKey: SortKey,
  activeDirection: SortDirection,
) {
  if (key === activeSortKey) return activeDirection === "asc" ? "desc" : "asc";
  if (key === "id" || key === "name" || key === "prompt_price") return "asc";
  return "desc";
}

function getRowId(id: string) {
  return `model-row-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function formatPrice(price: number): string {
  if (Number.isNaN(price) || price < 0) return "?";
  if (price === 0) return "$0";
  const perMillion = price * 1_000_000;
  return `$${perMillion.toFixed(2)}/M`;
}

type CopyStatus = "idle" | "copied" | "failed";

const COPY_STATUS_TEXT = {
  idle: "Copy ID",
  copied: "Copied",
  failed: "Copy failed",
} satisfies Record<CopyStatus, string>;

function CopyButton({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState<CopyStatus>("idle");

  const handleCopy = useCallback(() => {
    const settle = (next: CopyStatus) => {
      setStatus(next);
      setTimeout(() => setStatus("idle"), 1500);
    };
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(text))
      .then(
        () => settle("copied"),
        () => settle("failed"),
      );
  }, [text]);

  return (
    <button
      type="button"
      className={clsx("copy-button", status === "copied" && "copy-button-done")}
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      aria-label={`${label}: ${text}`}
      title={label}
    >
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      >
        {status === "copied" ? (
          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" />
        ) : (
          <>
            <rect x="5.5" y="5.5" width="8" height="8" rx="1" />
            <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
          </>
        )}
      </svg>
      <span className="copy-button-text" aria-hidden>
        {COPY_STATUS_TEXT[status]}
      </span>
      <span className="sr-only" role="status">
        {status === "copied" ? "Model ID copied" : status === "failed" ? "Copy failed" : ""}
      </span>
    </button>
  );
}

const MODALITY_ICON = {
  // Paragraph lines — the universal "text" glyph, not a letterform
  text: (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      <path d="M3 5h10" />
      <path d="M3 8h10" />
      <path d="M3 11h6" />
    </svg>
  ),
  image: (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2.6" y="3.2" width="10.8" height="9.6" rx="1" />
      <circle cx="6" cy="6.6" r="0.9" />
      <path d="M3 11.2l3.2-3 2.4 2.2 1.8-1.5 2.6 2.3" />
    </svg>
  ),
  audio: (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 6v4" />
      <path d="M6 4v8" />
      <path d="M8.5 5.5v5" />
      <path d="M11 3v10" />
      <path d="M13 6.5v3" />
    </svg>
  ),
  video: (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="9" height="8" rx="1" />
      <path d="M11 7l3-1.5v5L11 9z" />
    </svg>
  ),
  file: (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 2.5h5l3 3v8a.5.5 0 0 1-.5.5h-7.5a.5.5 0 0 1-.5-.5v-10.5a.5.5 0 0 1 .5-.5z" />
      <path d="M9 2.5v3h3" />
    </svg>
  ),
} satisfies Record<string, ReactElement>;

type ModalityKind = keyof typeof MODALITY_ICON;

function isModalityKind(kind: string): kind is ModalityKind {
  return kind in MODALITY_ICON;
}

function ModalityDots({ modalities }: { modalities: string[] }) {
  if (modalities.length === 0) return <span className="dim">—</span>;
  return (
    <span className="modality-row">
      {modalities.map((m) => {
        const kind = m.toLowerCase();
        const icon = isModalityKind(kind) ? (
          MODALITY_ICON[kind]
        ) : (
          <span aria-hidden className="modality-letter">
            {m.slice(0, 1).toUpperCase()}
          </span>
        );
        return (
          <span
            key={m}
            className="modality-dot"
            data-kind={kind}
            data-tip={m}
            role="img"
            aria-label={m}
          >
            {icon}
          </span>
        );
      })}
    </span>
  );
}

export function ModelsTable({
  models,
  providerMode,
  pricingFilter,
  sortKey,
  sortDirection,
  onSortChange,
}: ModelsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const rows = useMemo(() => models, [models]);

  const contextMax = useMemo(() => {
    let max = 0;
    for (const model of models) {
      if (model.contextLength && model.contextLength > max) max = model.contextLength;
    }
    return max || 1;
  }, [models]);

  const toggleRow = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="panel table-panel" aria-label="Model results">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th style={{ width: 72 }}>Row</th>
              {SORTABLE_HEADERS.map((header) => {
                const active = header.key === sortKey;
                const direction = active ? sortDirection : null;
                return (
                  <th
                    key={header.key}
                    className={
                      header.key === "context" || header.key === "max_completion"
                        ? "num"
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      className={clsx(
                        "sort-button",
                        active && "sort-active",
                        active && (direction === "asc" ? "sort-asc" : "sort-desc"),
                      )}
                      onClick={() =>
                        onSortChange(
                          header.key,
                          getNextSortDirection(header.key, sortKey, sortDirection),
                        )
                      }
                    >
                      {header.label}
                    </button>
                  </th>
                );
              })}
              {pricingFilter === "all" ? (
                <th className="num">
                  <button
                    type="button"
                    className={clsx(
                      "sort-button",
                      sortKey === "prompt_price" && "sort-active",
                      sortKey === "prompt_price" &&
                        (sortDirection === "asc" ? "sort-asc" : "sort-desc"),
                    )}
                    onClick={() =>
                      onSortChange(
                        "prompt_price",
                        getNextSortDirection("prompt_price", sortKey, sortDirection),
                      )
                    }
                  >
                    Pricing
                  </button>
                </th>
              ) : null}
              <th>Modalities</th>
              <th>Moderation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((model) => {
              const isOpen = expanded.has(model.id);
              const showIncompleteWarning =
                providerMode === "include_incomplete" && !model.isProviderReady;
              const isPaid = model.pricingStatus === "paid";
              const isUnverified = model.pricingStatus === "unverified";
              const pricingTitle = model.pricingNotes.join("; ") || undefined;
              const rowId = getRowId(model.id);
              const ctxPct = model.contextLength
                ? Math.max(2, (model.contextLength / contextMax) * 100)
                : 0;

              return (
                <Fragment key={model.id}>
                  <tr
                    className={clsx(
                      showIncompleteWarning && "row-warning",
                      (isPaid || isUnverified) && "row-paid",
                    )}
                  >
                    <td className="td-actions">
                      <button
                        type="button"
                        className="button button-small"
                        onClick={() => toggleRow(model.id)}
                        aria-expanded={isOpen}
                        aria-controls={rowId}
                      >
                        {isOpen ? "− Hide" : "+ Details"}
                      </button>
                    </td>
                    <td className="td-model">
                      <div className="model-title-row">
                        <ProviderLogo
                          providerId={model.providerId}
                          providerLogoUrl={model.providerLogoUrl}
                        />
                        <div className="model-name-cell">
                          <strong>{model.name}</strong>
                          <span className="model-id-row">
                            <span className="model-id-text">{model.id}</span>
                            <CopyButton text={model.id} label="Copy model ID" />
                          </span>
                          {showIncompleteWarning || isPaid || isUnverified ? (
                            <span className="badges-row">
                              {showIncompleteWarning ? (
                                <span
                                  className="badge badge-warning"
                                  title="The provider did not report a context length for this model"
                                >
                                  no provider context length
                                </span>
                              ) : null}
                              {isPaid ? (
                                <span className="badge badge-paid" title={pricingTitle}>
                                  paid
                                </span>
                              ) : null}
                              {isUnverified ? (
                                <span className="badge badge-unverified" title={pricingTitle}>
                                  price unverified
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td data-label="Context" className="num">
                      <div className="ctxbar">
                        <span className="ctxbar-track" aria-hidden>
                          <span className="ctxbar-fill" style={cssVars({ "--w": `${ctxPct}%` })} />
                        </span>
                        <span className="ctxbar-value">{formatCompact(model.contextLength)}</span>
                      </div>
                    </td>
                    <td data-label="Max out" className="num">
                      {formatCompact(model.maxCompletionTokens)}
                    </td>
                    <td data-label="Expires" className={model.expirationDate ? "num" : "num dim"}>
                      {model.expirationDate ?? "—"}
                    </td>
                    {pricingFilter === "all" ? (
                      <td data-label="Pricing" className="num">
                        <div className="pricing-cell" title={pricingTitle}>
                          <span>{formatPrice(model.promptPrice)}</span>
                          <span>↳ {formatPrice(model.completionPrice)}</span>
                          {model.pricingStatus === "free" ? (
                            <span className="pricing-extra">free</span>
                          ) : isUnverified ? (
                            <span className="pricing-extra">unverified</span>
                          ) : model.promptPrice === 0 && model.completionPrice === 0 ? (
                            <span className="pricing-extra">+ other charges</span>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                    <td data-label="Modalities">
                      <ModalityDots modalities={model.inputModalities} />
                    </td>
                    <td data-label="Moderation">
                      <span className={clsx("status-pill", model.moderated && "on")}>
                        {model.moderated ? "moderated" : "open"}
                      </span>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr id={rowId} className="row-expanded">
                      <td colSpan={pricingFilter === "all" ? 8 : 7}>
                        <ModelRowExpanded
                          model={model}
                          showIncompleteWarning={showIncompleteWarning}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

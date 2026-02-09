import type {
  ExplorerState,
  PricingFilter,
  ProviderMode,
  SortDirection,
  SortKey,
} from "../types/explorer";
import { FilterGroup } from "./FilterGroup";

type Facets = {
  providers: string[];
  inputModalities: string[];
  outputModalities: string[];
  instructTypes: string[];
  supportedParameters: string[];
};

type ToolbarProps = {
  state: ExplorerState;
  facets: Facets;
  onUpdate: (patch: Partial<ExplorerState>) => void;
  onToggleListFilter: (
    key:
      | "providers"
      | "inputModalities"
      | "outputModalities"
      | "instructTypes"
      | "supportedParameters",
    value: string,
  ) => void;
  onOpenPalette: () => void;
  onClearFilters: () => void;
  onProviderModeChange: (mode: ProviderMode) => void;
};

const SORT_KEY_OPTIONS: Array<{ label: string; value: SortKey }> = [
  { label: "Newest", value: "created" },
  { label: "Model ID", value: "id" },
  { label: "Name", value: "name" },
  { label: "Context length", value: "context" },
  { label: "Max completion tokens", value: "max_completion" },
  { label: "Expiration", value: "expiration" },
];

const SORT_DIRECTION_OPTIONS: Array<{ label: string; value: SortDirection }> = [
  { label: "Descending", value: "desc" },
  { label: "Ascending", value: "asc" },
];

function countActiveFilters(state: ExplorerState): number {
  let count = 0;

  if (state.providers.length > 0) count += 1;
  if (state.inputModalities.length > 0) count += 1;
  if (state.outputModalities.length > 0) count += 1;
  if (state.instructTypes.length > 0) count += 1;
  if (state.supportedParameters.length > 0) count += 1;
  if (state.moderated !== "all") count += 1;
  if (state.expiryMode !== "all") count += 1;
  if (state.minContextLength != null) count += 1;
  if (state.minMaxCompletionTokens != null) count += 1;
  if (state.createdFrom != null) count += 1;
  if (state.createdTo != null) count += 1;

  return count;
}

export function Toolbar({
  state,
  facets,
  onUpdate,
  onToggleListFilter,
  onOpenPalette,
  onClearFilters,
  onProviderModeChange,
}: ToolbarProps) {
  const activeFilterCount = countActiveFilters(state);

  return (
    <section className="toolbar" aria-label="Search, settings and filters">
      <div className="toolbar-bar">
        <input
          type="search"
          className="toolbar-search"
          value={state.q}
          onChange={(event) => onUpdate({ q: event.target.value })}
          placeholder="Search models..."
          aria-label="Search"
        />

        <div className="toolbar-controls">
          <select
            value={state.pricingFilter}
            onChange={(event) =>
              onUpdate({ pricingFilter: event.target.value as PricingFilter })
            }
            aria-label="Pricing filter"
          >
            <option value="free">Free only</option>
            <option value="all">All (incl. paid)</option>
          </select>

          <select
            value={state.providerMode}
            onChange={(event) =>
              onProviderModeChange(event.target.value as ProviderMode)
            }
            aria-label="Provider mode"
          >
            <option value="include_incomplete">Incomplete</option>
            <option value="strict">Strict</option>
          </select>

          <select
            value={state.sortKey}
            onChange={(event) =>
              onUpdate({ sortKey: event.target.value as SortKey })
            }
            aria-label="Sort by"
          >
            {SORT_KEY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={state.sortDirection}
            onChange={(event) =>
              onUpdate({ sortDirection: event.target.value as SortDirection })
            }
            aria-label="Sort direction"
          >
            {SORT_DIRECTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="button button-accent"
            onClick={onOpenPalette}
          >
            ⌘K
          </button>
        </div>
      </div>

      {activeFilterCount > 0 ? (
        <div className="toolbar-active-filters">
          <span>
            {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}{" "}
            active
          </span>
          <button
            type="button"
            className="button button-small"
            onClick={onClearFilters}
          >
            Reset
          </button>
        </div>
      ) : null}

      <details className="advanced-filters">
        <summary>Advanced filters</summary>

        <div className="advanced-grid">
          <label className="field">
            <span>Moderation</span>
            <select
              value={state.moderated}
              onChange={(event) =>
                onUpdate({
                  moderated: event.target.value as ExplorerState["moderated"],
                })
              }
              aria-label="Moderation filter"
            >
              <option value="all">All</option>
              <option value="true">Moderated</option>
              <option value="false">Unmoderated</option>
            </select>
          </label>

          <label className="field">
            <span>Expiration</span>
            <select
              value={state.expiryMode}
              onChange={(event) =>
                onUpdate({
                  expiryMode: event.target.value as ExplorerState["expiryMode"],
                })
              }
              aria-label="Expiration filter"
            >
              <option value="all">All</option>
              <option value="no-expiry">No expiry date</option>
              <option value="expiring-soon">Expiring soon</option>
            </select>
          </label>

          <label className="field">
            <span>Min context length</span>
            <input
              type="number"
              min={0}
              value={state.minContextLength ?? ""}
              onChange={(event) =>
                onUpdate({
                  minContextLength: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              placeholder="32768"
            />
          </label>

          <label className="field">
            <span>Min max completion</span>
            <input
              type="number"
              min={0}
              value={state.minMaxCompletionTokens ?? ""}
              onChange={(event) =>
                onUpdate({
                  minMaxCompletionTokens: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              placeholder="8192"
            />
          </label>

          <label className="field">
            <span>Created from</span>
            <input
              type="date"
              value={state.createdFrom ?? ""}
              onChange={(event) =>
                onUpdate({ createdFrom: event.target.value || null })
              }
            />
          </label>

          <label className="field">
            <span>Created to</span>
            <input
              type="date"
              value={state.createdTo ?? ""}
              onChange={(event) =>
                onUpdate({ createdTo: event.target.value || null })
              }
            />
          </label>
        </div>

        <div className="toolbar-grid">
          <FilterGroup
            title="Providers"
            options={facets.providers}
            selected={state.providers}
            onToggle={(value) => onToggleListFilter("providers", value)}
          />
          <FilterGroup
            title="Input modalities"
            options={facets.inputModalities}
            selected={state.inputModalities}
            onToggle={(value) => onToggleListFilter("inputModalities", value)}
          />
          <FilterGroup
            title="Output modalities"
            options={facets.outputModalities}
            selected={state.outputModalities}
            onToggle={(value) => onToggleListFilter("outputModalities", value)}
          />
          <FilterGroup
            title="Instruct format"
            options={facets.instructTypes}
            selected={state.instructTypes}
            onToggle={(value) => onToggleListFilter("instructTypes", value)}
            formatOption={(value) => (value === "null" ? "none" : value)}
          />
          <FilterGroup
            title="Parameters"
            options={facets.supportedParameters}
            selected={state.supportedParameters}
            onToggle={(value) =>
              onToggleListFilter("supportedParameters", value)
            }
            maxVisible={18}
          />
        </div>
      </details>
    </section>
  );
}

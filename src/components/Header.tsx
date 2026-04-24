import type { PricingFilter } from "../types/explorer";

type HeaderProps = {
  totalCount: number;
  visibleCount: number;
  freeCount: number;
  providerMode: "strict" | "include_incomplete";
  pricingFilter: PricingFilter;
  lastUpdatedText: string;
  onRefresh: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onNavigateConfig: () => void;
};

export function Header({
  totalCount,
  visibleCount,
  freeCount,
  pricingFilter,
  lastUpdatedText,
  onRefresh,
  theme,
  onToggleTheme,
  onNavigateConfig,
}: HeaderProps) {
  return (
    <header className="topbar" aria-label="Top bar">
      <div className="topbar-brand">
        or·free
        <span>openrouter model explorer</span>
      </div>

      <div className="topbar-meta" role="status">
        <span className="topbar-meta-item">
          <span className="topbar-pulse" aria-hidden />
          <span>synced {lastUpdatedText}</span>
        </span>
        <span className="topbar-meta-item">
          total <strong>{totalCount}</strong>
        </span>
        <span className="topbar-meta-item">
          free <strong>{freeCount}</strong>
        </span>
        <span className="topbar-meta-item">
          shown <strong>{visibleCount}</strong>
        </span>
        <span className="topbar-meta-item">
          {pricingFilter === "free" ? "free only" : "all pricing"}
        </span>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          onClick={onNavigateConfig}
          className="button button-small button-accent"
        >
          Config
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          className="button button-small"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="button button-small"
        >
          Refresh
        </button>
      </div>
    </header>
  );
}

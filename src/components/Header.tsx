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
};

export function Header({
  totalCount,
  visibleCount,
  freeCount,
  providerMode,
  pricingFilter,
  lastUpdatedText,
  onRefresh,
  theme,
  onToggleTheme,
}: HeaderProps) {
  return (
    <>
      <header className="header-shell">
        <h1>OpenRouter Explorer</h1>
        <p className="lede">
          Search for OR models, especially free ones (hehe).
        </p>
      </header>

      <div className="stats-strip" aria-label="Overview stats">
        <div className="stats-values">
          <div className="stat-item">
            <span>Total</span>
            <strong>{totalCount}</strong>
          </div>
          <div className="stat-item">
            <span>Free + active</span>
            <strong>{freeCount}</strong>
          </div>
          <div className="stat-item">
            <span>Visible</span>
            <strong>{visibleCount}</strong>
          </div>
          <div className="stat-item">
            <span>Pricing</span>
            <strong>{pricingFilter === "free" ? "Free only" : "All"}</strong>
          </div>
          <div className="stat-item">
            <span>Mode</span>
            <strong>
              {providerMode === "include_incomplete" ? "Incomplete" : "Strict"}
            </strong>
          </div>
          <div className="stat-item">
            <span>Updated</span>
            <strong>{lastUpdatedText}</strong>
          </div>
        </div>
        <div className="stats-actions">
          <button
            type="button"
            onClick={onToggleTheme}
            className="button button-small"
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
      </div>
    </>
  );
}

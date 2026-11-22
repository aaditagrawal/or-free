import clsx from "clsx";
import { useId, useState } from "react";

type FilterGroupProps = {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  maxVisible?: number;
  formatOption?: (value: string) => string;
};

export function FilterGroup({
  title,
  options,
  selected,
  onToggle,
  maxVisible,
  formatOption,
}: FilterGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const chipGridId = useId();

  const isTruncatable = maxVisible != null && options.length > maxVisible;
  const collapsedOptions = isTruncatable ? options.slice(0, maxVisible) : options;
  // Keep active selections visible when collapsed, even past the cutoff, so a
  // chosen filter never disappears from view.
  const hiddenSelected = isTruncatable
    ? options.slice(maxVisible).filter((option) => selected.includes(option))
    : [];
  const visibleOptions =
    expanded || !isTruncatable ? options : [...collapsedOptions, ...hiddenSelected];
  const hiddenCount = options.length - visibleOptions.length;

  return (
    <fieldset className="filter-group">
      <legend>{title}</legend>
      <div className="chip-grid" id={chipGridId}>
        {visibleOptions.map((option) => {
          const active = selected.includes(option);
          const label = formatOption ? formatOption(option) : option;

          return (
            <button
              key={option}
              type="button"
              className={clsx("chip", active && "chip-active")}
              onClick={() => onToggle(option)}
              aria-pressed={active}
            >
              {label}
            </button>
          );
        })}
      </div>
      {isTruncatable && (expanded || hiddenCount > 0) ? (
        <button
          type="button"
          className="chip-toggle"
          aria-expanded={expanded}
          aria-controls={chipGridId}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Show fewer" : `Show ${hiddenCount} more`}
          <span className="sr-only"> {title.toLowerCase()}</span>
        </button>
      ) : null}
    </fieldset>
  );
}

import clsx from 'clsx'

type FilterGroupProps = {
  title: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
  maxVisible?: number
  formatOption?: (value: string) => string
}

export function FilterGroup({
  title,
  options,
  selected,
  onToggle,
  maxVisible,
  formatOption,
}: FilterGroupProps) {
  const visibleOptions = maxVisible ? options.slice(0, maxVisible) : options
  const hiddenCount = options.length - visibleOptions.length

  return (
    <fieldset className="filter-group">
      <legend>{title}</legend>
      <div className="chip-grid">
        {visibleOptions.map((option) => {
          const active = selected.includes(option)
          const label = formatOption ? formatOption(option) : option

          return (
            <button
              key={option}
              type="button"
              className={clsx('chip', active && 'chip-active')}
              onClick={() => onToggle(option)}
              aria-pressed={active}
            >
              {label}
            </button>
          )
        })}
      </div>
      {hiddenCount > 0 ? <p className="chip-footnote">+{hiddenCount} more in ⌘K</p> : null}
    </fieldset>
  )
}

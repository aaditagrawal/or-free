type EmptyStateProps = {
  hasModels: boolean
}

export function EmptyState({ hasModels }: EmptyStateProps) {
  return (
    <section className="panel state-panel">
      <h2>{hasModels ? 'No models match current filters' : 'No free active models found'}</h2>
      <p>
        {hasModels
          ? 'Adjust filters in the toolbar or use Cmd/Ctrl+K to quickly clear or change filters.'
          : 'OpenRouter returned no free+active models for this refresh cycle.'}
      </p>
    </section>
  )
}

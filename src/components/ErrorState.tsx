type ErrorStateProps = {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <section className="panel state-panel" role="alert">
      <h2>Request failed</h2>
      <p>{message}</p>
      <button type="button" className="button button-accent" onClick={onRetry}>
        Retry
      </button>
    </section>
  )
}

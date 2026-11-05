import { useMemo } from 'react'
import { useResource } from './useResource'
import { createModelResources } from '../lib/modelResources'
import { mergeModelSources } from '../lib/openrouter'

const resources = createModelResources()

// Runs the sources in parallel. OR is the fast primary (~120ms, has
// expiration_date/description/etc). ORCA fills in any models OR doesn't list.
// models.dev enriches matching OpenRouter IDs with modalities, limits, and
// capability metadata. Either OR or ORCA arriving is enough to render the UI;
// the other sources merge in progressively when they land.
export function useModels(sources = resources) {
  const orQuery = useResource(sources.or)
  const orcaQuery = useResource(sources.orca)
  const modelsDevQuery = useResource(sources.modelsDev)

  const merged = useMemo(
    () => mergeModelSources(orQuery.data, orcaQuery.data, modelsDevQuery.data),
    [orQuery.data, orcaQuery.data, modelsDevQuery.data],
  )

  // Render as soon as either source lands. Loading only while *both* pending.
  const isLoading = orQuery.isLoading && orcaQuery.isLoading

  // Error only when both fail — a single-source failure is survivable.
  const isError = orQuery.error !== null && orcaQuery.error !== null
  const error = isError ? orQuery.error ?? orcaQuery.error : null

  const dataUpdatedAt = Math.max(
    orQuery.dataUpdatedAt ?? 0,
    orcaQuery.dataUpdatedAt ?? 0,
    modelsDevQuery.dataUpdatedAt ?? 0,
  )

  return {
    data: merged,
    isLoading,
    isError,
    error,
    dataUpdatedAt,
    refetch: async () => {
      const [or, orca, modelsDev] = await Promise.all([
        sources.or.refetch(),
        sources.orca.refetch(),
        sources.modelsDev.refetch(),
      ])
      return { or, orca, modelsDev }
    },
  }
}

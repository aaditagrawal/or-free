import { useQuery } from '@tanstack/react-query'
import { fetchModels } from '../lib/openrouter'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

export function useModels() {
  return useQuery({
    queryKey: ['openrouter-models'],
    queryFn: ({ signal }) => fetchModels(signal),
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: false,
  })
}

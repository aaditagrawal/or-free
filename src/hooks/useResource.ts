import { useSyncExternalStore } from 'react'
import type { Resource } from '../lib/resource'

const empty = { data: undefined, dataUpdatedAt: 0, error: null, isLoading: false }
const subscribeEmpty = () => () => undefined
const getEmpty = () => empty

export function useResource<T>(resource: Resource<T> | null) {
  return useSyncExternalStore(
    resource?.subscribe ?? subscribeEmpty,
    resource?.getSnapshot ?? getEmpty,
    resource?.getSnapshot ?? getEmpty,
  )
}

const getEmptyData = () => undefined

export function useResourceData<T>(resource: Resource<T> | null) {
  return useSyncExternalStore(
    resource?.subscribe ?? subscribeEmpty,
    resource?.getData ?? getEmptyData,
    resource?.getData ?? getEmptyData,
  )
}

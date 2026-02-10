import type { DerivedModel, ExplorerState, SortDirection, SortKey } from '../types/explorer'
import { getUtcDateStamp, isExpiringSoon } from './models'

function includesSome(selected: string[], values: string[]): boolean {
  if (selected.length === 0) {
    return true
  }

  return selected.some((value) => values.includes(value))
}

function compareNullableNumber(a: number | null, b: number | null): number {
  return (a ?? 0) - (b ?? 0)
}

function compareNullableDate(a: string | null, b: string | null): number {
  if (a == null && b == null) {
    return 0
  }

  if (a == null) {
    return 1
  }

  if (b == null) {
    return -1
  }

  return a.localeCompare(b)
}

function sortComparator(sortKey: SortKey) {
  switch (sortKey) {
    case 'id':
      return (a: DerivedModel, b: DerivedModel) => a.id.localeCompare(b.id)
    case 'name':
      return (a: DerivedModel, b: DerivedModel) => a.name.localeCompare(b.name)
    case 'context':
      return (a: DerivedModel, b: DerivedModel) =>
        compareNullableNumber(a.contextLength, b.contextLength)
    case 'max_completion':
      return (a: DerivedModel, b: DerivedModel) =>
        compareNullableNumber(a.maxCompletionTokens, b.maxCompletionTokens)
    case 'expiration':
      return (a: DerivedModel, b: DerivedModel) =>
        compareNullableDate(a.expirationDate, b.expirationDate)
    case 'prompt_price':
      return (a: DerivedModel, b: DerivedModel) => a.promptPrice - b.promptPrice
    case 'created':
    default:
      return (a: DerivedModel, b: DerivedModel) => a.createdMs - b.createdMs
  }
}

function applySort(models: DerivedModel[], sortKey: SortKey, sortDirection: SortDirection) {
  const comparator = sortComparator(sortKey)

  return [...models].sort((a, b) => {
    const result = comparator(a, b)
    return sortDirection === 'asc' ? result : -result
  })
}

export function applyExplorerFilters(
  models: DerivedModel[],
  state: ExplorerState,
  todayUtc = getUtcDateStamp(),
): DerivedModel[] {
  const query = state.q.trim().toLowerCase()

  const filtered = models.filter((model) => {
    if (query.length > 0) {
      const haystack = `${model.id} ${model.name} ${model.canonicalSlug} ${model.description}`.toLowerCase()
      if (!haystack.includes(query)) {
        return false
      }
    }

    if (state.providers.length > 0 && !state.providers.includes(model.tokenizer)) {
      return false
    }

    if (!includesSome(state.inputModalities, model.inputModalities)) {
      return false
    }

    if (!includesSome(state.outputModalities, model.outputModalities)) {
      return false
    }

    if (state.instructTypes.length > 0) {
      const instructType = model.instructType ?? 'null'
      if (!state.instructTypes.includes(instructType)) {
        return false
      }
    }

    if (!includesSome(state.supportedParameters, model.supportedParameters)) {
      return false
    }

    if (state.moderated === 'true' && !model.moderated) {
      return false
    }

    if (state.moderated === 'false' && model.moderated) {
      return false
    }

    if (state.minContextLength != null && (model.contextLength ?? 0) < state.minContextLength) {
      return false
    }

    if (
      state.minMaxCompletionTokens != null &&
      (model.maxCompletionTokens ?? 0) < state.minMaxCompletionTokens
    ) {
      return false
    }

    const createdDate = model.createdIso.slice(0, 10)

    if (state.createdFrom && createdDate < state.createdFrom) {
      return false
    }

    if (state.createdTo && createdDate > state.createdTo) {
      return false
    }

    if (state.expiryMode === 'no-expiry' && model.expirationDate != null) {
      return false
    }

    if (state.expiryMode === 'expiring-soon' && !isExpiringSoon(model.expirationDate, todayUtc)) {
      return false
    }

    return true
  })

  return applySort(filtered, state.sortKey, state.sortDirection)
}

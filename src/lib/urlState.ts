import type {
  ExpiryMode,
  ExplorerState,
  ModeratedFilter,
  PricingFilter,
  ProviderMode,
  SortDirection,
  SortKey,
} from '../types/explorer'

export const PROVIDER_MODE_STORAGE_KEY = 'orfree.providerMode'

export const VALID_SORT_KEYS: SortKey[] = [
  'created',
  'id',
  'name',
  'context',
  'max_completion',
  'expiration',
  'prompt_price',
]

export const VALID_SORT_DIRECTIONS: SortDirection[] = ['asc', 'desc']
export const VALID_MODERATED: ModeratedFilter[] = ['all', 'true', 'false']
export const VALID_EXPIRY_MODES: ExpiryMode[] = ['all', 'no-expiry', 'expiring-soon']
export const VALID_PRICING_FILTERS: PricingFilter[] = ['free', 'all']
export const VALID_PROVIDER_MODES: ProviderMode[] = ['strict', 'include_incomplete']

export function createDefaultExplorerState(providerMode: ProviderMode = 'include_incomplete'): ExplorerState {
  return {
    q: '',
    providers: [],
    inputModalities: [],
    outputModalities: [],
    instructTypes: [],
    supportedParameters: [],
    moderated: 'all',
    minContextLength: null,
    minMaxCompletionTokens: null,
    createdFrom: null,
    createdTo: null,
    expiryMode: 'all',
    pricingFilter: 'free',
    providerMode,
    sortKey: 'created',
    sortDirection: 'desc',
  }
}

function parseList(value: string | null): string[] {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseNullableNumber(value: string | null): number | null {
  if (!value) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  if (value && allowed.includes(value as T)) {
    return value as T
  }

  return fallback
}

export function parseProviderMode(value: string | null): ProviderMode | null {
  if (!value) {
    return null
  }

  return VALID_PROVIDER_MODES.includes(value as ProviderMode) ? (value as ProviderMode) : null
}

function parseDate(value: string | null): string | null {
  if (!value) {
    return null
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

export function parseExplorerStateFromSearch(
  search: string,
  providerModeFallback: ProviderMode,
): ExplorerState {
  const params = new URLSearchParams(search)
  const defaults = createDefaultExplorerState(providerModeFallback)

  return {
    ...defaults,
    q: params.get('q') ?? '',
    providers: parseList(params.get('provider')),
    inputModalities: parseList(params.get('input')),
    outputModalities: parseList(params.get('output')),
    instructTypes: parseList(params.get('instruct')),
    supportedParameters: parseList(params.get('params')),
    moderated: parseEnum(params.get('moderated'), VALID_MODERATED, defaults.moderated),
    minContextLength: parseNullableNumber(params.get('minCtx')),
    minMaxCompletionTokens: parseNullableNumber(params.get('minMaxOut')),
    createdFrom: parseDate(params.get('createdFrom')),
    createdTo: parseDate(params.get('createdTo')),
    expiryMode: parseEnum(params.get('expiryMode'), VALID_EXPIRY_MODES, defaults.expiryMode),
    pricingFilter: parseEnum(params.get('pricing'), VALID_PRICING_FILTERS, defaults.pricingFilter),
    providerMode: parseEnum(
      params.get('providerMode'),
      VALID_PROVIDER_MODES,
      defaults.providerMode,
    ),
    sortKey: parseEnum(params.get('sort'), VALID_SORT_KEYS, defaults.sortKey),
    sortDirection: parseEnum(params.get('dir'), VALID_SORT_DIRECTIONS, defaults.sortDirection),
  }
}

function setListParam(params: URLSearchParams, key: string, values: string[]) {
  if (values.length > 0) {
    params.set(key, values.join(','))
  }
}

function setParamIfNotDefault<T extends string | number | null>(
  params: URLSearchParams,
  key: string,
  value: T,
  defaultValue: T,
) {
  if (value != null && value !== '' && value !== defaultValue) {
    params.set(key, String(value))
  }
}

export function serializeExplorerState(state: ExplorerState): string {
  const defaults = createDefaultExplorerState()
  const params = new URLSearchParams()

  setParamIfNotDefault(params, 'q', state.q, defaults.q)
  setListParam(params, 'provider', state.providers)
  setListParam(params, 'input', state.inputModalities)
  setListParam(params, 'output', state.outputModalities)
  setListParam(params, 'instruct', state.instructTypes)
  setListParam(params, 'params', state.supportedParameters)
  setParamIfNotDefault(params, 'moderated', state.moderated, defaults.moderated)
  setParamIfNotDefault(params, 'minCtx', state.minContextLength, defaults.minContextLength)
  setParamIfNotDefault(params, 'minMaxOut', state.minMaxCompletionTokens, defaults.minMaxCompletionTokens)
  setParamIfNotDefault(params, 'createdFrom', state.createdFrom, defaults.createdFrom)
  setParamIfNotDefault(params, 'createdTo', state.createdTo, defaults.createdTo)
  setParamIfNotDefault(params, 'expiryMode', state.expiryMode, defaults.expiryMode)
  setParamIfNotDefault(params, 'pricing', state.pricingFilter, defaults.pricingFilter)
  setParamIfNotDefault(params, 'providerMode', state.providerMode, defaults.providerMode)
  setParamIfNotDefault(params, 'sort', state.sortKey, defaults.sortKey)
  setParamIfNotDefault(params, 'dir', state.sortDirection, defaults.sortDirection)

  return params.toString()
}

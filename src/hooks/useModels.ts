import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchModelsDev,
  fetchOpenRouterModels,
  fetchOrcaModels,
  mergeModelSources,
} from "../lib/openrouter";
import type { ModelsDevResponse, OpenRouterModelsResponse } from "../types/openrouter";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Source = "or" | "orca" | "models-dev";
type Cached<TPayload> = { payload: TPayload; savedAt: number };

function cacheKey(source: Source) {
  return `or-free:models-cache:${source}:v1`;
}

// The cached JSON is only as trustworthy as whatever last wrote it, so each
// decoder re-checks the one structural invariant the readers actually rely on
// and rejects the entry outright when it no longer holds.
function decodeOpenRouterModelsResponse(
  value: OpenRouterModelsResponse | null,
): OpenRouterModelsResponse | null {
  return Array.isArray(value?.data) ? value : null;
}

function decodeModelsDevResponse(value: ModelsDevResponse | null): ModelsDevResponse | null {
  return value?.openrouter?.models ? value : null;
}

function readCache<TPayload>(
  source: Source,
  decodePayload: (value: TPayload | null) => TPayload | null,
): Cached<TPayload> | null {
  if (!globalThis.window) return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(source));
    if (!raw) return null;
    const parsed: Cached<TPayload> | null = JSON.parse(raw);
    if (!parsed) return null;
    const payload = decodePayload(parsed.payload ?? null);
    if (!payload) return null;
    // Number.isFinite does not coerce, so a corrupted non-numeric savedAt fails here too.
    if (!Number.isFinite(parsed.savedAt) || parsed.savedAt < 0) return null;
    if (Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) return null;
    return { payload, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

function writeCache<TPayload>(source: Source, payload: TPayload): void {
  if (!globalThis.window) return;
  try {
    window.localStorage.setItem(
      cacheKey(source),
      JSON.stringify({ payload, savedAt: Date.now() } satisfies Cached<TPayload>),
    );
  } catch {
    // quota or disabled storage — silently ignore
  }
}

async function fetchAndCacheOpenRouter(signal?: AbortSignal) {
  const payload = await fetchOpenRouterModels(signal);
  writeCache("or", payload);
  return payload;
}

async function fetchAndCacheOrca(signal?: AbortSignal) {
  const payload = await fetchOrcaModels(signal);
  writeCache("orca", payload);
  return payload;
}

async function fetchAndCacheModelsDev(signal?: AbortSignal) {
  const payload = await fetchModelsDev(signal);
  writeCache("models-dev", payload);
  return payload;
}

// Runs the sources in parallel. OR is the fast primary (~120ms, has
// expiration_date/description/etc). ORCA fills in any models OR doesn't list.
// models.dev enriches matching OpenRouter IDs with modalities, limits, and
// capability metadata. Either OR or ORCA arriving is enough to render the UI;
// the other sources merge in progressively when they land.
export function useModels() {
  const [initialCaches] = useState(() => ({
    or: readCache("or", decodeOpenRouterModelsResponse),
    orca: readCache("orca", decodeOpenRouterModelsResponse),
    modelsDev: readCache("models-dev", decodeModelsDevResponse),
  }));

  const orInitial = initialCaches.or;
  const orcaInitial = initialCaches.orca;
  const modelsDevInitial = initialCaches.modelsDev;

  const orQuery = useQuery({
    queryKey: ["models", "or"],
    queryFn: ({ signal }) => fetchAndCacheOpenRouter(signal),
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: false,
    initialData: orInitial?.payload,
    initialDataUpdatedAt: orInitial?.savedAt,
  });

  const orcaQuery = useQuery({
    queryKey: ["models", "orca"],
    queryFn: ({ signal }) => fetchAndCacheOrca(signal),
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: false,
    initialData: orcaInitial?.payload,
    initialDataUpdatedAt: orcaInitial?.savedAt,
  });

  const modelsDevQuery = useQuery({
    queryKey: ["models", "models-dev"],
    queryFn: ({ signal }) => fetchAndCacheModelsDev(signal),
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: false,
    initialData: modelsDevInitial?.payload,
    initialDataUpdatedAt: modelsDevInitial?.savedAt,
  });

  const merged = useMemo(
    () => mergeModelSources(orQuery.data, orcaQuery.data, modelsDevQuery.data),
    [orQuery.data, orcaQuery.data, modelsDevQuery.data],
  );

  // Render as soon as either source lands. Loading only while *both* pending.
  const isLoading = orQuery.isLoading && orcaQuery.isLoading;

  // Error only when both fail — a single-source failure is survivable.
  const isError = orQuery.isError && orcaQuery.isError;
  const error = isError ? (orQuery.error ?? orcaQuery.error) : null;

  const dataUpdatedAt = Math.max(
    orQuery.dataUpdatedAt ?? 0,
    orcaQuery.dataUpdatedAt ?? 0,
    modelsDevQuery.dataUpdatedAt ?? 0,
  );

  return {
    data: merged,
    isLoading,
    isError,
    error,
    dataUpdatedAt,
    refetch: async () => {
      const [or, orca, modelsDev] = await Promise.all([
        orQuery.refetch(),
        orcaQuery.refetch(),
        modelsDevQuery.refetch(),
      ]);
      return { or, orca, modelsDev };
    },
  };
}

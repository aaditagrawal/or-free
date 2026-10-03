import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useModels } from "./useModels";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("keeps loading when the primary fails and fallback remains pending", async () => {
  window.localStorage.clear();
  let finishFallback: (value: Response) => void = () => {};
  function fetchSource(input: RequestInfo | URL): Promise<Response> {
    const url = String(input);
    if (url.includes("openrouter.ai")) return Promise.reject(new Error("primary unavailable"));
    if (url.includes("models.dev"))
      return Promise.resolve(Response.json({ openrouter: { models: {} } }));
    return new Promise((resolve) => {
      finishFallback = resolve;
    });
  }
  vi.stubGlobal("fetch", fetchSource);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  const { result } = renderHook(() => useModels(), { wrapper: Wrapper });
  await waitFor(() => expect(client.getQueryState(["models", "or"])?.status).toBe("error"));
  expect(result.current.isLoading).toBe(true);
  await act(async () => finishFallback(Response.json({ models: [] })));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  client.clear();
});

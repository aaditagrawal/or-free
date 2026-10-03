// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useExplorerState } from "./useExplorerState";

afterEach(cleanup);

it("accepts real navigation after replacing the hash for a filter update", () => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "#/explorer");
  const { result } = renderHook(() => useExplorerState(""));
  act(() => result.current.update({ q: "local" }));
  expect(window.location.hash).toContain("q=local");
  act(() => {
    window.history.replaceState(null, "", "#/explorer?q=external");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  expect(result.current.state.q).toBe("external");
});

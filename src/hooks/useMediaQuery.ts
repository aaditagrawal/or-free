import { useCallback, useSyncExternalStore } from "react";

export const COMPACT_LAYOUT_QUERY = "(max-width: 768px)";

function getMediaQueryList(query: string): MediaQueryList | null {
  return globalThis.window?.matchMedia?.(query) ?? null;
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = getMediaQueryList(query);
      if (!list) return () => {};
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => getMediaQueryList(query)?.matches ?? false, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

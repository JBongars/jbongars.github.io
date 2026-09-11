/**
 * Browser capability defaults. Feature modules inject these via deps
 * (SPEC_BUILD_TS.md §5.2). This is the only client file that may touch
 * storage, fetch, clipboard, matchMedia, and observers directly.
 */

import type { ClipboardLike, FetchResponse, StorageLike } from "./types";

export type { ClipboardLike, FetchLike, FetchResponse, MatchMediaLike, StorageLike } from "./types";

export function matchMediaQuery(query: string): Pick<MediaQueryList, "matches"> {
  try {
    return { matches: matchMedia(query).matches };
  } catch {
    return { matches: false };
  }
}

export function mediaQueryList(
  query: string,
): Pick<MediaQueryList, "matches" | "addEventListener"> {
  try {
    return matchMedia(query);
  } catch {
    return {
      matches: false,
      addEventListener() {
        /*
         * matchMedia is missing or blocked.
         */
      },
    };
  }
}

export function safeLocalStorage(): StorageLike | undefined {
  try {
    const storage = localStorage;
    const probe = "__storage_probe__";
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return {
      getItem(key: string): string | undefined {
        return storage.getItem(key) ?? undefined;
      },
      setItem(key: string, value: string): void {
        storage.setItem(key, value);
      },
    };
  } catch {
    return undefined;
  }
}

export function clipboardWrite(): ClipboardLike {
  return {
    async writeText(text: string): Promise<void> {
      await navigator.clipboard.writeText(text);
    },
  };
}

export function fetchSameOrigin(input: string, init: RequestInit = {}): Promise<FetchResponse> {
  return fetch(input, { credentials: "same-origin", ...init });
}

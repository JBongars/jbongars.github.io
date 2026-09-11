/* Progressive enhancement: persist the light/dark checkbox.
   CSS applies the theme from #theme-toggle. theme-init.js restores
   the stored value before first paint. */

import { safeLocalStorage, type StorageLike } from "../platform";
import type { Theme, ThemeDependencies } from "./types";

export type { Theme, ThemeDependencies } from "./types";

export const THEME_TOGGLE_HOOK = "[data-theme-toggle]";
export const THEME_KEY = "theme";

const enhancedToggles = new WeakSet<Element>();

function noop(): void {
  /*
   * Teardown is a no-op when this root was not enhanced.
   */
}

export function parseTheme(value: unknown): Theme | undefined {
  return value === "light" || value === "dark" ? value : undefined;
}

function persist(storage: StorageLike | undefined, isLight: boolean): void {
  try {
    storage?.setItem(THEME_KEY, isLight ? "light" : "dark");
  } catch {
    /*
    storage full or blocked: theme still applies for this page
    */
  }
}

export function init(
  root: ParentNode = document,
  dependencies: ThemeDependencies = {},
): () => void {
  if (!(root instanceof Document || root instanceof Element)) {
    return noop;
  }
  const toggle = root.querySelector<HTMLInputElement>(THEME_TOGGLE_HOOK);
  if (!toggle || enhancedToggles.has(toggle)) {
    return noop;
  }

  const storage = dependencies.storage ?? safeLocalStorage();
  const controller = new AbortController();
  enhancedToggles.add(toggle);
  if (parseTheme(storage?.getItem(THEME_KEY)) === "light") {
    toggle.checked = true;
  }

  toggle.addEventListener(
    "change",
    () => {
      persist(storage, toggle.checked);
    },
    { signal: controller.signal },
  );

  return () => {
    controller.abort();
    enhancedToggles.delete(toggle);
  };
}

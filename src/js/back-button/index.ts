/* Progressive enhancement: [data-back] goes to the previous history entry.
   Without JS, the href (Hacklas index or listing) is used. */

import type { BackButtonDependencies } from "./types";

export type { BackButtonDependencies } from "./types";

export const BACK_BUTTON_HOOK = "[data-back]";

const enhancedRoots = new WeakSet<ParentNode>();

function noop(): void {
  /*
   * Teardown is a no-op when this root was not enhanced.
   */
}

function goBack(dependencies: BackButtonDependencies): void {
  if (dependencies.history) {
    dependencies.history.back();
    return;
  }
  history.back();
}

function isModifiedClick(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function backLinkFrom(event: Event): HTMLAnchorElement | undefined {
  const { target } = event;
  if (!(target instanceof Element) || !(event instanceof MouseEvent)) {
    return undefined;
  }
  const link = target.closest(BACK_BUTTON_HOOK);
  if (!(link instanceof HTMLAnchorElement)) {
    return undefined;
  }
  if (event.defaultPrevented || isModifiedClick(event) || event.button !== 0) {
    return undefined;
  }
  return link;
}

export function init(
  root: ParentNode = document,
  dependencies: BackButtonDependencies = {},
): () => void {
  if (!(root instanceof Document || root instanceof Element)) {
    return noop;
  }
  if (enhancedRoots.has(root)) {
    return noop;
  }

  const controller = new AbortController();
  enhancedRoots.add(root);
  root.addEventListener(
    "click",
    (event) => {
      const link = backLinkFrom(event);
      if (!link) {
        return;
      }
      event.preventDefault();
      goBack(dependencies);
    },
    { signal: controller.signal },
  );

  return () => {
    controller.abort();
    enhancedRoots.delete(root);
  };
}

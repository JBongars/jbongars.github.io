/* Progressive enhancement: Hacklas disclaimer gate.
   Acknowledged state is stored in localStorage.
   Listeners are delegated so they survive site.js main swaps. */

import { safeLocalStorage, type StorageLike } from "../../platform";
import { siteUrl } from "../../site-url";
import type { DisclaimerDependencies } from "./types";

export type { DisclaimerDependencies } from "./types";

export const HACKLAS_DISCLAIMER_HOOK = "[data-hacklas-disclaimer]";
const ACK_HOOK = "[data-hacklas-disclaimer-ack]";
const REFUSE_HOOK = "[data-hacklas-disclaimer-refuse]";
const KEY = "hacklas-disclaimer-ack";

const enhancedRoots = new WeakSet<ParentNode>();

function noop(): void {
  /*
   * Teardown is a no-op when this root was not enhanced.
   */
}

function isAcked(storage: StorageLike | undefined): boolean {
  try {
    return storage?.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function setAcked(storage: StorageLike | undefined): void {
  try {
    storage?.setItem(KEY, "1");
  } catch {
    /*
    storage may be blocked
    */
  }
}

function setBodyLocked(isLocked: boolean): void {
  document.documentElement.classList.toggle("disclaimer-open", isLocked);
}

function prefixPath(): string {
  const raw = document.documentElement.dataset["pathPrefix"] ?? "/";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

function isHacklasHref(href: string, origin: string): boolean {
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin) {
      return false;
    }
    const prefix = prefixPath().replace(/\/$/, "");
    let rest = url.pathname;
    if (prefix && rest.startsWith(prefix)) {
      rest = rest.slice(prefix.length);
    }
    if (!rest.startsWith("/")) {
      rest = `/${rest}`;
    }
    return rest === "/hacklas" || rest.startsWith("/hacklas/");
  } catch {
    return false;
  }
}

function leaveHacklas(homeHref: string | undefined, dependencies: DisclaimerDependencies): void {
  const home = homeHref ?? siteUrl("/");
  const locationLike = dependencies.location ?? location;
  const reference = dependencies.referrer ?? document.referrer;
  if (reference && !isHacklasHref(reference, locationLike.origin)) {
    const here = locationLike.href;
    (dependencies.history ?? history).back();
    setTimeout(() => {
      if (locationLike.href === here) {
        locationLike.assign(home);
      }
    }, 250);
    return;
  }
  locationLike.assign(home);
}

function hideAll(): void {
  for (const modal of document.querySelectorAll<HTMLElement>(HACKLAS_DISCLAIMER_HOOK)) {
    modal.hidden = true;
  }
  setBodyLocked(false);
}

function hydrate(modal: HTMLElement, storage: StorageLike | undefined): void {
  if (isAcked(storage)) {
    modal.hidden = true;
    return;
  }
  modal.hidden = false;
  setBodyLocked(true);
  const button = modal.querySelector<HTMLElement>(ACK_HOOK);
  try {
    button?.focus();
  } catch {
    /*
    focus() can throw if the node is not focusable yet
    */
  }
}

function eventElement(event: Event): Element | undefined {
  const { target } = event;
  return target instanceof Element ? target : undefined;
}

export function init(
  root: ParentNode = document,
  dependencies: DisclaimerDependencies = {},
): () => void {
  if (!(root instanceof Document || root instanceof Element)) {
    return noop;
  }
  if (enhancedRoots.has(root)) {
    return noop;
  }

  const storage = dependencies.storage ?? safeLocalStorage();
  const controller = new AbortController();
  const { signal } = controller;

  function hydrateAll(): void {
    const modals = root.querySelectorAll<HTMLElement>(HACKLAS_DISCLAIMER_HOOK);
    if (modals.length === 0) {
      setBodyLocked(false);
      return;
    }
    for (const modal of modals) {
      hydrate(modal, storage);
    }
    if (isAcked(storage) || !root.querySelector(`${HACKLAS_DISCLAIMER_HOOK}:not([hidden])`)) {
      setBodyLocked(false);
    }
  }

  function onClick(event: Event): void {
    const target = eventElement(event);
    if (!target) {
      return;
    }
    if (target.closest(ACK_HOOK)) {
      setAcked(storage);
      hideAll();
      return;
    }
    const refuse = target.closest(REFUSE_HOOK);
    if (refuse instanceof HTMLAnchorElement) {
      event.preventDefault();
      leaveHacklas(refuse.getAttribute("href") ?? undefined, dependencies);
    }
  }

  enhancedRoots.add(root);
  root.addEventListener("click", onClick, { capture: true, signal });
  hydrateAll();

  return () => {
    controller.abort();
    enhancedRoots.delete(root);
  };
}

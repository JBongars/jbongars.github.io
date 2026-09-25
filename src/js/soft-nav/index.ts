/* Progressive enhancement: same-origin page swaps.
   Site works without this file. No page cache — hover/focus prefetches plus
   the browser HTTP cache only. */

import { fetchSameOrigin } from "../platform";
import type { LoadedPage, NavState, SoftNavDependencies } from "./types";

export type { SoftNavDependencies } from "./types";

const SKELETON_DELAY_MS = 150;
const SKELETON_MAX_MS = 1000;
const PREFETCH_CAP = 8;
const INDEX_PATHS = new Set(["/blog/", "/blog", "/write-ups/", "/write-ups", "/tools/", "/tools"]);

const enhancedRoots = new WeakSet<ParentNode>();

function noop(): void {
  /*
   * Teardown is a no-op when this root was not enhanced.
   */
}

function shouldSkipImage(img: Element): boolean {
  if (!(img instanceof HTMLImageElement) || img.hasAttribute("eleventy:ignore")) {
    return true;
  }
  const width = Math.trunc(Number(img.getAttribute("width")));
  const height = Math.trunc(Number(img.getAttribute("height")));
  return Boolean(width && height && width <= 32 && height <= 32);
}

function finishReveal(img: HTMLImageElement, isLoaded: boolean): void {
  img.classList.remove("is-pending");
  if (isLoaded) {
    img.classList.add("is-loaded");
  }
}

function revealImages(root: Element): void {
  for (const node of root.querySelectorAll("img")) {
    if (!(node instanceof HTMLImageElement) || shouldSkipImage(node) || node.complete) {
      continue;
    }
    node.classList.add("is-pending");
    node.addEventListener(
      "load",
      () => {
        finishReveal(node, true);
      },
      { once: true },
    );
    node.addEventListener(
      "error",
      () => {
        finishReveal(node, false);
      },
      { once: true },
    );
  }
}

function isSameOriginHref(href: string): boolean {
  try {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) {
      return false;
    }
    return url.pathname + url.search !== location.pathname + location.search;
  } catch {
    return false;
  }
}

function canonical(url: string): string {
  const parsed = new URL(url, location.href);
  parsed.hash = "";
  return parsed.href;
}

function localPathname(url: string): string {
  const parsed = new URL(url, location.href);
  let pathname = parsed.pathname;
  const prefix = (document.documentElement.dataset["pathPrefix"] ?? "/").replace(/\/$/, "");
  if (prefix && pathname === prefix) {
    return "/";
  }
  if (prefix && pathname.startsWith(`${prefix}/`)) {
    pathname = pathname.slice(prefix.length);
  }
  return pathname;
}

function pageKind(url: string): "cards" | "post" | "generic" {
  const path = localPathname(url);
  if (INDEX_PATHS.has(path)) {
    return "cards";
  }
  if (path.startsWith("/blog/") || path.startsWith("/write-ups/")) {
    return "post";
  }
  return "generic";
}

function repeatMarkup(count: number, html: string): string {
  return Array.from({ length: count }, () => html).join("");
}

function skeletonHtml(kind: "cards" | "post"): string {
  const live = '<p class="visually-hidden">Loading</p>';
  if (kind === "cards") {
    return `${live}<div class="skeleton skeleton--cards" aria-hidden="true"><div class="skeleton__bone skeleton__title"></div><ul class="card-grid skeleton__grid">${repeatMarkup(6, '<li><div class="card card--with-media"><div class="card__media skeleton__bone"></div><div class="skeleton__bone skeleton__line skeleton__line--title"></div><div class="skeleton__facts"><div class="skeleton__bone skeleton__line"></div><div class="skeleton__bone skeleton__line skeleton__line--short"></div></div></div></li>')}</ul></div>`;
  }
  return `${live}<div class="skeleton skeleton--post" aria-hidden="true"><div class="skeleton__bone skeleton__banner"></div><div class="skeleton__bone skeleton__title"></div><div class="skeleton__bone skeleton__line"></div><div class="skeleton__bone skeleton__line skeleton__line--short"></div><div class="skeleton__bone skeleton__line"></div><div class="skeleton__bone skeleton__line"></div><div class="skeleton__bone skeleton__line skeleton__line--short"></div></div>`;
}

function adoptBodyChildren(html: string): DocumentFragment {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const fragment = document.createDocumentFragment();
  for (const node of parsed.body.childNodes) {
    fragment.append(document.importNode(node, true));
  }
  return fragment;
}

function navAnchor(target: EventTarget | null): HTMLAnchorElement | undefined {
  if (!(target instanceof Element)) {
    return undefined;
  }
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) {
    return undefined;
  }
  if (anchor.target && anchor.target !== "_self") {
    return undefined;
  }
  if (!isSameOriginHref(anchor.href)) {
    return undefined;
  }
  return anchor;
}

function syncNav(nextDocument: Document): void {
  const next = nextDocument.querySelector(".site-nav");
  const current = document.querySelector(".site-nav");
  if (next && current) {
    current.replaceWith(next);
  }
}

function cancelNav(state: NavState): void {
  clearTimeout(state.skeletonTimer);
  clearTimeout(state.stuckTimer);
}

function isPlainClick(event: Event): event is MouseEvent {
  return (
    event instanceof MouseEvent &&
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function emit(name: "site:beforenavigate" | "site:navigated"): void {
  document.dispatchEvent(new CustomEvent(name));
}

export function init(
  root: ParentNode = document,
  dependencies: SoftNavDependencies = {},
): () => void {
  if (!(root instanceof Document || root instanceof Element)) {
    return noop;
  }
  if (enhancedRoots.has(root)) {
    return noop;
  }

  const fetchPage = dependencies.fetch ?? fetchSameOrigin;
  const scrollToPoint =
    dependencies.scrollTo ??
    ((x: number, y: number) => {
      scrollTo(x, y);
    });
  const foundMain = root.querySelector("main");
  if (!foundMain) {
    return noop;
  }
  const mainState = { node: foundMain };

  revealImages(mainState.node);

  const prefetches = new Map<string, Promise<LoadedPage>>();
  const prefetchOrder: string[] = [];
  let path = location.pathname + location.search;
  let active: NavState | undefined;
  let navAbort: AbortController | undefined;
  const controller = new AbortController();
  const { signal } = controller;

  function showSkeleton(kind: "cards" | "post"): void {
    scrollToPoint(0, 0);
    mainState.node.setAttribute("aria-busy", "true");
    mainState.node.replaceChildren(adoptBodyChildren(skeletonHtml(kind)));
  }

  function rememberPrefetch(key: string, request: Promise<LoadedPage>): void {
    if (!prefetches.has(key)) {
      prefetchOrder.push(key);
    }
    prefetches.set(key, request);
    while (prefetchOrder.length > PREFETCH_CAP) {
      const old = prefetchOrder.shift();
      if (old !== undefined && old !== key) {
        prefetches.delete(old);
      }
    }
  }

  async function fetchAndParse(url: string, abortSignal?: AbortSignal): Promise<LoadedPage> {
    const response = await fetchPage(url, { signal: abortSignal });
    if (!response.ok) {
      throw new Error(String(response.status));
    }
    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const nextMain = parsed.querySelector("main");
    if (!nextMain) {
      throw new Error("no main");
    }
    return { doc: parsed, nextMain };
  }

  function prefetch(href: string): void {
    const key = canonical(href);
    if (prefetches.has(key)) {
      return;
    }
    const request = fetchAndParse(key);
    rememberPrefetch(key, request);
    void request.catch(() => {
      if (prefetches.get(key) === request) {
        prefetches.delete(key);
      }
    });
  }

  function applyPage(options: {
    doc: Document;
    nextMain: HTMLElement;
    url: string;
    shouldPush: boolean;
  }): void {
    emit("site:beforenavigate");
    mainState.node.removeAttribute("aria-busy");
    mainState.node.replaceWith(options.nextMain);
    mainState.node = options.nextMain;
    document.title = options.doc.title;
    syncNav(options.doc);
    const navToggle = document.querySelector<HTMLInputElement>("#nav-toggle");
    if (navToggle) {
      navToggle.checked = false;
    }
    if (options.shouldPush) {
      history.pushState(undefined, "", options.url);
    }
    const next = new URL(options.url, location.href);
    path = next.pathname + next.search;
    scrollToPoint(0, 0);
    revealImages(options.nextMain);
    emit("site:navigated");
  }

  async function navigate(url: string, shouldPush: boolean): Promise<void> {
    const previous = active;
    active = undefined;
    if (previous) {
      cancelNav(previous);
    }
    navAbort?.abort();
    navAbort = new AbortController();
    const state: NavState = { skeletonTimer: undefined, stuckTimer: undefined };
    active = state;

    const kind = pageKind(url);
    if (kind !== "generic") {
      state.skeletonTimer = setTimeout(() => {
        showSkeleton(kind);
      }, SKELETON_DELAY_MS);
    }
    state.stuckTimer = setTimeout(() => {
      if (active === state) {
        if (shouldPush) {
          location.assign(url);
        } else {
          location.reload();
        }
      }
    }, SKELETON_DELAY_MS + SKELETON_MAX_MS);

    try {
      const key = canonical(url);
      const page = prefetches.get(key) ?? fetchAndParse(key, navAbort.signal);
      const loaded = await page;
      if (active !== state) {
        return;
      }
      cancelNav(state);
      applyPage({
        doc: loaded.doc,
        nextMain: loaded.nextMain,
        url,
        shouldPush,
      });
    } catch (error) {
      if (active !== state) {
        return;
      }
      cancelNav(state);
      throw error;
    }
  }

  enhancedRoots.add(root);
  root.addEventListener(
    "pointerover",
    (event) => {
      const anchor = navAnchor(event.target);
      if (anchor) {
        prefetch(anchor.href);
      }
    },
    { signal },
  );
  root.addEventListener(
    "focusin",
    (event) => {
      const anchor = navAnchor(event.target);
      if (anchor) {
        prefetch(anchor.href);
      }
    },
    { signal },
  );
  root.addEventListener(
    "click",
    (event) => {
      const anchor = navAnchor(event.target);
      if (!anchor || !isPlainClick(event)) {
        return;
      }
      event.preventDefault();
      void navigate(anchor.href, true).catch(() => {
        location.assign(anchor.href);
      });
    },
    { signal },
  );
  addEventListener(
    "popstate",
    () => {
      const next = location.pathname + location.search;
      if (next === path) {
        return;
      }
      path = next;
      void navigate(location.href, false).catch(() => {
        location.reload();
      });
    },
    { signal },
  );
  addEventListener(
    "site:pathreplace",
    () => {
      path = location.pathname + location.search;
    },
    { signal },
  );

  return () => {
    controller.abort();
    navAbort?.abort();
    enhancedRoots.delete(root);
  };
}

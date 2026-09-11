/* Progressive enhancement: same-origin page swaps.
   Site works without this file. No page cache — in-flight/recent hover
   prefetches plus the browser HTTP cache only. */

import { fetchSameOrigin } from "../platform";
import type { LoadedPage, NavState, SoftNavDependencies } from "./types";

export type { SoftNavDependencies } from "./types";

const SKELETON_DELAY_MS = 150;
const SKELETON_MAX_MS = 1000;
const IMAGE_WAIT_MS = 600;
const PREFETCH_CAP = 8;
const INDEX_PATHS = new Set(["/blog/", "/blog", "/write-ups/", "/write-ups"]);

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

function takeImgs(
  root: Element,
  options: { selector: string; max: number; out: HTMLImageElement[] },
): void {
  let n = 0;
  for (const node of root.querySelectorAll(options.selector)) {
    if (n >= options.max) {
      break;
    }
    if (!(node instanceof HTMLImageElement) || shouldSkipImage(node)) {
      continue;
    }
    options.out.push(node);
    n += 1;
  }
}

function collectPrefetchImages(root: Element): HTMLImageElement[] {
  const imgs: HTMLImageElement[] = [];
  takeImgs(root, { selector: ".post-banner__img, .home-hero__image", max: 4, out: imgs });
  takeImgs(root, { selector: ".card__media img", max: 6, out: imgs });
  takeImgs(root, { selector: ".prose img", max: 2, out: imgs });
  return imgs;
}

async function decodeImg(element: HTMLImageElement): Promise<void> {
  const source = element.getAttribute("src");
  if (!source) {
    return;
  }
  const img = new Image();
  const srcset = element.getAttribute("srcset");
  const sizes = element.getAttribute("sizes");
  if (srcset) {
    img.srcset = srcset;
  }
  if (sizes) {
    img.sizes = sizes;
  }
  img.src = source;
  if (typeof img.decode === "function") {
    try {
      await img.decode();
    } catch {
      /*
      Broken images still settle.
      */
    }
    return;
  }
  await new Promise<void>((resolve) => {
    img.addEventListener("load", () => {
      resolve();
    });
    img.addEventListener("error", () => {
      resolve();
    });
    if (img.complete) {
      resolve();
    }
  });
}

function settleWithTimeout(promise: Promise<unknown>, ms: number): Promise<unknown> {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),
  ]);
}

async function prefetchImages(root: Element, waitMs: number): Promise<void> {
  if (waitMs <= 0) {
    return;
  }
  const decodes = Array.from(collectPrefetchImages(root), (image) => decodeImg(image));
  await settleWithTimeout(Promise.all(decodes), waitMs);
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

function markApplied(state: NavState): void {
  state.isApplied = true;
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
  let navGen = 0;
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

  async function forgetFailedPrefetch(key: string, request: Promise<LoadedPage>): Promise<void> {
    try {
      await request;
    } catch {
      if (prefetches.get(key) === request) {
        prefetches.delete(key);
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
    void prefetchImages(nextMain, IMAGE_WAIT_MS);
    return { doc: parsed, nextMain };
  }

  function loadDocument(url: string, abortSignal?: AbortSignal): Promise<LoadedPage> {
    const key = canonical(url);
    const cached = prefetches.get(key);
    if (cached) {
      return cached;
    }
    const request = fetchAndParse(url, abortSignal);
    rememberPrefetch(key, request);
    void forgetFailedPrefetch(key, request);
    return request;
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

  function armSkeleton(options: {
    kind: "cards" | "post" | "generic";
    gen: number;
    url: string;
    shouldPush: boolean;
    state: NavState;
  }): void {
    const { kind, gen, url, shouldPush, state } = options;
    if (kind === "generic") {
      return;
    }
    state.skeletonTimer = setTimeout(() => {
      if (gen === navGen) {
        showSkeleton(kind);
      }
    }, SKELETON_DELAY_MS);
    state.stuckTimer = setTimeout(() => {
      if (gen !== navGen || state.isApplied) {
        return;
      }
      if (shouldPush) {
        location.assign(url);
      } else {
        location.reload();
      }
    }, SKELETON_DELAY_MS + SKELETON_MAX_MS);
  }

  async function settleAndApply(options: {
    loaded: LoadedPage;
    gen: number;
    started: number;
    state: NavState;
    url: string;
    shouldPush: boolean;
  }): Promise<void> {
    if (options.gen !== navGen) {
      return;
    }
    const elapsed = Date.now() - options.started;
    const budget = SKELETON_DELAY_MS + SKELETON_MAX_MS - elapsed;
    const wait = Math.max(0, Math.min(IMAGE_WAIT_MS, budget));
    await prefetchImages(options.loaded.nextMain, wait);
    if (options.gen !== navGen) {
      return;
    }
    markApplied(options.state);
    applyPage({
      doc: options.loaded.doc,
      nextMain: options.loaded.nextMain,
      url: options.url,
      shouldPush: options.shouldPush,
    });
  }

  async function navigate(url: string, shouldPush: boolean): Promise<void> {
    navAbort?.abort();
    navAbort = new AbortController();
    const abortSignal = navAbort.signal;
    const gen = ++navGen;
    const started = Date.now();
    const state: NavState = { skeletonTimer: undefined, stuckTimer: undefined, isApplied: false };
    armSkeleton({ kind: pageKind(url), gen, url, shouldPush, state });
    try {
      const loaded = await loadDocument(url, abortSignal);
      await settleAndApply({ loaded, gen, started, state, url, shouldPush });
    } catch (error) {
      if (gen !== navGen) {
        return;
      }
      markApplied(state);
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      throw error;
    }
  }

  enhancedRoots.add(root);
  root.addEventListener(
    "pointerover",
    (event) => {
      const anchor = navAnchor(event.target);
      if (anchor) {
        void loadDocument(anchor.href);
      }
    },
    { signal },
  );
  root.addEventListener(
    "focusin",
    (event) => {
      const anchor = navAnchor(event.target);
      if (anchor) {
        void loadDocument(anchor.href);
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

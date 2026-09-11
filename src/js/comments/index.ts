/* Progressive enhancement: inject Giscus into [data-comments].
   Without this file, the heading and noscript note remain. */

import type { CommentFields, CommentsDependencies } from "./types";

export type { CommentsDependencies } from "./types";

export const COMMENTS_HOOK = "[data-comments]";
const MOUNT_HOOK = "[data-comments-mount]";
const SRC = "https://giscus.app/client.js";
const GISCUS_ORIGIN = "https://giscus.app";
const DEFAULT_THEME = "transparent_dark";
const DEFAULT_THEME_LIGHT = "light";
const THEME_TOGGLE_HOOK = "[data-theme-toggle]";

const enhancedRoots = new WeakSet<ParentNode>();

function noop(): void {
  /*
   * Teardown is a no-op when this root was not enhanced.
   */
}

function isLight(root: ParentNode): boolean {
  const toggle = root.querySelector<HTMLInputElement>(THEME_TOGGLE_HOOK);
  return Boolean(toggle?.checked);
}

function themeFor(section: HTMLElement, root: ParentNode): string {
  const dark = section.dataset["theme"] ?? DEFAULT_THEME;
  const light = section.dataset["themeLight"] ?? DEFAULT_THEME_LIGHT;
  return isLight(root) ? light : dark;
}

function commentFields(section: HTMLElement): CommentFields {
  return {
    repo: section.dataset["repo"] ?? "",
    repoId: section.dataset["repoId"] ?? "",
    category: section.dataset["category"] ?? "",
    categoryId: section.dataset["categoryId"] ?? "",
    term: section.dataset["term"] ?? "",
  };
}

function mountPoint(section: HTMLElement): Element | undefined {
  const mount = section.querySelector(MOUNT_HOOK);
  if (!mount) {
    return undefined;
  }
  if (mount.querySelector("iframe.giscus-frame, script[src*='giscus.app/client.js']")) {
    return undefined;
  }
  return mount;
}

function ensureGiscusCss(): void {
  if (document.querySelector("#giscus-css")) {
    return;
  }
  const decoy = document.createElement("style");
  decoy.id = "giscus-css";
  document.head.append(decoy);
}

function giscusScript(section: HTMLElement, root: ParentNode): HTMLScriptElement {
  const fields = commentFields(section);
  const script = document.createElement("script");
  script.src = `${SRC}?term=${encodeURIComponent(fields.term)}`;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.dataset["repo"] = fields.repo;
  script.dataset["repoId"] = fields.repoId;
  script.dataset["category"] = fields.category;
  script.dataset["categoryId"] = fields.categoryId;
  script.dataset["mapping"] = "specific";
  script.dataset["term"] = fields.term;
  script.dataset["strict"] = "1";
  script.dataset["reactionsEnabled"] = "1";
  script.dataset["emitMetadata"] = "0";
  script.dataset["inputPosition"] = "bottom";
  script.dataset["theme"] = themeFor(section, root);
  script.dataset["lang"] = "en";
  return script;
}

function inject(section: HTMLElement, root: ParentNode): void {
  const mount = mountPoint(section);
  if (!mount) {
    return;
  }
  const fields = commentFields(section);
  if (!fields.repo || !fields.repoId || !fields.categoryId || !fields.term) {
    return;
  }
  mount.replaceChildren();
  ensureGiscusCss();
  mount.append(giscusScript(section, root));
}

function postTheme(
  iframe: HTMLIFrameElement,
  theme: string,
  postMessage: CommentsDependencies["postMessage"],
): void {
  if (postMessage) {
    postMessage(iframe, { giscus: { setConfig: { theme } } }, GISCUS_ORIGIN);
    return;
  }
  iframe.contentWindow?.postMessage({ giscus: { setConfig: { theme } } }, GISCUS_ORIGIN);
}

export function init(
  root: ParentNode = document,
  dependencies: CommentsDependencies = {},
): () => void {
  if (!(root instanceof Document || root instanceof Element)) {
    return noop;
  }
  if (enhancedRoots.has(root)) {
    return noop;
  }

  let pendingTheme: string | undefined;
  const controller = new AbortController();
  const { signal } = controller;
  const themeRoot = root instanceof Document ? root : document;

  function applyTheme(theme: string): void {
    const iframe = document.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
    if (!iframe?.contentWindow) {
      pendingTheme = theme;
      return;
    }
    pendingTheme = undefined;
    postTheme(iframe, theme, dependencies.postMessage);
  }

  function syncTheme(): void {
    const section = root.querySelector<HTMLElement>(COMMENTS_HOOK);
    if (!section) {
      return;
    }
    applyTheme(themeFor(section, themeRoot));
  }

  enhancedRoots.add(root);
  for (const section of root.querySelectorAll<HTMLElement>(COMMENTS_HOOK)) {
    inject(section, themeRoot);
  }

  themeRoot.querySelector(THEME_TOGGLE_HOOK)?.addEventListener("change", syncTheme, { signal });
  addEventListener(
    "message",
    (event) => {
      if (!(event instanceof MessageEvent) || event.origin !== GISCUS_ORIGIN) {
        return;
      }
      if (!pendingTheme) {
        return;
      }
      const data: unknown = event.data;
      if (typeof data !== "object" || data === null || !("giscus" in data)) {
        return;
      }
      applyTheme(pendingTheme);
    },
    { signal },
  );

  return () => {
    controller.abort();
    enhancedRoots.delete(root);
  };
}

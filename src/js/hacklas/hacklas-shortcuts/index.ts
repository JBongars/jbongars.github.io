/* Progressive enhancement: Hacklas keyboard shortcuts.
   Site works without this file. */

import { pathPrefix, siteUrl } from "../../site-url";
import type { HacklasShortcutsDependencies, ShortcutContext } from "./types";

export type { HacklasShortcutsDependencies } from "./types";

const FUZZY_INPUT_HOOK = "[data-fuzzy-input]";
const FUZZY_LIST_HOOK = "[data-fuzzy-list]";
const BACK_HOOK = "[data-back]";
const SHORTCUTS_MODAL_HOOK = "[data-shortcuts-modal]";
const DISCLAIMER_HOOK = "[data-hacklas-disclaimer]";
const NAV_LIST_LINKS = "[data-nav-list] a[href]";
const SEARCH_UI_HOOK = "[data-tag-search], [data-fuzzy-find]";

const NON_TEXT_INPUT_TYPES = new Set([
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "file",
  "hidden",
  "range",
  "color",
  "image",
]);

const ACTIVATE_TAGS = new Set(["a", "button", "summary"]);

const enhancedRoots = new WeakSet<ParentNode>();

function noop(): void {
  /*
   * Teardown is a no-op when this root was not enhanced.
   */
}

function sitePath(pathname: string): string {
  const prefixTrim = pathPrefix().replace(/\/$/u, "");
  let rest = pathname.length > 0 ? pathname : "/";
  if (prefixTrim && rest.startsWith(prefixTrim)) {
    rest = rest.slice(prefixTrim.length) || "/";
  }
  if (!rest.startsWith("/")) {
    rest = `/${rest}`;
  }
  return rest.replace(/\/+$/u, "") || "/";
}

function isHacklasIndex(pathname: string): boolean {
  return sitePath(pathname) === "/hacklas";
}

function isHacklasNote(pathname: string): boolean {
  return sitePath(pathname).startsWith("/hacklas/");
}

function inputType(element: Element): string {
  return (element.getAttribute("type") ?? "text").toLowerCase();
}

function isEditableTag(tag: string): boolean {
  return tag === "textarea" || tag === "select";
}

function isTextField(element: EventTarget | null): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  if (element === document.body || element === document.documentElement) {
    return false;
  }
  if (element.isContentEditable) {
    return true;
  }
  const tag = element.tagName.toLowerCase();
  if (isEditableTag(tag)) {
    return true;
  }
  if (tag !== "input") {
    return false;
  }
  return !NON_TEXT_INPUT_TYPES.has(inputType(element));
}

function isSearchUi(element: EventTarget | null): boolean {
  return element instanceof Element && Boolean(element.closest(SEARCH_UI_HOOK));
}

function isOverlayOpen(root: ParentNode): boolean {
  const help = root.querySelector(SHORTCUTS_MODAL_HOOK);
  if (help instanceof HTMLElement && !help.hidden) {
    return true;
  }
  const disclaimer = root.querySelector(DISCLAIMER_HOOK);
  return disclaimer instanceof HTMLElement && !disclaimer.hidden;
}

function hasModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}

function shouldIgnoreShortcut(event: KeyboardEvent, root: ParentNode): boolean {
  if (event.defaultPrevented || event.isComposing || hasModifier(event)) {
    return true;
  }
  if (isOverlayOpen(root)) {
    return true;
  }
  const active = document.activeElement;
  return isTextField(active) || isSearchUi(active);
}

function isSameHacklasPath(link: HTMLAnchorElement, href: string, base: string): boolean {
  try {
    const url = new URL(link.href, base);
    const target = new URL(href, base);
    return url.pathname.replace(/\/$/u, "") === target.pathname.replace(/\/$/u, "");
  } catch {
    return false;
  }
}

function goToHacklas(context: ShortcutContext): void {
  const href = siteUrl("/hacklas/");
  for (const link of context.root.querySelectorAll<HTMLAnchorElement>(NAV_LIST_LINKS)) {
    if (isSameHacklasPath(link, href, context.location.href)) {
      link.click();
      return;
    }
  }
  context.location.assign(href);
}

function typeIntoSearch(root: ParentNode, character: string): void {
  const input = root.querySelector(FUZZY_INPUT_HOOK);
  if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLTextAreaElement)) {
    return;
  }
  input.focus();
  input.value = `${input.value}${character}`;
  input.setSelectionRange(input.value.length, input.value.length);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function firstVisibleItem(list: Element): Element | undefined {
  const active = list.querySelector("li.is-active");
  if (active instanceof HTMLElement && active.style.display !== "none") {
    return active;
  }
  for (const item of list.children) {
    if (item instanceof HTMLElement && item.style.display !== "none") {
      return item;
    }
  }
}

function didOpenFirstResult(root: ParentNode): boolean {
  const list = root.querySelector(FUZZY_LIST_HOOK);
  if (!list) {
    return false;
  }
  const link = firstVisibleItem(list)?.querySelector("a[href]");
  if (!(link instanceof HTMLAnchorElement)) {
    return false;
  }
  link.click();
  return true;
}

function goBackFromNote(context: ShortcutContext): void {
  const link = context.root.querySelector(BACK_HOOK);
  if (link instanceof HTMLAnchorElement) {
    link.click();
    return;
  }
  context.history.back();
}

function isActivateKey(element: EventTarget | null): boolean {
  return element instanceof Element && ACTIVATE_TAGS.has(element.tagName.toLowerCase());
}

function didHandleEnter(event: KeyboardEvent, context: ShortcutContext): boolean {
  if (event.key !== "Enter") {
    return false;
  }
  if (isActivateKey(document.activeElement) || !isHacklasIndex(context.location.pathname)) {
    return true;
  }
  if (didOpenFirstResult(context.root)) {
    event.preventDefault();
  }
  return true;
}

function didHandleBackspace(event: KeyboardEvent, context: ShortcutContext): boolean {
  if (event.key !== "Backspace") {
    return false;
  }
  if (event.repeat || !isHacklasNote(context.location.pathname)) {
    return true;
  }
  event.preventDefault();
  goBackFromNote(context);
  return true;
}

function didHandleHacklasKey(event: KeyboardEvent, context: ShortcutContext): boolean {
  if (isHacklasIndex(context.location.pathname) || (event.key !== "h" && event.key !== "H")) {
    return false;
  }
  if (event.repeat) {
    return true;
  }
  event.preventDefault();
  goToHacklas(context);
  return true;
}

function onShortcutKey(event: Event, context: ShortcutContext): void {
  if (!(event instanceof KeyboardEvent) || shouldIgnoreShortcut(event, context.root)) {
    return;
  }
  if (didHandleEnter(event, context) || didHandleBackspace(event, context)) {
    return;
  }
  if (event.key.length !== 1) {
    return;
  }
  if (didHandleHacklasKey(event, context)) {
    return;
  }
  if (isHacklasIndex(context.location.pathname)) {
    event.preventDefault();
    typeIntoSearch(context.root, event.key);
  }
}

export function init(
  root: ParentNode = document,
  dependencies: HacklasShortcutsDependencies = {},
): () => void {
  if (!(root instanceof Document || root instanceof Element)) {
    return noop;
  }
  if (enhancedRoots.has(root)) {
    return noop;
  }

  const context: ShortcutContext = {
    root,
    location: dependencies.location ?? location,
    history: dependencies.history ?? history,
  };
  const controller = new AbortController();

  enhancedRoots.add(root);
  root.addEventListener(
    "keydown",
    (event) => {
      onShortcutKey(event, context);
    },
    { capture: true, signal: controller.signal },
  );

  return () => {
    controller.abort();
    enhancedRoots.delete(root);
  };
}

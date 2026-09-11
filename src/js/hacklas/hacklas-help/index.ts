/* Progressive enhancement: desktop Hacklas shortcuts help.
   Button and dialog are created in JS and hidden below the desktop nav breakpoint.
   Site works without this file. */

import { matchMediaQuery, mediaQueryList } from "../../platform";
import type { DesktopMedia, HacklasHelpDependencies, HelpContext, HelpState } from "./types";

export type { HacklasHelpDependencies } from "./types";

export const SHORTCUTS_HELP_HOOK = "[data-shortcuts-help]";
export const SHORTCUTS_MODAL_HOOK = "[data-shortcuts-modal]";

const CLOSE_HOOK = "[data-shortcuts-close]";
const NAV_LIST_LINKS = "[data-nav-list] a[href]";
const DISCLAIMER_HOOK = "[data-hacklas-disclaimer]";
const DESKTOP_QUERY = "(min-width: 48rem)";
const TITLE_ID = "shortcuts-modal-title";
const OPEN_CLASS = "shortcuts-open";

const enhancedRoots = new WeakSet<ParentNode>();

const ROWS: readonly { keys: readonly string[]; description: string }[] = [
  { keys: ["h"], description: "Go to Hacklas" },
  { keys: ["Type"], description: "Search notes on the Hacklas index" },
  { keys: ["Space"], description: "Add the matching tag as a filter" },
  { keys: ["Tab"], description: "Add the highlighted tag as a filter" },
  { keys: ["Left", "Right"], description: "Highlight a matching tag" },
  { keys: ["Up", "Down"], description: "Highlight a note" },
  { keys: ["Enter"], description: "Open the highlighted note" },
  { keys: ["Backspace"], description: "Go back from a note" },
];

function noop(): void {
  /*
   * Teardown is a no-op when this root was not enhanced.
   */
}

function eventElement(event: Event): Element | undefined {
  const { target } = event;
  return target instanceof Element ? target : undefined;
}

function trimmedPath(pathname: string): string {
  return pathname.replace(/\/$/u, "");
}

function isHacklasPage(): boolean {
  const path = trimmedPath(location.pathname);
  return path.endsWith("/hacklas") || path.includes("/hacklas/");
}

function desktopMedia(dependencies: HacklasHelpDependencies): DesktopMedia | undefined {
  if (Object.hasOwn(dependencies, "matchMediaList") && !dependencies.matchMediaList) {
    return undefined;
  }
  const createList = dependencies.matchMediaList ?? mediaQueryList;
  return createList(DESKTOP_QUERY);
}

function isDesktop(media: DesktopMedia | undefined): boolean {
  if (media) {
    return media.matches;
  }
  return matchMediaQuery(DESKTOP_QUERY).matches;
}

function isDisclaimerOpen(root: ParentNode): boolean {
  if (document.documentElement.classList.contains("disclaimer-open")) {
    return true;
  }
  return Boolean(root.querySelector(`${DISCLAIMER_HOOK}:not([hidden])`));
}

function focusSafely(node: EventTarget | null | undefined): void {
  if (!(node instanceof HTMLElement)) {
    return;
  }
  try {
    node.focus();
  } catch {
    /*
     * focus() can throw if the node is not focusable.
     */
  }
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function appendShortcutRows(list: HTMLUListElement): void {
  for (const shortcut of ROWS) {
    const row = element("li", "shortcuts-modal__row");
    const keys = element("span", "shortcuts-modal__keys");
    for (const key of shortcut.keys) {
      const kbd = document.createElement("kbd");
      kbd.textContent = key;
      keys.append(kbd);
    }
    const description = element("p", "shortcuts-modal__desc");
    description.textContent = shortcut.description;
    row.append(keys, description);
    list.append(row);
  }
}

function buildModal(): HTMLElement {
  const modal = element("div", "shortcuts-modal");
  modal.dataset["shortcutsModal"] = "";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", TITLE_ID);
  modal.hidden = true;

  const backdrop = element("div", "shortcuts-modal__backdrop");
  backdrop.setAttribute("aria-hidden", "true");
  backdrop.dataset["shortcutsClose"] = "";

  const panel = element("div", "shortcuts-modal__panel");
  const title = element("h2", "shortcuts-modal__title");
  title.id = TITLE_ID;
  title.textContent = "Keyboard shortcuts";

  const list = element("ul", "shortcuts-modal__list");
  appendShortcutRows(list);

  const closeButton = element("button", "shortcuts-modal__close");
  closeButton.type = "button";
  closeButton.dataset["shortcutsClose"] = "";
  closeButton.textContent = "Close";

  panel.append(title, list, closeButton);
  modal.append(backdrop, panel);
  return modal;
}

function ensureModal(state: HelpState): HTMLElement {
  if (state.modal) {
    return state.modal;
  }
  const modal = buildModal();
  document.body.append(modal);
  state.modal = modal;
  return modal;
}

function isModalOpen(state: HelpState): boolean {
  return state.modal !== undefined && !state.modal.hidden;
}

function setOpen(state: HelpState, isOpen: boolean): void {
  const modal = ensureModal(state);
  modal.hidden = !isOpen;
  document.documentElement.classList.toggle(OPEN_CLASS, isOpen);
  if (isOpen) {
    const active = document.activeElement;
    state.lastFocus = active instanceof HTMLElement ? active : undefined;
    focusSafely(modal.querySelector(`button${CLOSE_HOOK}`));
    return;
  }
  focusSafely(state.lastFocus);
  state.lastFocus = undefined;
}

function closeHelp(state: HelpState): void {
  if (!state.modal) {
    document.documentElement.classList.remove(OPEN_CLASS);
    return;
  }
  setOpen(state, false);
}

function openHelp(context: HelpContext): void {
  if (!isDesktop(context.media) || isDisclaimerOpen(context.root)) {
    return;
  }
  setOpen(context.state, true);
}

function toggleHelp(context: HelpContext): void {
  if (isModalOpen(context.state)) {
    closeHelp(context.state);
    return;
  }
  openHelp(context);
}

function isHacklasNavHref(href: string): boolean {
  try {
    return trimmedPath(new URL(href, location.href).pathname).endsWith("/hacklas");
  } catch {
    return false;
  }
}

function navAnchors(root: ParentNode): NodeListOf<HTMLAnchorElement> {
  const scoped = root.querySelectorAll<HTMLAnchorElement>(NAV_LIST_LINKS);
  if (scoped.length > 0) {
    return scoped;
  }
  return root.querySelectorAll<HTMLAnchorElement>("a[href]");
}

function hacklasNavItem(root: ParentNode): Element | undefined {
  for (const link of navAnchors(root)) {
    if (!isHacklasNavHref(link.href)) {
      continue;
    }
    const item = link.closest("li");
    if (item) {
      return item;
    }
  }
}

function removeHelpItem(state: HelpState, root: ParentNode): void {
  state.helpItem?.remove();
  state.helpItem = undefined;
  root.querySelector(SHORTCUTS_HELP_HOOK)?.closest("li")?.remove();
}

function unmount(state: HelpState, root: ParentNode): void {
  removeHelpItem(state, root);
  state.modal?.remove();
  state.modal = undefined;
  document.querySelector(SHORTCUTS_MODAL_HOOK)?.remove();
  document.documentElement.classList.remove(OPEN_CLASS);
}

function mountButton(state: HelpState, root: ParentNode): void {
  const navItem = hacklasNavItem(root);
  const parent = navItem?.parentNode;
  if (!navItem || !parent) {
    return;
  }
  removeHelpItem(state, root);
  const item = element("li", "shortcuts-help");
  const button = element("button", "shortcuts-help__btn");
  button.type = "button";
  button.setAttribute("aria-label", "Hacklas keyboard shortcuts");
  button.dataset["shortcutsHelp"] = "";
  button.textContent = "?";
  item.append(button);
  parent.insertBefore(item, navItem.nextSibling);
  state.helpItem = item;
}

function hydrate(state: HelpState, root: ParentNode): void {
  if (!isHacklasPage()) {
    unmount(state, root);
    return;
  }
  ensureModal(state);
  mountButton(state, root);
}

function onHelpClick(event: Event, context: HelpContext): void {
  const target = eventElement(event);
  if (!target) {
    return;
  }
  if (target.closest(SHORTCUTS_HELP_HOOK)) {
    event.preventDefault();
    toggleHelp(context);
    return;
  }
  const closer = target.closest(CLOSE_HOOK);
  if (closer && context.state.modal?.contains(closer)) {
    event.preventDefault();
    closeHelp(context.state);
  }
}

function onHelpKeydown(event: Event, state: HelpState): void {
  if (!(event instanceof KeyboardEvent) || event.key !== "Escape" || !isModalOpen(state)) {
    return;
  }
  event.preventDefault();
  closeHelp(state);
}

function closeIfMobile(media: DesktopMedia, state: HelpState): void {
  if (!media.matches) {
    closeHelp(state);
  }
}

export function init(
  root: ParentNode = document,
  dependencies: HacklasHelpDependencies = {},
): () => void {
  if (!(root instanceof Document || root instanceof Element)) {
    return noop;
  }
  if (enhancedRoots.has(root)) {
    return noop;
  }

  const media = desktopMedia(dependencies);
  const state: HelpState = {
    lastFocus: undefined,
    helpItem: undefined,
    modal: undefined,
  };
  const context: HelpContext = { root, state, media };
  const controller = new AbortController();
  const { signal } = controller;

  enhancedRoots.add(root);
  root.addEventListener(
    "click",
    (event) => {
      onHelpClick(event, context);
    },
    { signal },
  );
  root.addEventListener(
    "keydown",
    (event) => {
      onHelpKeydown(event, state);
    },
    { capture: true, signal },
  );
  if (media) {
    media.addEventListener(
      "change",
      () => {
        closeIfMobile(media, state);
      },
      { signal },
    );
  }
  hydrate(state, root);

  return () => {
    controller.abort();
    enhancedRoots.delete(root);
    unmount(state, root);
  };
}

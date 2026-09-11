/* Progressive enhancement: mobile skill-tag hints as a lower third.
   Desktop keeps the CSS hover bubble. Without this file, no-hover
   devices show no hint (bubble is hidden in CSS). */

import { matchMediaQuery } from "../platform";
import type { HintPanel, SkillHintDependencies } from "./types";

export type { SkillHintDependencies } from "./types";

export const SKILL_HINT_HOOK = "a[data-hint]";
const PANEL_HOOK = "[data-skill-hint]";
const CLOSE_HOOK = "[data-skill-hint-close]";
const HOVER_QUERY = "(hover: none)";
const CLOSE_PATH =
  "M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z";

const enhancedRoots = new WeakSet<ParentNode>();

function noop(): void {
  /*
   * Teardown is a no-op when this root was not enhanced.
   */
}

function isModifiedClick(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function eventElement(event: Event): Element | undefined {
  const { target } = event;
  return target instanceof Element ? target : undefined;
}

function closeIcon(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", CLOSE_PATH);
  svg.append(path);
  return svg;
}

function buildPanel(): HintPanel {
  const root = document.createElement("aside");
  root.className = "skill-hint";
  root.hidden = true;
  root.dataset["skillHint"] = "";
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");
  const inner = document.createElement("div");
  inner.className = "skill-hint__inner";
  const titleLink = document.createElement("a");
  titleLink.className = "skill-hint__title";
  titleLink.target = "_blank";
  titleLink.rel = "noopener noreferrer";
  const bodyElement = document.createElement("p");
  bodyElement.className = "skill-hint__body";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "skill-hint__close";
  closeButton.dataset["skillHintClose"] = "";
  closeButton.setAttribute("aria-label", "Dismiss skill hint");
  const hidden = document.createElement("span");
  hidden.className = "visually-hidden";
  hidden.textContent = "Close";
  closeButton.append(closeIcon(), hidden);
  inner.append(titleLink, bodyElement);
  root.append(inner, closeButton);
  document.body.append(root);
  return { root, titleLink, bodyElement };
}

function clearCurrent(tag: HTMLAnchorElement | undefined): void {
  if (!tag) {
    return;
  }
  tag.classList.remove("is-hinting");
  tag.removeAttribute("aria-expanded");
}

export function init(
  root: ParentNode = document,
  dependencies: SkillHintDependencies = {},
): () => void {
  if (!(root instanceof Document || root instanceof Element)) {
    return noop;
  }
  if (enhancedRoots.has(root)) {
    return noop;
  }

  const media = dependencies.matchMedia ?? matchMediaQuery;
  let panel: HintPanel | undefined;
  let currentTag: HTMLAnchorElement | undefined;
  const controller = new AbortController();
  const { signal } = controller;

  function isTouchHint(): boolean {
    return media(HOVER_QUERY).matches;
  }

  function hide(): void {
    if (panel) {
      panel.root.hidden = true;
    }
    clearCurrent(currentTag);
    currentTag = undefined;
  }

  function show(tag: HTMLAnchorElement): void {
    panel ??= buildPanel();
    panel.titleLink.textContent = (tag.textContent || "").trim();
    panel.titleLink.href = tag.href;
    panel.bodyElement.textContent = tag.dataset["hint"] ?? "";
    clearCurrent(currentTag);
    currentTag = tag;
    tag.classList.add("is-hinting");
    tag.setAttribute("aria-expanded", "true");
    panel.root.hidden = false;
  }

  function onTagClick(event: Event, tag: HTMLAnchorElement): void {
    event.preventDefault();
    if (currentTag === tag) {
      hide();
      return;
    }
    show(tag);
  }

  function onDocumentClick(event: Event): void {
    if (!(event instanceof MouseEvent) || !isTouchHint() || event.button !== 0) {
      return;
    }
    if (isModifiedClick(event)) {
      return;
    }
    const target = eventElement(event);
    if (!target) {
      return;
    }
    if (target.closest(CLOSE_HOOK)) {
      event.preventDefault();
      hide();
      return;
    }
    if (target.closest(PANEL_HOOK)) {
      return;
    }
    const tag = target.closest(SKILL_HINT_HOOK);
    if (tag instanceof HTMLAnchorElement) {
      onTagClick(event, tag);
      return;
    }
    if (currentTag) {
      hide();
    }
  }

  enhancedRoots.add(root);
  root.addEventListener("click", onDocumentClick, { signal });
  root.addEventListener(
    "keydown",
    (event) => {
      if (!(event instanceof KeyboardEvent)) {
        return;
      }
      if (event.key === "Escape" || event.key === "Esc") {
        hide();
      }
    },
    { signal },
  );
  if (root instanceof Document) {
    addEventListener("popstate", hide, { signal });
  }

  return () => {
    controller.abort();
    enhancedRoots.delete(root);
    clearCurrent(currentTag);
    currentTag = undefined;
    panel?.root.remove();
    panel = undefined;
  };
}

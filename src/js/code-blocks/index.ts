/* Progressive enhancement: toolbar, line numbers, collapse, fullscreen.
   Hydrated only when [data-code-block] is present. Safe without this file. */

import { clipboardWrite } from "../platform";
import type {
  CodeBlockDependencies,
  CopySession,
  EnhanceSession,
  FullscreenButtonDetails,
  FullscreenChrome,
  FullscreenRequest,
  FullscreenToolbar,
  IconSet,
  InlineCopy,
} from "./types";

export type { CodeBlockDependencies } from "./types";

export const CODE_BLOCK_HOOK = "[data-code-block]";
export const INLINE_CODE_HOOK = "[data-inline-code]";

const MAX_VH = 20;
const COPY_RESET_MS = 1600;
const HEADER_GAP_PX = 8;
const TALL_SLOP_PX = 4;
const PLAIN_LANGUAGES = new Set(["text", "plain", "plaintext"]);

const enhancedRoots = new WeakSet<ParentNode>();

function noop(): void {
  /*
   * Teardown is a no-op when this root was not enhanced.
   */
}

function defaultViewportHeight(): number {
  return innerHeight;
}

function defaultScrollBy(x: number, y: number): void {
  scrollBy(x, y);
}

function svgIcon(paths: readonly string[]): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "code-block__icon");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const pathData of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", pathData);
    svg.append(path);
  }
  return svg;
}

function createIcons(): IconSet {
  const ICONS = {
    copy: svgIcon([
      "M5.5 2A1.5 1.5 0 0 0 4 3.5v8A1.5 1.5 0 0 0 5.5 13h6a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 11.5 2h-6zm0 1h6a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5z",
      "M2.5 4A1.5 1.5 0 0 0 1 5.5v8A1.5 1.5 0 0 0 2.5 15h6a1.5 1.5 0 0 0 1.5-1.5V13H9v.5a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5H3V4h-.5z",
    ]),
    check: svgIcon([
      "M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z",
    ]),
    expand: svgIcon([
      "M1.5 5.5V2.75A1.25 1.25 0 0 1 2.75 1.5H5.5v1H2.75a.25.25 0 0 0-.25.25V5.5h-1zm13 0V2.75a.25.25 0 0 0-.25-.25H10.5v-1h2.75A1.25 1.25 0 0 1 14.5 2.75V5.5h-1zM1.5 10.5h1v2.75c0 .138.112.25.25.25H5.5v1H2.75A1.25 1.25 0 0 1 1.5 13.25V10.5zm13 0h-1v2.75a.25.25 0 0 1-.25.25H10.5v1h2.75a1.25 1.25 0 0 0 1.25-1.25V10.5z",
    ]),
    close: svgIcon([
      "M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z",
    ]),
  };
  return ICONS;
}

function fillButton(button: HTMLElement, icon: Node, label: string): void {
  const text = document.createElement("span");
  text.textContent = label;
  button.replaceChildren(icon.cloneNode(true), text);
}

function hostClassName(node: Element): string {
  return node instanceof HTMLElement ? node.className : "";
}

function nodeText(node: HTMLElement): string {
  return node.textContent;
}

function detectLang(block: Element): string {
  const className = hostClassName(block);
  const match = /(?:^|\s)language-([a-z0-9_+-]+)/iu.exec(className);
  const language = match?.[1]?.toLowerCase() ?? "";
  return PLAIN_LANGUAGES.has(language) ? "" : language;
}

function lineCount(text: string): number {
  if (!text) {
    return 1;
  }
  const normalized = text.replace(/\n$/u, "");
  if (!normalized) {
    return 1;
  }
  return normalized.split("\n").length;
}

function buildGutter(count: number): HTMLDivElement {
  const gutter = document.createElement("div");
  gutter.className = "code-block__gutter";
  gutter.setAttribute("aria-hidden", "true");
  for (let index = 1; index <= count; index += 1) {
    const line = document.createElement("span");
    line.className = "code-block__line-no";
    line.textContent = String(index);
    gutter.append(line);
  }
  return gutter;
}

function maxHeightPx(viewportHeight: () => number): number {
  return (viewportHeight() * MAX_VH) / 100;
}

function showCopiedState(button: HTMLElement, icons: IconSet): void {
  button.classList.add("is-copied");
  button.setAttribute("aria-label", "Copied");
  fillButton(button, icons.check, "Copied");
}

function showCopyState(button: HTMLElement, icons: IconSet): void {
  button.classList.remove("is-copied");
  button.setAttribute("aria-label", "Copy code");
  fillButton(button, icons.copy, "Copy");
}

function scheduleReset(session: CopySession, reset: () => void): void {
  const timer = setTimeout(() => {
    session.timers.delete(timer);
    reset();
  }, COPY_RESET_MS);
  session.timers.add(timer);
}

async function copyAndMark(session: CopySession, button: HTMLElement, text: string): Promise<void> {
  try {
    await session.clipboard.writeText(text);
    showCopiedState(button, session.icons);
    scheduleReset(session, () => {
      showCopyState(button, session.icons);
    });
  } catch {
    // Clipboard may be blocked.
  }
}

function wireCopy(button: HTMLButtonElement, getText: () => string, session: CopySession): void {
  button.addEventListener(
    "click",
    () => {
      void copyAndMark(session, button, getText() || "");
    },
    { signal: session.signal },
  );
}

function copyCodeButton(getText: () => string, session: CopySession): HTMLButtonElement {
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "code-block__btn";
  copyButton.setAttribute("aria-label", "Copy code");
  fillButton(copyButton, session.icons.copy, "Copy");
  wireCopy(copyButton, getText, session);
  return copyButton;
}

function cloneCode(sourceCode: Element, codeClass: string): HTMLElement {
  const code = document.createElement("code");
  code.className = codeClass;
  for (const child of sourceCode.childNodes) {
    code.append(child.cloneNode(true));
  }
  return code;
}

function closeFullscreen(session: EnhanceSession): void {
  const current = session.fullscreen;
  if (!current) {
    return;
  }
  session.fullscreen = undefined;
  session.fullscreenController?.abort();
  session.fullscreenController = undefined;
  document.documentElement.classList.remove("code-fs-open");
  if (current.root.parentNode) {
    current.root.remove();
  }
  current.trigger?.focus();
}

function createFullscreenDialog(): HTMLDivElement {
  const root = document.createElement("div");
  root.className = "code-fs";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Code fullscreen");
  return root;
}

function fullscreenToolbar(request: FullscreenRequest, session: CopySession): FullscreenToolbar {
  const bar = document.createElement("div");
  bar.className = "code-fs__toolbar";
  const label = document.createElement("span");
  label.className = "code-fs__label";
  label.textContent = request.lang || "code";
  const actions = document.createElement("div");
  actions.className = "code-fs__actions";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "code-block__btn";
  closeButton.setAttribute("aria-label", "Close fullscreen");
  fillButton(closeButton, session.icons.close, "Close");
  actions.append(
    copyCodeButton(() => request.text, session),
    closeButton,
  );
  bar.append(label, actions);
  return { bar, closeButton };
}

function fullscreenBody(request: FullscreenRequest): HTMLDivElement {
  const body = document.createElement("div");
  body.className = "code-fs__body";
  const preElement = document.createElement("pre");
  preElement.className = request.preClass || "";
  preElement.append(cloneCode(request.sourceCode, request.codeClass));
  body.append(buildGutter(request.lines), preElement);
  return body;
}

function onFullscreenKey(event: KeyboardEvent, session: EnhanceSession): void {
  if (event.key !== "Escape") {
    return;
  }
  event.preventDefault();
  closeFullscreen(session);
}

function bindFullscreen(chrome: FullscreenChrome, session: EnhanceSession): void {
  const controller = new AbortController();
  const { signal } = controller;
  session.fullscreenController = controller;
  session.fullscreen = { root: chrome.root, trigger: chrome.trigger };
  chrome.backdrop.addEventListener(
    "click",
    () => {
      closeFullscreen(session);
    },
    { signal },
  );
  chrome.closeButton.addEventListener(
    "click",
    () => {
      closeFullscreen(session);
    },
    { signal },
  );
  document.addEventListener(
    "keydown",
    (event: KeyboardEvent) => {
      onFullscreenKey(event, session);
    },
    { signal },
  );
  document.documentElement.classList.add("code-fs-open");
  document.body.append(chrome.root);
  chrome.closeButton.focus();
}

function openFullscreen(request: FullscreenRequest, session: EnhanceSession): void {
  closeFullscreen(session);
  const root = createFullscreenDialog();
  const backdrop = document.createElement("div");
  backdrop.className = "code-fs__backdrop";
  const panel = document.createElement("div");
  panel.className = "code-fs__panel";
  const { bar, closeButton } = fullscreenToolbar(request, session);
  panel.append(bar, fullscreenBody(request));
  root.append(backdrop, panel);
  bindFullscreen({ root, backdrop, closeButton, trigger: request.trigger }, session);
}

function headerHeight(): number {
  const header = document.querySelector(".site-header");
  return header ? header.getBoundingClientRect().height : 0;
}

function snapBelowHeader(wrap: HTMLElement, scroll: (x: number, y: number) => void): void {
  const headerH = headerHeight();
  const wrapTop = wrap.getBoundingClientRect().top;
  if (wrapTop < headerH + HEADER_GAP_PX) {
    scroll(0, wrapTop - headerH - HEADER_GAP_PX);
  }
}

function collapseBlock(
  wrap: HTMLElement,
  expandButton: HTMLElement,
  scroll: (x: number, y: number) => void,
): void {
  const beforeTop = expandButton.getBoundingClientRect().top;
  wrap.classList.remove("is-expanded");
  expandButton.setAttribute("aria-expanded", "false");
  expandButton.textContent = "Show more";
  const delta = expandButton.getBoundingClientRect().top - beforeTop;
  if (delta) {
    scroll(0, delta);
  }
  snapBelowHeader(wrap, scroll);
}

function wireExpand(wrap: HTMLElement, session: EnhanceSession): void {
  const expandButton = document.createElement("button");
  expandButton.type = "button";
  expandButton.className = "code-block__expand";
  expandButton.setAttribute("aria-expanded", "false");
  expandButton.textContent = "Show more";
  wrap.append(expandButton);
  expandButton.addEventListener(
    "click",
    () => {
      if (wrap.classList.contains("is-expanded")) {
        collapseBlock(wrap, expandButton, session.scrollBy);
        return;
      }
      wrap.classList.add("is-expanded");
      expandButton.setAttribute("aria-expanded", "true");
      expandButton.textContent = "Show less";
    },
    { signal: session.signal },
  );
}

function metaLabel(language: string, isTall: boolean, lines: number): string {
  if (language) {
    return language;
  }
  return isTall ? `${String(lines)} lines` : "code";
}

function fullscreenButton(
  details: FullscreenButtonDetails,
  session: EnhanceSession,
): HTMLButtonElement {
  const fsButton = document.createElement("button");
  fsButton.type = "button";
  fsButton.className = "code-block__btn";
  fsButton.setAttribute("aria-label", "Open code fullscreen");
  fillButton(fsButton, session.icons.expand, "Full screen");
  fsButton.addEventListener(
    "click",
    () => {
      openFullscreen(
        {
          lang: details.language,
          text: nodeText(details.block),
          sourceCode: details.sourceCode,
          preClass: hostClassName(details.block),
          codeClass: hostClassName(details.sourceCode),
          lines: details.lines,
          trigger: fsButton,
        },
        session,
      );
    },
    { signal: session.signal },
  );
  return fsButton;
}

function enhanceBlock(block: HTMLElement, session: EnhanceSession): void {
  if (block.closest(".code-block")) {
    return;
  }
  const sourceCode = block.querySelector("code") ?? block;
  const lines = lineCount(nodeText(block));
  const language = detectLang(block);
  const isTall = block.scrollHeight > maxHeightPx(session.viewportHeight) + TALL_SLOP_PX;
  const wrap = document.createElement("div");
  wrap.className = "code-block";
  if (isTall) {
    wrap.classList.add("is-collapsible");
  }
  block.parentNode?.insertBefore(wrap, block);

  const toolbar = document.createElement("div");
  toolbar.className = "code-block__toolbar";
  const meta = document.createElement("span");
  meta.className = "code-block__meta";
  meta.textContent = metaLabel(language, isTall, lines);
  const actions = document.createElement("div");
  actions.className = "code-block__actions";
  actions.append(
    copyCodeButton(() => nodeText(block), session),
    fullscreenButton({ block, sourceCode, language, lines }, session),
  );
  toolbar.append(meta, actions);

  const body = document.createElement("div");
  body.className = "code-block__body";
  body.append(buildGutter(lines), block);
  wrap.append(toolbar, body);
  session.wrappers.push(wrap);
  if (isTall) {
    wireExpand(wrap, session);
  }
}

function canMarkInline(code: HTMLElement): boolean {
  if (code.dataset["copyReady"] === "1") {
    return false;
  }
  if (code.closest("a, button, .code-block")) {
    return false;
  }
  return Boolean(nodeText(code).trim());
}

async function copyInline(code: HTMLElement, text: string, session: CopySession): Promise<void> {
  try {
    await session.clipboard.writeText(text);
    code.classList.add("is-copied");
    code.setAttribute("aria-label", "Copied");
    scheduleReset(session, () => {
      code.classList.remove("is-copied");
      code.setAttribute("aria-label", `Copy ${text}`);
    });
  } catch {
    // Clipboard may be blocked.
  }
}

function onInlineKey(event: KeyboardEvent, copy: InlineCopy): void {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  void copyInline(copy.code, copy.text, copy.session);
}

function markInlineCopyable(code: HTMLElement, session: EnhanceSession): void {
  if (!canMarkInline(code)) {
    return;
  }
  const text = nodeText(code).trim();
  code.dataset["copyReady"] = "1";
  code.setAttribute("tabindex", "0");
  code.setAttribute("role", "button");
  code.setAttribute("aria-label", `Copy ${text}`);
  session.inlineCodes.push(code);
  code.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      void copyInline(code, text, session);
    },
    { signal: session.signal },
  );
  code.addEventListener(
    "keydown",
    (event: KeyboardEvent) => {
      onInlineKey(event, { code, text, session });
    },
    { signal: session.signal },
  );
}

function matchingElements(root: ParentNode, hook: string): HTMLElement[] {
  const matches: HTMLElement[] = [];
  if (root instanceof HTMLElement && root.matches(hook)) {
    matches.push(root);
  }
  for (const node of root.querySelectorAll(hook)) {
    if (node instanceof HTMLElement) {
      matches.push(node);
    }
  }
  return matches;
}

function unwrapBlock(wrap: HTMLElement): void {
  const block = wrap.querySelector(CODE_BLOCK_HOOK);
  if (block) {
    wrap.replaceWith(block);
    return;
  }
  wrap.remove();
}

function revertInline(code: HTMLElement): void {
  delete code.dataset["copyReady"];
  code.removeAttribute("tabindex");
  code.removeAttribute("role");
  code.removeAttribute("aria-label");
  code.classList.remove("is-copied");
}

function clearTimers(session: CopySession): void {
  for (const timer of session.timers) {
    clearTimeout(timer);
  }
  session.timers.clear();
}

function teardownSession(
  root: ParentNode,
  controller: AbortController,
  session: EnhanceSession,
): void {
  controller.abort();
  clearTimers(session);
  closeFullscreen(session);
  for (const wrap of session.wrappers) {
    unwrapBlock(wrap);
  }
  for (const code of session.inlineCodes) {
    revertInline(code);
  }
  enhancedRoots.delete(root);
}

function createSession(dependencies: CodeBlockDependencies, signal: AbortSignal): EnhanceSession {
  return {
    clipboard: dependencies.clipboard ?? clipboardWrite(),
    viewportHeight: dependencies.viewportHeight ?? defaultViewportHeight,
    scrollBy: dependencies.scrollBy ?? defaultScrollBy,
    icons: createIcons(),
    signal,
    timers: new Set(),
    wrappers: [],
    inlineCodes: [],
    fullscreen: undefined,
    fullscreenController: undefined,
  };
}

function enhanceRoot(root: Document | Element, dependencies: CodeBlockDependencies): () => void {
  const controller = new AbortController();
  const session = createSession(dependencies, controller.signal);
  enhancedRoots.add(root);
  for (const block of matchingElements(root, CODE_BLOCK_HOOK)) {
    enhanceBlock(block, session);
  }
  for (const code of matchingElements(root, INLINE_CODE_HOOK)) {
    markInlineCopyable(code, session);
  }
  return () => {
    teardownSession(root, controller, session);
  };
}

export function init(
  root: ParentNode = document,
  dependencies: CodeBlockDependencies = {},
): () => void {
  if (!(root instanceof Document || root instanceof Element)) {
    return noop;
  }
  if (enhancedRoots.has(root)) {
    return noop;
  }
  return enhanceRoot(root, dependencies);
}

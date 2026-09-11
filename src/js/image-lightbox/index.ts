/* Progressive enhancement: fullscreen image lightbox with zoom + pan.
   Hydrated for [data-lightbox] images. Safe without this file. */

import type { ActiveLightbox, EnhancedImage, LightboxState, Point } from "./types";

export const LIGHTBOX_HOOK = "[data-lightbox]";

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const ZOOM_STEP = 1.18;
const DOUBLE_ZOOM = 2.5;
const DRAG_THRESHOLD = 4;
const CLOSE_PATH =
  "M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1 1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1 1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z";

const enhancedRoots = new WeakSet<ParentNode>();
const sessionState: { active: ActiveLightbox | undefined } = { active: undefined };

function noop(): void {
  /*
   * Teardown is a no-op when this root was not enhanced.
   */
}

function eventElement(event: Event): Element | undefined {
  const { target } = event;
  return target instanceof Element ? target : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

function closeLightbox(): void {
  const session = sessionState.active;
  if (!session) {
    return;
  }
  sessionState.active = undefined;
  session.session.abort();
  document.documentElement.classList.remove("img-lightbox-open");
  session.root.remove();
  if (typeof session.trigger.focus === "function") {
    session.trigger.focus();
  }
}

function isOutsideImage(event: PointerEvent, image: HTMLImageElement): boolean {
  const rect = image.getBoundingClientRect();
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
}

function applyTransform(state: LightboxState): void {
  const { translateX, translateY, scale } = state;
  state.image.style.transform =
    "translate(" +
    String(translateX) +
    "px, " +
    String(translateY) +
    "px) scale(" +
    String(scale) +
    ")";
  state.zoomLabel.textContent = String(Math.round(scale * 100)) + "%";
  state.root.classList.toggle("is-zoomed", scale > 1.01);
  if (scale > 1.01) {
    state.stage.style.cursor = state.isDragging ? "grabbing" : "grab";
    return;
  }
  state.stage.style.cursor = "zoom-in";
}

function stagePoint(stage: HTMLElement, clientX: number, clientY: number): Point {
  const rect = stage.getBoundingClientRect();
  return {
    x: clientX - rect.left - rect.width / 2,
    y: clientY - rect.top - rect.height / 2,
  };
}

function stageCenter(stage: HTMLElement): Point {
  const rect = stage.getBoundingClientRect();
  return {
    x: rect.left + stage.clientWidth / 2,
    y: rect.top + stage.clientHeight / 2,
  };
}

function resetZoom(state: LightboxState): void {
  state.scale = 1;
  state.translateX = 0;
  state.translateY = 0;
  applyTransform(state);
}

function zoomAt(state: LightboxState, client: Point, requestedScale: number): void {
  const nextScale = clamp(requestedScale, MIN_SCALE, MAX_SCALE);
  if (nextScale === state.scale) {
    return;
  }
  const point = stagePoint(state.stage, client.x, client.y);
  const originX = (point.x - state.translateX) / state.scale;
  const originY = (point.y - state.translateY) / state.scale;
  state.scale = nextScale;
  if (state.scale <= 1.001) {
    resetZoom(state);
    return;
  }
  state.translateX = point.x - originX * state.scale;
  state.translateY = point.y - originY * state.scale;
  applyTransform(state);
}

function zoomFromCenter(state: LightboxState, requestedScale: number): void {
  zoomAt(state, stageCenter(state.stage), requestedScale);
}

function onWheel(state: LightboxState, event: WheelEvent): void {
  event.preventDefault();
  const direction = event.deltaY < 0 ? 1 : -1;
  let factor = Math.exp(-event.deltaY * 0.0025);
  if (factor === 0 || !Number.isFinite(factor)) {
    factor = direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
  }
  zoomAt(state, event, state.scale * factor);
}

function pointerPair(pointers: Map<number, Point>): [Point, Point] | undefined {
  const iterator = pointers.values();
  const first = iterator.next();
  const second = iterator.next();
  if (first.done || second.done) {
    return undefined;
  }
  return [first.value, second.value];
}

function pointerDistance(pointers: Map<number, Point>): number {
  const pair = pointerPair(pointers);
  if (!pair) {
    return 0;
  }
  const [first, second] = pair;
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function pointerCenter(pointers: Map<number, Point>): Point {
  const pair = pointerPair(pointers);
  if (!pair) {
    return { x: 0, y: 0 };
  }
  const [first, second] = pair;
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function beginDrag(state: LightboxState, event: PointerEvent): void {
  const now = Date.now();
  if (now - state.lastTap < 280) {
    state.lastTap = 0;
    if (state.scale > 1.01) {
      resetZoom(state);
    } else {
      zoomAt(state, event, DOUBLE_ZOOM);
    }
    state.pointers.delete(event.pointerId);
    return;
  }
  state.lastTap = now;
  state.isDragging = true;
  state.isMoved = false;
  state.dragOrigin = {
    x: event.clientX,
    y: event.clientY,
    translateX: state.translateX,
    translateY: state.translateY,
  };
  applyTransform(state);
}

function startPinch(state: LightboxState): void {
  state.isDragging = false;
  state.isMoved = true;
  state.pinchStartDistribution = pointerDistance(state.pointers);
  state.pinchStartScale = state.scale;
  state.dragOrigin = undefined;
}

function onPointerDown(state: LightboxState, event: PointerEvent): void {
  const target = eventElement(event);
  if (target && (target === state.closeButton || state.closeButton.contains(target))) {
    return;
  }
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }
  state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  state.stage.setPointerCapture(event.pointerId);
  if (state.pointers.size === 2) {
    startPinch(state);
    return;
  }
  beginDrag(state, event);
}

function didPinch(state: LightboxState): boolean {
  if (state.pointers.size < 2 || state.pinchStartDistribution <= 0) {
    return false;
  }
  const distribution = pointerDistance(state.pointers);
  const center = pointerCenter(state.pointers);
  zoomAt(state, center, state.pinchStartScale * (distribution / state.pinchStartDistribution));
  state.isMoved = true;
  return true;
}

function moveDrag(state: LightboxState, event: PointerEvent): void {
  const origin = state.dragOrigin;
  if (!origin || !state.isDragging) {
    return;
  }
  const deltaX = event.clientX - origin.x;
  const deltaY = event.clientY - origin.y;
  if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
    state.isMoved = true;
  }
  if (state.scale <= 1.01) {
    return;
  }
  state.translateX = origin.translateX + deltaX;
  state.translateY = origin.translateY + deltaY;
  applyTransform(state);
}

function onPointerMove(state: LightboxState, event: PointerEvent): void {
  if (!state.pointers.has(event.pointerId)) {
    return;
  }
  state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (!didPinch(state)) {
    moveDrag(state, event);
  }
}

function finishPointers(state: LightboxState, event: PointerEvent): void {
  const wasDragging = state.isDragging;
  const didMove = state.isMoved;
  state.isDragging = false;
  state.dragOrigin = undefined;
  applyTransform(state);
  if (wasDragging && !didMove && state.scale <= 1.01 && isOutsideImage(event, state.image)) {
    closeLightbox();
  }
}

function onPointerUp(state: LightboxState, event: PointerEvent): void {
  if (!state.pointers.has(event.pointerId)) {
    return;
  }
  state.pointers.delete(event.pointerId);
  if (state.pointers.size < 2) {
    state.pinchStartDistribution = 0;
  }
  if (state.pointers.size === 0) {
    finishPointers(state, event);
  }
}

function onLightboxKey(state: LightboxState, event: KeyboardEvent): void {
  switch (event.key) {
    case "Escape": {
      event.preventDefault();
      if (state.scale > 1.01) {
        resetZoom(state);
        return;
      }
      closeLightbox();
      return;
    }
    case "+":
    case "=": {
      event.preventDefault();
      zoomFromCenter(state, state.scale * ZOOM_STEP);
      return;
    }
    case "-":
    case "_": {
      event.preventDefault();
      zoomFromCenter(state, state.scale / ZOOM_STEP);
      return;
    }
    case "0": {
      event.preventDefault();
      resetZoom(state);
      return;
    }
    default:
  }
}

function createLightboxState(trigger: HTMLImageElement, source: string): LightboxState {
  const root = document.createElement("div");
  root.className = "img-lightbox";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", trigger.alt || "Image fullscreen");

  const stage = document.createElement("div");
  stage.className = "img-lightbox__stage";

  const image = document.createElement("img");
  image.className = "img-lightbox__img";
  image.src = source;
  image.alt = trigger.alt || "";
  image.draggable = false;

  const controls = document.createElement("div");
  controls.className = "img-lightbox__ui";

  const hint = document.createElement("p");
  hint.className = "img-lightbox__hint";
  hint.textContent = "Scroll to zoom · Drag to pan · Double-click to toggle";

  const zoomLabel = document.createElement("span");
  zoomLabel.className = "img-lightbox__zoom";
  zoomLabel.textContent = "100%";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "img-lightbox__close";
  closeButton.setAttribute("aria-label", "Close image");
  const hidden = document.createElement("span");
  hidden.className = "visually-hidden";
  hidden.textContent = "Close";
  closeButton.append(closeIcon(), hidden);

  controls.append(hint, zoomLabel, closeButton);
  stage.append(image);
  root.append(stage, controls);

  return {
    scale: 1,
    translateX: 0,
    translateY: 0,
    pointers: new Map(),
    pinchStartDistribution: 0,
    pinchStartScale: 1,
    isDragging: false,
    isMoved: false,
    dragOrigin: undefined,
    lastTap: 0,
    root,
    stage,
    image,
    zoomLabel,
    closeButton,
  };
}

function bindLightboxEvents(state: LightboxState, signal: AbortSignal): void {
  state.stage.addEventListener(
    "wheel",
    (event) => {
      onWheel(state, event);
    },
    { passive: false, signal },
  );
  state.stage.addEventListener(
    "pointerdown",
    (event) => {
      onPointerDown(state, event);
    },
    { signal },
  );
  document.addEventListener(
    "pointermove",
    (event) => {
      onPointerMove(state, event);
    },
    { signal },
  );
  document.addEventListener(
    "pointerup",
    (event) => {
      onPointerUp(state, event);
    },
    { signal },
  );
  document.addEventListener(
    "pointercancel",
    (event) => {
      onPointerUp(state, event);
    },
    { signal },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      onLightboxKey(state, event);
    },
    { signal },
  );
  state.closeButton.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      closeLightbox();
    },
    { signal },
  );
}

function openLightbox(image: HTMLImageElement): void {
  closeLightbox();
  const source = image.currentSrc || image.src;
  if (!source) {
    return;
  }
  const session = new AbortController();
  const state = createLightboxState(image, source);
  bindLightboxEvents(state, session.signal);
  document.documentElement.classList.add("img-lightbox-open");
  document.body.append(state.root);
  applyTransform(state);
  state.closeButton.focus();
  sessionState.active = { root: state.root, trigger: image, session };
}

function isZoomable(image: HTMLImageElement): boolean {
  if (!image.matches(LIGHTBOX_HOOK) || image.closest("a[href]")) {
    return false;
  }
  return Boolean(image.currentSrc || image.src);
}

function snapshotImage(image: HTMLImageElement): EnhancedImage {
  return {
    image,
    role: image.getAttribute("role") ?? undefined,
    tabIndex: image.getAttribute("tabindex") ?? undefined,
    zoomable: image.dataset["zoomable"],
    ariaLabel: image.getAttribute("aria-label") ?? undefined,
    alt: image.alt,
  };
}

function restoreAttribute(element: Element, name: string, value: string | undefined): void {
  if (value === undefined) {
    element.removeAttribute(name);
    return;
  }
  element.setAttribute(name, value);
}

function restoreImage(snapshot: EnhancedImage): void {
  const { image } = snapshot;
  restoreAttribute(image, "role", snapshot.role);
  restoreAttribute(image, "tabindex", snapshot.tabIndex);
  restoreAttribute(image, "aria-label", snapshot.ariaLabel);
  image.alt = snapshot.alt;
  if (snapshot.zoomable === undefined) {
    delete image.dataset["zoomable"];
    return;
  }
  image.dataset["zoomable"] = snapshot.zoomable;
}

function fullscreenLabel(image: HTMLImageElement): string {
  return image.alt ? "View image fullscreen: " + image.alt : "View image fullscreen";
}

function enhance(image: HTMLImageElement, enhanced: EnhancedImage[]): void {
  if (!isZoomable(image) || image.dataset["zoomable"] === "1") {
    return;
  }
  enhanced.push(snapshotImage(image));
  image.dataset["zoomable"] = "1";
  image.setAttribute("tabindex", "0");
  image.setAttribute("role", "button");
  let label = image.getAttribute("aria-label");
  if (!label) {
    label = fullscreenLabel(image);
    image.setAttribute("aria-label", label);
  }
  if (!image.alt) {
    image.alt = label;
  }
}

function zoomableImageFrom(event: Event): HTMLImageElement | undefined {
  const target = eventElement(event);
  if (!target) {
    return undefined;
  }
  const hook = target.closest(LIGHTBOX_HOOK);
  if (!(hook instanceof HTMLImageElement) || !isZoomable(hook)) {
    return undefined;
  }
  return hook;
}

function onTriggerClick(event: Event): void {
  const image = zoomableImageFrom(event);
  if (!image) {
    return;
  }
  event.preventDefault();
  openLightbox(image);
}

function isOpenKey(event: Event): event is KeyboardEvent {
  return event instanceof KeyboardEvent && (event.key === "Enter" || event.key === " ");
}

function onTriggerKey(event: Event): void {
  if (!isOpenKey(event)) {
    return;
  }
  const image = zoomableImageFrom(event);
  if (!image || event.target !== image) {
    return;
  }
  event.preventDefault();
  openLightbox(image);
}

export function init(root: ParentNode = document): () => void {
  if (!(root instanceof Document || root instanceof Element)) {
    return noop;
  }
  if (enhancedRoots.has(root)) {
    return noop;
  }

  const controller = new AbortController();
  const { signal } = controller;
  const enhanced: EnhancedImage[] = [];

  enhancedRoots.add(root);
  for (const node of root.querySelectorAll(LIGHTBOX_HOOK)) {
    if (node instanceof HTMLImageElement) {
      enhance(node, enhanced);
    }
  }
  root.addEventListener("click", onTriggerClick, { signal });
  root.addEventListener("keydown", onTriggerKey, { signal });

  return () => {
    controller.abort();
    enhancedRoots.delete(root);
    closeLightbox();
    for (const item of enhanced) {
      restoreImage(item);
    }
  };
}

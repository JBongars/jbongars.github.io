/* Progressive enhancement: fullscreen image lightbox with zoom + pan.
   Hydrated for .prose img and .post-banner__img. Safe without this file. */
(function enhanceImageLightbox() {
  "use strict";

  const SELECTOR = ".prose img, .post-banner__img";
  const MIN_SCALE = 1;
  const MAX_SCALE = 8;
  const ZOOM_STEP = 1.18;
  const DOUBLE_ZOOM = 2.5;
  const DRAG_THRESHOLD = 4;
  let active;

  function closeIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute(
      "d",
      "M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z",
    );
    svg.append(path);
    return svg;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function closeLightbox() {
    if (!active) {
      return;
    }
    const state = active;
    active = undefined;
    document.removeEventListener("keydown", state.onKey);
    document.removeEventListener("pointermove", state.onPointerMove);
    document.removeEventListener("pointerup", state.onPointerUp);
    document.removeEventListener("pointercancel", state.onPointerUp);
    document.documentElement.classList.remove("img-lightbox-open");
    if (state.root.parentNode) {
      state.root.remove();
    }
    if (state.trigger && typeof state.trigger.focus === "function") {
      state.trigger.focus();
    }
  }

  function pointerList(pointers) {
    return pointers.values().toArray();
  }

  function isOutsideImage(event, image) {
    const rect = image.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  }

  function openLightbox(img) {
    closeLightbox();

    const source = img.currentSrc || img.src;
    if (!source) {
      return;
    }

    let scale = 1;
    let tx = 0;
    let ty = 0;
    const pointers = new Map();
    let pinchStartDistribution = 0;
    let pinchStartScale = 1;
    let isDragging = false;
    let isMoved = false;
    let dragOrigin;
    let lastTap = 0;

    const root = document.createElement("div");
    root.className = "img-lightbox";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", img.alt || "Image fullscreen");

    const stage = document.createElement("div");
    stage.className = "img-lightbox__stage";

    const full = document.createElement("img");
    full.className = "img-lightbox__img";
    full.src = source;
    full.alt = img.alt || "";
    full.draggable = false;

    const ui = document.createElement("div");
    ui.className = "img-lightbox__ui";

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

    ui.append(hint, zoomLabel, closeButton);
    stage.append(full);
    root.append(stage, ui);

    function applyTransform() {
      full.style.transform = "translate(" + tx + "px, " + ty + "px) scale(" + scale + ")";
      zoomLabel.textContent = Math.round(scale * 100) + "%";
      root.classList.toggle("is-zoomed", scale > 1.01);
      stage.style.cursor = scale > 1.01 ? (isDragging ? "grabbing" : "grab") : "zoom-in";
    }

    function stagePoint(clientX, clientY) {
      const rect = stage.getBoundingClientRect();
      return {
        x: clientX - rect.left - rect.width / 2,
        y: clientY - rect.top - rect.height / 2,
      };
    }

    function zoomAt(clientX, clientY, requestedScale) {
      const nextScale = clamp(requestedScale, MIN_SCALE, MAX_SCALE);
      if (nextScale === scale) {
        return;
      }
      const p = stagePoint(clientX, clientY);
      const ix = (p.x - tx) / scale;
      const iy = (p.y - ty) / scale;
      scale = nextScale;
      if (scale <= 1.001) {
        scale = 1;
        tx = 0;
        ty = 0;
      } else {
        tx = p.x - ix * scale;
        ty = p.y - iy * scale;
      }
      applyTransform();
    }

    function resetZoom() {
      scale = 1;
      tx = 0;
      ty = 0;
      applyTransform();
    }

    function onWheel(event) {
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      // Normalize trackpad vs mouse wheel a bit.
      let factor = Math.exp(-event.deltaY * 0.0025);
      if (factor === 0 || !Number.isFinite(factor)) {
        factor = direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      }
      zoomAt(event.clientX, event.clientY, scale * factor);
    }

    function pointerDistance() {
      if (pointers.size < 2) {
        return 0;
      }
      const pts = pointerList(pointers);
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      return Math.hypot(dx, dy);
    }

    function pointerCenter() {
      const pts = pointerList(pointers);
      if (pts.length === 1) {
        return pts[0];
      }
      return {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
    }

    function beginDrag(event) {
      const now = Date.now();
      if (now - lastTap < 280) {
        lastTap = 0;
        if (scale > 1.01) {
          resetZoom();
        } else {
          zoomAt(event.clientX, event.clientY, DOUBLE_ZOOM);
        }
        pointers.delete(event.pointerId);
        return;
      }
      lastTap = now;
      isDragging = true;
      isMoved = false;
      dragOrigin = {
        x: event.clientX,
        y: event.clientY,
        tx,
        ty,
      };
      applyTransform();
    }

    function onPointerDown(event) {
      if (event.target === closeButton || closeButton.contains(event.target)) {
        return;
      }
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      stage.setPointerCapture(event.pointerId);

      if (pointers.size === 2) {
        isDragging = false;
        isMoved = true;
        pinchStartDistribution = pointerDistance();
        pinchStartScale = scale;
        dragOrigin = undefined;
        return;
      }

      beginDrag(event);
    }

    function onPointerMove(event) {
      if (!pointers.has(event.pointerId)) {
        return;
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.size >= 2 && pinchStartDistribution > 0) {
        const distribution = pointerDistance();
        const center = pointerCenter();
        zoomAt(center.x, center.y, pinchStartScale * (distribution / pinchStartDistribution));
        isMoved = true;
        return;
      }

      if (!isDragging || !dragOrigin) {
        return;
      }
      const dx = event.clientX - dragOrigin.x;
      const dy = event.clientY - dragOrigin.y;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        isMoved = true;
      }
      if (scale > 1.01) {
        tx = dragOrigin.tx + dx;
        ty = dragOrigin.ty + dy;
        applyTransform();
      }
    }

    function finishPointers(event, wasDragging, didMove) {
      isDragging = false;
      dragOrigin = undefined;
      applyTransform();

      // Tap outside the image (while unzoomed) closes.
      if (wasDragging && !didMove && scale <= 1.01 && isOutsideImage(event, full)) {
        closeLightbox();
      }
    }

    function onPointerUp(event) {
      if (!pointers.has(event.pointerId)) {
        return;
      }
      pointers.delete(event.pointerId);

      if (pointers.size < 2) {
        pinchStartDistribution = 0;
      }

      if (pointers.size === 0) {
        finishPointers(event, isDragging, isMoved);
      }
    }

    function stageCenter() {
      const rect = stage.getBoundingClientRect();
      return {
        x: rect.left + stage.clientWidth / 2,
        y: rect.top + stage.clientHeight / 2,
      };
    }

    function onKey(event) {
      switch (event.key) {
        case "Escape": {
          event.preventDefault();
          if (scale > 1.01) {
            resetZoom();
          } else {
            closeLightbox();
          }
          break;
        }
        case "+":
        case "=": {
          event.preventDefault();
          const center = stageCenter();
          zoomAt(center.x, center.y, scale * ZOOM_STEP);
          break;
        }
        case "-":
        case "_": {
          event.preventDefault();
          const center = stageCenter();
          zoomAt(center.x, center.y, scale / ZOOM_STEP);
          break;
        }
        case "0": {
          event.preventDefault();
          resetZoom();
          break;
        }
        default:
      }
    }

    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
    document.addEventListener("keydown", onKey);
    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      closeLightbox();
    });

    document.documentElement.classList.add("img-lightbox-open");
    document.body.append(root);
    applyTransform();
    closeButton.focus();

    active = {
      root,
      onKey,
      onPointerMove,
      onPointerUp,
      trigger: img,
    };
  }

  function isZoomable(img) {
    if (!img || img.tagName !== "IMG") {
      return false;
    }
    if (!img.matches(SELECTOR)) {
      return false;
    }
    if (img.closest("a[href]")) {
      return false;
    }
    return Boolean(img.currentSrc || img.src);
  }

  function enhance(img) {
    if (!isZoomable(img) || img.dataset.zoomable === "1") {
      return;
    }
    img.dataset.zoomable = "1";
    img.setAttribute("tabindex", "0");
    img.setAttribute("role", "button");
    let label = img.getAttribute("aria-label");
    if (!label) {
      label = img.alt ? "View image fullscreen: " + img.alt : "View image fullscreen";
      img.setAttribute("aria-label", label);
    }
    // alt="" marks the image presentational; that conflicts with role=button
    // (Lighthouse "Agent Accessibility" / well-formed a11y tree).
    if (!img.alt) {
      img.alt = label;
    }
  }

  function hydrateImageLightbox() {
    closeLightbox();
    for (const img of document.querySelectorAll(SELECTOR)) {
      enhance(img);
    }
  }

  document.addEventListener("click", (event) => {
    const img = event.target.closest?.(SELECTOR);
    if (!img || !isZoomable(img)) {
      return;
    }
    event.preventDefault();
    openLightbox(img);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    const img = event.target.closest?.(SELECTOR);
    if (!img || !isZoomable(img) || event.target !== img) {
      return;
    }
    event.preventDefault();
    openLightbox(img);
  });

  globalThis.hydrateImageLightbox = hydrateImageLightbox;
  hydrateImageLightbox();
})();

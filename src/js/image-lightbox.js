/* Progressive enhancement: fullscreen image lightbox with zoom + pan.
   Hydrated for .prose img and .post-banner__img. Safe without this file. */
(function () {
  "use strict";

  var SELECTOR = ".prose img, .post-banner__img";
  var MIN_SCALE = 1;
  var MAX_SCALE = 8;
  var ZOOM_STEP = 1.18;
  var DOUBLE_ZOOM = 2.5;
  var DRAG_THRESHOLD = 4;
  var active = null;

  function closeSvg() {
    return (
      '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/>' +
      "</svg>"
    );
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function closeLightbox() {
    if (!active) return;
    var state = active;
    active = null;
    document.removeEventListener("keydown", state.onKey);
    document.removeEventListener("pointermove", state.onPointerMove);
    document.removeEventListener("pointerup", state.onPointerUp);
    document.removeEventListener("pointercancel", state.onPointerUp);
    document.documentElement.classList.remove("img-lightbox-open");
    if (state.root.parentNode) state.root.parentNode.removeChild(state.root);
    if (state.trigger && typeof state.trigger.focus === "function") {
      state.trigger.focus();
    }
  }

  function openLightbox(img) {
    closeLightbox();

    var src = img.currentSrc || img.src;
    if (!src) return;

    var scale = 1;
    var tx = 0;
    var ty = 0;
    var pointers = new Map();
    var pinchStartDist = 0;
    var pinchStartScale = 1;
    var dragging = false;
    var moved = false;
    var dragOrigin = null;
    var lastTap = 0;

    var root = document.createElement("div");
    root.className = "img-lightbox";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", img.alt ? img.alt : "Image fullscreen");

    var stage = document.createElement("div");
    stage.className = "img-lightbox__stage";
    root.appendChild(stage);

    var full = document.createElement("img");
    full.className = "img-lightbox__img";
    full.src = src;
    full.alt = img.alt || "";
    full.draggable = false;
    stage.appendChild(full);

    var ui = document.createElement("div");
    ui.className = "img-lightbox__ui";

    var hint = document.createElement("p");
    hint.className = "img-lightbox__hint";
    hint.textContent = "Scroll to zoom · Drag to pan · Double-click to toggle";
    ui.appendChild(hint);

    var zoomLabel = document.createElement("span");
    zoomLabel.className = "img-lightbox__zoom";
    zoomLabel.textContent = "100%";
    ui.appendChild(zoomLabel);

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "img-lightbox__close";
    closeBtn.setAttribute("aria-label", "Close image");
    closeBtn.innerHTML = closeSvg() + '<span class="visually-hidden">Close</span>';
    ui.appendChild(closeBtn);

    root.appendChild(ui);

    function applyTransform() {
      full.style.transform =
        "translate(" + tx + "px, " + ty + "px) scale(" + scale + ")";
      zoomLabel.textContent = Math.round(scale * 100) + "%";
      root.classList.toggle("is-zoomed", scale > 1.01);
      stage.style.cursor = scale > 1.01 ? (dragging ? "grabbing" : "grab") : "zoom-in";
    }

    function stagePoint(clientX, clientY) {
      var rect = stage.getBoundingClientRect();
      return {
        x: clientX - rect.left - rect.width / 2,
        y: clientY - rect.top - rect.height / 2,
      };
    }

    function zoomAt(clientX, clientY, nextScale) {
      nextScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      if (nextScale === scale) return;
      var p = stagePoint(clientX, clientY);
      var ix = (p.x - tx) / scale;
      var iy = (p.y - ty) / scale;
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

    function onWheel(e) {
      e.preventDefault();
      var direction = e.deltaY < 0 ? 1 : -1;
      // Normalize trackpad vs mouse wheel a bit.
      var factor = Math.exp(-e.deltaY * 0.0025);
      if (!isFinite(factor) || factor === 0) {
        factor = direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      }
      zoomAt(e.clientX, e.clientY, scale * factor);
    }

    function pointerDistance() {
      if (pointers.size < 2) return 0;
      var pts = Array.from(pointers.values());
      var dx = pts[0].x - pts[1].x;
      var dy = pts[0].y - pts[1].y;
      return Math.hypot(dx, dy);
    }

    function pointerCenter() {
      var pts = Array.from(pointers.values());
      if (pts.length === 1) return pts[0];
      return {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
    }

    function onPointerDown(e) {
      if (e.target === closeBtn || closeBtn.contains(e.target)) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      stage.setPointerCapture(e.pointerId);

      if (pointers.size === 2) {
        dragging = false;
        moved = true;
        pinchStartDist = pointerDistance();
        pinchStartScale = scale;
        dragOrigin = null;
        return;
      }

      var now = Date.now();
      if (now - lastTap < 280) {
        lastTap = 0;
        if (scale > 1.01) resetZoom();
        else zoomAt(e.clientX, e.clientY, DOUBLE_ZOOM);
        pointers.delete(e.pointerId);
        return;
      }
      lastTap = now;

      dragging = true;
      moved = false;
      dragOrigin = {
        x: e.clientX,
        y: e.clientY,
        tx: tx,
        ty: ty,
      };
      applyTransform();
    }

    function onPointerMove(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size >= 2 && pinchStartDist > 0) {
        var dist = pointerDistance();
        var center = pointerCenter();
        zoomAt(center.x, center.y, pinchStartScale * (dist / pinchStartDist));
        moved = true;
        return;
      }

      if (!dragging || !dragOrigin) return;
      var dx = e.clientX - dragOrigin.x;
      var dy = e.clientY - dragOrigin.y;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        moved = true;
      }
      if (scale > 1.01) {
        tx = dragOrigin.tx + dx;
        ty = dragOrigin.ty + dy;
        applyTransform();
      }
    }

    function onPointerUp(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);

      if (pointers.size < 2) {
        pinchStartDist = 0;
      }

      if (pointers.size === 0) {
        var wasDragging = dragging;
        var didMove = moved;
        dragging = false;
        dragOrigin = null;
        applyTransform();

        // Tap outside the image (while unzoomed) closes.
        if (wasDragging && !didMove && scale <= 1.01) {
          var rect = full.getBoundingClientRect();
          if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          ) {
            closeLightbox();
          }
        }
      }
    }

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (scale > 1.01) resetZoom();
        else closeLightbox();
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomAt(
          stage.getBoundingClientRect().left + stage.clientWidth / 2,
          stage.getBoundingClientRect().top + stage.clientHeight / 2,
          scale * ZOOM_STEP
        );
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomAt(
          stage.getBoundingClientRect().left + stage.clientWidth / 2,
          stage.getBoundingClientRect().top + stage.clientHeight / 2,
          scale / ZOOM_STEP
        );
      }
      if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      }
    }

    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
    document.addEventListener("keydown", onKey);
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      closeLightbox();
    });

    document.documentElement.classList.add("img-lightbox-open");
    document.body.appendChild(root);
    applyTransform();
    closeBtn.focus();

    active = {
      root: root,
      onKey: onKey,
      onPointerMove: onPointerMove,
      onPointerUp: onPointerUp,
      trigger: img,
    };
  }

  function isZoomable(img) {
    if (!img || img.tagName !== "IMG") return false;
    if (!img.matches(SELECTOR)) return false;
    if (img.closest("a[href]")) return false;
    return Boolean(img.currentSrc || img.src);
  }

  function enhance(img) {
    if (!isZoomable(img) || img.getAttribute("data-zoomable") === "1") return;
    img.setAttribute("data-zoomable", "1");
    img.setAttribute("tabindex", "0");
    img.setAttribute("role", "button");
    if (!img.getAttribute("aria-label") && !img.alt) {
      img.setAttribute("aria-label", "View image fullscreen");
    } else if (img.alt && !img.getAttribute("aria-label")) {
      img.setAttribute("aria-label", "View image fullscreen: " + img.alt);
    }
  }

  function hydrateImageLightbox() {
    closeLightbox();
    document.querySelectorAll(SELECTOR).forEach(enhance);
  }

  document.addEventListener("click", function (e) {
    var img = e.target.closest && e.target.closest(SELECTOR);
    if (!img || !isZoomable(img)) return;
    e.preventDefault();
    openLightbox(img);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var img = e.target.closest && e.target.closest(SELECTOR);
    if (!img || !isZoomable(img) || e.target !== img) return;
    e.preventDefault();
    openLightbox(img);
  });

  window.hydrateImageLightbox = hydrateImageLightbox;
  hydrateImageLightbox();
})();

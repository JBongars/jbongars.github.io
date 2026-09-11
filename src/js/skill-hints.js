/* Progressive enhancement: mobile skill-tag hints as a lower third.
   Desktop keeps the CSS hover bubble. Without this file, no-hover
   devices show no hint (bubble is hidden in CSS). */
(function enhanceSkillHints() {
  const HOVER_MQ = "(hover: none)";
  const TAG = "a.tag--link[data-hint]";
  let panel;
  let titleLink;
  let bodyElement;
  let currentTag;

  function isTouchHint() {
    try {
      return matchMedia(HOVER_MQ).matches;
    } catch {
      return false;
    }
  }

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

  function ensurePanel() {
    if (panel) {
      return panel;
    }
    panel = document.createElement("aside");
    panel.className = "skill-hint";
    panel.hidden = true;
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");
    const inner = document.createElement("div");
    inner.className = "skill-hint__inner";
    titleLink = document.createElement("a");
    titleLink.className = "skill-hint__title";
    titleLink.target = "_blank";
    titleLink.rel = "noopener noreferrer";
    bodyElement = document.createElement("p");
    bodyElement.className = "skill-hint__body";
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "skill-hint__close";
    closeButton.setAttribute("aria-label", "Dismiss skill hint");
    const hidden = document.createElement("span");
    hidden.className = "visually-hidden";
    hidden.textContent = "Close";
    closeButton.append(closeIcon(), hidden);
    inner.append(titleLink, bodyElement);
    panel.append(inner, closeButton);
    document.body.append(panel);
    return panel;
  }

  function clearCurrent() {
    if (!currentTag) {
      return;
    }
    currentTag.classList.remove("is-hinting");
    currentTag.removeAttribute("aria-expanded");
    currentTag = undefined;
  }

  function hide() {
    if (panel) {
      panel.hidden = true;
    }
    clearCurrent();
  }

  function show(tag) {
    ensurePanel();
    titleLink.textContent = (tag.textContent || "").trim();
    titleLink.href = tag.href;
    bodyElement.textContent = tag.dataset.hint || "";
    clearCurrent();
    currentTag = tag;
    tag.classList.add("is-hinting");
    tag.setAttribute("aria-expanded", "true");
    panel.hidden = false;
  }

  function isModifiedClick(event) {
    return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  }

  function onTagClick(event, tag) {
    event.preventDefault();
    if (currentTag === tag) {
      hide();
    } else {
      show(tag);
    }
  }

  function shouldIgnoreHintClick(event) {
    return !isTouchHint() || event.button !== 0 || isModifiedClick(event);
  }

  function clickTarget(event, selector) {
    return event.target.closest?.(selector);
  }

  function onDocumentClick(event) {
    if (shouldIgnoreHintClick(event)) {
      return;
    }
    if (clickTarget(event, ".skill-hint__close")) {
      event.preventDefault();
      hide();
      return;
    }
    if (clickTarget(event, ".skill-hint")) {
      return;
    }
    const tag = clickTarget(event, TAG);
    if (tag) {
      onTagClick(event, tag);
      return;
    }
    if (currentTag) {
      hide();
    }
  }

  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" || event.key === "Esc") {
      hide();
    }
  });
  globalThis.hydrateSkillHints = hide;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hide);
  } else {
    hide();
  }
})();

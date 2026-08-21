/* Progressive enhancement: mobile skill-tag hints as a lower third.
   Desktop keeps the CSS hover bubble. Without this file, no-hover
   devices show no hint (bubble is hidden in CSS). */
(function () {
  "use strict";

  var HOVER_MQ = "(hover: none)";
  var TAG = "a.tag--link[data-hint]";
  var panel = null;
  var titleLink = null;
  var bodyEl = null;
  var currentTag = null;

  function isTouchHint() {
    try {
      return window.matchMedia(HOVER_MQ).matches;
    } catch (_) {
      return false;
    }
  }

  function closeSvg() {
    return (
      '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/>' +
      "</svg>"
    );
  }

  function ensurePanel() {
    if (panel) return panel;

    panel = document.createElement("aside");
    panel.className = "skill-hint";
    panel.hidden = true;
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");

    var inner = document.createElement("div");
    inner.className = "skill-hint__inner";

    titleLink = document.createElement("a");
    titleLink.className = "skill-hint__title";
    titleLink.target = "_blank";
    titleLink.rel = "noopener noreferrer";

    bodyEl = document.createElement("p");
    bodyEl.className = "skill-hint__body";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "skill-hint__close";
    closeBtn.setAttribute("aria-label", "Dismiss skill hint");
    closeBtn.innerHTML =
      closeSvg() + '<span class="visually-hidden">Close</span>';

    inner.appendChild(titleLink);
    inner.appendChild(bodyEl);
    panel.appendChild(inner);
    panel.appendChild(closeBtn);
    document.body.appendChild(panel);
    return panel;
  }

  function clearCurrent() {
    if (!currentTag) return;
    currentTag.classList.remove("is-hinting");
    currentTag.removeAttribute("aria-expanded");
    currentTag = null;
  }

  function hide() {
    if (panel) panel.hidden = true;
    clearCurrent();
  }

  function show(tag) {
    ensurePanel();
    titleLink.textContent = (tag.textContent || "").trim();
    titleLink.href = tag.href;
    bodyEl.textContent = tag.getAttribute("data-hint") || "";
    clearCurrent();
    currentTag = tag;
    tag.classList.add("is-hinting");
    tag.setAttribute("aria-expanded", "true");
    panel.hidden = false;
  }

  function hydrate() {
    hide();
  }

  document.addEventListener("click", function (e) {
    if (!isTouchHint()) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var close = e.target.closest && e.target.closest(".skill-hint__close");
    if (close) {
      e.preventDefault();
      hide();
      return;
    }

    if (e.target.closest && e.target.closest(".skill-hint")) return;

    var tag = e.target.closest && e.target.closest(TAG);
    if (tag) {
      e.preventDefault();
      if (currentTag === tag) hide();
      else show(tag);
      return;
    }

    if (currentTag) hide();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.key === "Esc") hide();
  });

  window.hydrateSkillHints = hydrate;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrate);
  } else {
    hydrate();
  }
})();

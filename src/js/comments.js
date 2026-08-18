/* Progressive enhancement: inject Giscus into [data-comments].
   Without this file, the heading and noscript note remain. */
(function () {
  "use strict";

  var SELECTOR = "[data-comments]";
  var MOUNT = "[data-comments-mount]";
  var SRC = "https://giscus.app/client.js";
  var GISCUS_ORIGIN = "https://giscus.app";
  var DEFAULT_THEME = "transparent_dark";
  var DEFAULT_THEME_LIGHT = "light";
  var pendingTheme = null;

  function isLight() {
    var toggle = document.getElementById("theme-toggle");
    return !!(toggle && toggle.checked);
  }

  function themeFor(section) {
    var dark = (section && section.getAttribute("data-theme")) || DEFAULT_THEME;
    var light = (section && section.getAttribute("data-theme-light")) || DEFAULT_THEME_LIGHT;
    return isLight() ? light : dark;
  }

  function applyTheme(theme) {
    var iframe = document.querySelector("iframe.giscus-frame");
    if (!iframe || !iframe.contentWindow) {
      pendingTheme = theme;
      return;
    }
    pendingTheme = null;
    iframe.contentWindow.postMessage(
      { giscus: { setConfig: { theme: theme } } },
      GISCUS_ORIGIN
    );
  }

  function syncTheme() {
    var section = document.querySelector(SELECTOR);
    if (!section) return;
    applyTheme(themeFor(section));
  }

  function inject(section) {
    if (!section || !section.getAttribute) return;

    var mount = section.querySelector(MOUNT);
    if (!mount || mount.getAttribute("data-comments-ready") === "1") return;

    var repo = section.getAttribute("data-repo") || "";
    var repoId = section.getAttribute("data-repo-id") || "";
    var category = section.getAttribute("data-category") || "";
    var categoryId = section.getAttribute("data-category-id") || "";
    var term = section.getAttribute("data-term") || "";
    if (!repo || !repoId || !categoryId || !term) return;

    mount.setAttribute("data-comments-ready", "1");
    while (mount.firstChild) mount.removeChild(mount.firstChild);

    var script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", repo);
    script.setAttribute("data-repo-id", repoId);
    script.setAttribute("data-category", category);
    script.setAttribute("data-category-id", categoryId);
    script.setAttribute("data-mapping", "specific");
    script.setAttribute("data-term", term);
    script.setAttribute("data-strict", "1");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "bottom");
    script.setAttribute("data-theme", themeFor(section));
    script.setAttribute("data-lang", "en");
    mount.appendChild(script);
  }

  function hydrateAll() {
    var sections = document.querySelectorAll(SELECTOR);
    Array.prototype.forEach.call(sections, inject);
  }

  window.hydrateComments = hydrateAll;

  var toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("change", syncTheme);
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== GISCUS_ORIGIN) return;
    if (!pendingTheme) return;
    if (!event.data || !event.data.giscus) return;
    applyTheme(pendingTheme);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateAll);
  } else {
    hydrateAll();
  }
})();

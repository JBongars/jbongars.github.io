/* Progressive enhancement: inject Giscus into [data-comments].
   Without this file, the heading and noscript note remain. */
(function enhanceComments() {
  const SELECTOR = "[data-comments]";
  const MOUNT = "[data-comments-mount]";
  const SRC = "https://giscus.app/client.js";
  const GISCUS_ORIGIN = "https://giscus.app";
  const DEFAULT_THEME = "transparent_dark";
  const DEFAULT_THEME_LIGHT = "light";
  let pendingTheme;

  function isLight() {
    const toggle = document.querySelector("#theme-toggle");
    return Boolean(toggle?.checked);
  }

  function themeFor(section) {
    const dark = section?.dataset.theme || DEFAULT_THEME;
    const light = section?.dataset.themeLight || DEFAULT_THEME_LIGHT;
    return isLight() ? light : dark;
  }

  function applyTheme(theme) {
    const iframe = document.querySelector("iframe.giscus-frame");
    if (!iframe?.contentWindow) {
      pendingTheme = theme;
      return;
    }
    pendingTheme = undefined;
    iframe.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, GISCUS_ORIGIN);
  }

  function syncTheme() {
    const section = document.querySelector(SELECTOR);
    if (!section) {
      return;
    }
    applyTheme(themeFor(section));
  }

  function commentFields(section) {
    return {
      repo: section.dataset.repo || "",
      repoId: section.dataset.repoId || "",
      category: section.dataset.category || "",
      categoryId: section.dataset.categoryId || "",
      term: section.dataset.term || "",
    };
  }

  function mountPoint(section) {
    if (!section?.getAttribute) {
      return;
    }
    const mount = section.querySelector(MOUNT);
    if (!mount) {
      return;
    }
    if (mount.querySelector("iframe.giscus-frame, script[src*='giscus.app/client.js']")) {
      return;
    }
    return mount;
  }

  function ensureGiscusCss() {
    if (document.querySelector("#giscus-css")) {
      return;
    }
    const decoy = document.createElement("style");
    decoy.id = "giscus-css";
    document.head.append(decoy);
  }

  function giscusScript(section, fields) {
    const script = document.createElement("script");
    script.src = `${SRC}?term=${encodeURIComponent(fields.term)}`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.repo = fields.repo;
    script.dataset.repoId = fields.repoId;
    script.dataset.category = fields.category;
    script.dataset.categoryId = fields.categoryId;
    script.dataset.mapping = "specific";
    script.dataset.term = fields.term;
    script.dataset.strict = "1";
    script.dataset.reactionsEnabled = "1";
    script.dataset.emitMetadata = "0";
    script.dataset.inputPosition = "bottom";
    script.dataset.theme = themeFor(section);
    script.dataset.lang = "en";
    return script;
  }

  function inject(section) {
    const mount = mountPoint(section);
    if (!mount) {
      return;
    }
    const fields = commentFields(section);
    if (!fields.repo || !fields.repoId || !fields.categoryId || !fields.term) {
      return;
    }
    mount.replaceChildren();
    // client.js always does document.head.prepend(#giscus-css → default.css).
    // Give it a <style> so it does not create a <link> (CSP style-src is 'self').
    ensureGiscusCss();
    mount.append(giscusScript(section, fields));
  }

  function hydrateAll() {
    for (const section of document.querySelectorAll(SELECTOR)) {
      inject(section);
    }
  }

  globalThis.hydrateComments = hydrateAll;
  const toggle = document.querySelector("#theme-toggle");
  if (toggle) {
    toggle.addEventListener("change", syncTheme);
  }
  window.addEventListener("message", (event) => {
    if (event.origin !== GISCUS_ORIGIN) {
      return;
    }
    if (!pendingTheme) {
      return;
    }
    if (!event.data?.giscus) {
      return;
    }
    applyTheme(pendingTheme);
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateAll);
  } else {
    hydrateAll();
  }
})();

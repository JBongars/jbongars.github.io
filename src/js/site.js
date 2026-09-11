/* Progressive enhancement: theme persistence + same-origin page swaps.
   Site works without this file. No page cache — in-flight/recent hover
   prefetches plus the browser HTTP cache only.
   enhance() is the page controller: it calls each module's public methods. */
(function enhanceSite() {
  const KEY = "theme";
  const toggle = document.querySelector("#theme-toggle");
  let main = document.querySelector("main");

  function applyTheme(light) {
    if (!toggle) {
      return;
    }
    toggle.checked = !!light;
    try {
      localStorage.setItem(KEY, light ? "light" : "dark");
    } catch {
      // localStorage may be blocked.
    }
  }

  if (toggle) {
    try {
      if (localStorage.getItem(KEY) === "light") {
        toggle.checked = true;
      }
    } catch {
      // localStorage may be blocked.
    }
    toggle.addEventListener("change", () => {
      applyTheme(toggle.checked);
    });
  }

  function tagsFromUrl() {
    try {
      const raw = new URL(location.href).searchParams.get("t") || "";
      const tags = [];
      for (const part of raw.split(",")) {
        const tag = part.trim();
        if (tag) {
          tags.push(tag);
        }
      }
      return tags;
    } catch {
      return [];
    }
  }

  function call(object, method) {
    if (object && typeof object[method] === "function") {
      object[method]();
    } else if (typeof object === "function") {
      object();
    }
  }

  // Compose tag chips onto a fuzzy-find field when the markup asks for it.
  function mountTagSearchOnFuzzyFind() {
    if (!globalThis.booruSearch || !globalThis.fuzzyFind) {
      return;
    }
    for (const root of document.querySelectorAll("[data-fuzzy-find][data-tag-search]")) {
      const list = root.querySelector("[data-fuzzy-list]");
      const input = root.querySelector(".fuzzy-find__input");
      if (!list || !input) {
        continue;
      }
      globalThis.booruSearch.mountField({
        list,
        input,
        initialTags: tagsFromUrl(),
        listboxId: "fuzzy-find-tags",
        placeholder: "Search notes or tags…",
        fieldClass: "tag-search__field fuzzy-find__field",
        commitTagOnSpace: true,
        commitTagOnTab: true,
        commitTagOnEnter: false,
        commitTitleOnEnter: false,
        onApply(query, tags) {
          globalThis.fuzzyFind.apply(query, tags);
        },
      });
    }
  }

  function skipImg(img) {
    if (!img || img.hasAttribute("eleventy:ignore")) {
      return true;
    }
    const width = Math.trunc(Number(img.getAttribute("width")));
    const height = Math.trunc(Number(img.getAttribute("height")));
    return Boolean(width && height && width <= 32 && height <= 32);
  }

  function revealImages(root) {
    if (!root) {
      return;
    }
    for (const img of root.querySelectorAll("img")) {
      if (skipImg(img) || img.complete) {
        continue;
      }
      function finish(ok) {
        img.classList.remove("is-pending");
        if (ok) {
          img.classList.add("is-loaded");
        }
      }
      img.classList.add("is-pending");
      img.addEventListener(
        "load",
        () => {
          finish(true);
        },
        { once: true },
      );
      img.addEventListener(
        "error",
        () => {
          finish(false);
        },
        { once: true },
      );
      if (img.complete) {
        finish(!!img.naturalWidth);
      }
    }
  }

  function enhance() {
    revealImages(main);
    call(globalThis.fuzzyFind, "hydrate");
    call(globalThis.booruSearch, "hydrate");
    mountTagSearchOnFuzzyFind();
    call(globalThis.hydrateHacklasDisclaimer);
    call(globalThis.hydrateHacklasHelp);
    call(globalThis.hydrateCodeBlocks);
    call(globalThis.hydrateImageLightbox);
    call(globalThis.hydrateComments);
    call(globalThis.hydrateSkillHints);
  }

  if (!main) {
    return;
  }

  enhance();

  const SKELETON_DELAY_MS = 150;
  const SKELETON_MAX_MS = 1000;
  const IMAGE_WAIT_MS = 600;
  const PREFETCH_CAP = 8;
  const INDEX_PATHS = new Set(["/blog/", "/blog", "/write-ups/", "/write-ups"]);
  let path = location.pathname + location.search;
  const prefetches = {};
  const prefetchOrder = [];
  let navGen = 0;
  let navAbort;

  function sameOrigin(href) {
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) {
        return false;
      }
      // Soft-nav on path or query changes; leave hash-only to the browser.
      return url.pathname + url.search !== location.pathname + location.search;
    } catch {
      return false;
    }
  }

  function canonical(url) {
    const parsed = new URL(url, location.href);
    parsed.hash = "";
    return parsed.href;
  }

  function localPathname(url) {
    const parsed = new URL(url, location.href);
    let pathname = parsed.pathname;
    const prefix = (document.documentElement.dataset.pathPrefix || "/").replace(/\/$/, "");
    if (prefix) {
      if (pathname === prefix) {
        return "/";
      }
      if (pathname.indexOf(prefix + "/") === 0) {
        pathname = pathname.slice(prefix.length);
      }
    }
    return pathname;
  }

  function pageKind(url) {
    const p = localPathname(url);
    if (INDEX_PATHS.has(p)) {
      return "cards";
    }
    if (p.indexOf("/blog/") === 0 || p.indexOf("/write-ups/") === 0) {
      return "post";
    }
    return "generic";
  }

  function repeat(n, html) {
    let out = "";
    for (let index = 0; index < n; index++) {
      out += html;
    }
    return out;
  }

  function skeletonHtml(kind) {
    const live = '<p class="visually-hidden">Loading</p>';
    if (kind === "cards") {
      return (
        live +
        '<div class="skeleton skeleton--cards" aria-hidden="true">' +
        '<div class="skeleton__bone skeleton__title"></div>' +
        '<ul class="card-grid skeleton__grid">' +
        repeat(
          6,
          "<li>" +
            '<div class="card card--with-media">' +
            '<div class="card__media skeleton__bone"></div>' +
            '<div class="skeleton__bone skeleton__line skeleton__line--title"></div>' +
            '<div class="skeleton__facts">' +
            '<div class="skeleton__bone skeleton__line"></div>' +
            '<div class="skeleton__bone skeleton__line skeleton__line--short"></div>' +
            "</div>" +
            "</div>" +
            "</li>",
        ) +
        "</ul>" +
        "</div>"
      );
    }
    if (kind === "post") {
      return (
        live +
        '<div class="skeleton skeleton--post" aria-hidden="true">' +
        '<div class="skeleton__bone skeleton__banner"></div>' +
        '<div class="skeleton__bone skeleton__title"></div>' +
        '<div class="skeleton__bone skeleton__line"></div>' +
        '<div class="skeleton__bone skeleton__line skeleton__line--short"></div>' +
        '<div class="skeleton__bone skeleton__line"></div>' +
        '<div class="skeleton__bone skeleton__line"></div>' +
        '<div class="skeleton__bone skeleton__line skeleton__line--short"></div>' +
        "</div>"
      );
    }
    return live;
  }

  function adoptBodyChildren(html) {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const fragment = document.createDocumentFragment();
    for (const node of parsed.body.childNodes) {
      fragment.append(document.importNode(node, true));
    }
    return fragment;
  }

  function showSkeleton(kind) {
    if (!main || kind === "generic") {
      return;
    }
    window.scrollTo(0, 0);
    main.setAttribute("aria-busy", "true");
    main.replaceChildren(adoptBodyChildren(skeletonHtml(kind)));
  }

  function takeImgs(root, options) {
    const nodes = root.querySelectorAll(options.selector);
    let n = 0;
    for (const node of nodes) {
      if (n >= options.max) {
        break;
      }
      if (skipImg(node)) {
        continue;
      }
      options.out.push(node);
      n += 1;
    }
  }

  function collectPrefetchImages(root) {
    const imgs = [];
    takeImgs(root, { selector: ".post-banner__img, .home-hero__image", max: 4, out: imgs });
    takeImgs(root, { selector: ".card__media img", max: 6, out: imgs });
    takeImgs(root, { selector: ".prose img", max: 2, out: imgs });
    return imgs;
  }

  async function decodeImg(element) {
    const source = element.getAttribute("src");
    if (!source) {
      return;
    }
    const img = new Image();
    const srcset = element.getAttribute("srcset");
    const sizes = element.getAttribute("sizes");
    if (srcset) {
      img.srcset = srcset;
    }
    if (sizes) {
      img.sizes = sizes;
    }
    img.src = source;
    if (typeof img.decode === "function") {
      try {
        await img.decode();
      } catch {
        // Broken images still settle.
      }
      return;
    }
    await new Promise((resolve) => {
      img.addEventListener("load", resolve);
      img.addEventListener("error", resolve);
      if (img.complete) {
        resolve();
      }
    });
  }

  function settleWithTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((resolve) => {
        setTimeout(resolve, ms);
      }),
    ]);
  }

  async function prefetchImages(root, waitMs) {
    const ms = waitMs ?? IMAGE_WAIT_MS;
    if (ms <= 0) {
      return;
    }
    const decodes = Array.from(collectPrefetchImages(root), (image) => decodeImg(image));
    await settleWithTimeout(Promise.all(decodes), ms);
  }

  function rememberPrefetch(key, request) {
    if (!Object.hasOwn(prefetches, key)) {
      prefetchOrder.push(key);
    }
    prefetches[key] = request;
    while (prefetchOrder.length > PREFETCH_CAP) {
      const old = prefetchOrder.shift();
      if (old !== key) {
        delete prefetches[old];
      }
    }
  }

  async function forgetFailedPrefetch(key, request) {
    try {
      await request;
    } catch {
      if (prefetches[key] === request) {
        delete prefetches[key];
      }
    }
  }

  async function fetchAndParse(url, signal) {
    const response = await fetch(url, { credentials: "same-origin", signal });
    if (!response.ok) {
      throw new Error(String(response.status));
    }
    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const nextMain = parsed.querySelector("main");
    if (!nextMain) {
      throw new Error("no main");
    }
    void prefetchImages(nextMain, IMAGE_WAIT_MS);
    return { doc: parsed, nextMain };
  }

  function loadDocument(url, signal) {
    const key = canonical(url);
    if (Object.hasOwn(prefetches, key)) {
      return prefetches[key];
    }

    const request = fetchAndParse(url, signal);
    rememberPrefetch(key, request);
    void forgetFailedPrefetch(key, request);
    return request;
  }

  function prefetchUrl(href) {
    if (!sameOrigin(href)) {
      return;
    }
    loadDocument(href);
  }

  function syncNav(nextDocument) {
    const next = nextDocument.querySelector(".site-nav");
    const current = document.querySelector(".site-nav");
    if (next && current) {
      current.replaceWith(next);
    }
  }

  globalThis.syncSoftNavPath = function syncSoftNavPath() {
    path = location.pathname + location.search;
  };

  function applyPage(options) {
    main.removeAttribute("aria-busy");
    main.replaceWith(options.nextMain);
    main = options.nextMain;
    document.title = options.doc.title;
    syncNav(options.doc);
    const navToggle = document.querySelector("#nav-toggle");
    if (navToggle) {
      navToggle.checked = false;
    }
    if (options.push) {
      history.pushState(undefined, "", options.url);
    }
    const next = new URL(options.url, location.href);
    path = next.pathname + next.search;
    window.scrollTo(0, 0);
    enhance();
  }

  function armSkeleton(options) {
    if (options.kind === "generic") {
      return;
    }
    options.state.skeletonTimer = setTimeout(() => {
      if (options.gen !== navGen) {
        return;
      }
      showSkeleton(options.kind);
    }, SKELETON_DELAY_MS);
    options.state.stuckTimer = setTimeout(() => {
      if (options.gen !== navGen || options.state.isApplied) {
        return;
      }
      if (options.push) {
        location.assign(options.url);
      } else {
        location.reload();
      }
    }, SKELETON_DELAY_MS + SKELETON_MAX_MS);
  }

  function markApplied(state) {
    state.isApplied = true;
    clearTimeout(state.skeletonTimer);
    clearTimeout(state.stuckTimer);
  }

  async function settleAndApply(options) {
    if (options.gen !== navGen) {
      return;
    }
    if (!options.loaded?.nextMain) {
      throw new Error("no main");
    }
    const elapsed = Date.now() - options.started;
    const budget = SKELETON_DELAY_MS + SKELETON_MAX_MS - elapsed;
    const wait = Math.max(0, Math.min(IMAGE_WAIT_MS, budget));
    await prefetchImages(options.loaded.nextMain, wait);
    if (options.gen !== navGen) {
      return;
    }
    markApplied(options.state);
    applyPage({
      doc: options.loaded.doc,
      nextMain: options.loaded.nextMain,
      url: options.url,
      push: options.push,
    });
  }

  async function navigate(url, push) {
    if (navAbort) {
      navAbort.abort();
    }
    navAbort = typeof AbortController === "function" ? new AbortController() : undefined;
    const signal = navAbort ? navAbort.signal : undefined;
    const gen = ++navGen;
    const started = Date.now();
    const state = { skeletonTimer: undefined, stuckTimer: undefined, isApplied: false };

    armSkeleton({ kind: pageKind(url), gen, url, push, state });

    try {
      const loaded = await loadDocument(url, signal);
      await settleAndApply({ loaded, gen, started, state, url, push });
    } catch (error) {
      if (gen !== navGen) {
        return;
      }
      markApplied(state);
      if (error && error.name === "AbortError") {
        return;
      }
      throw error;
    }
  }

  function navAnchor(target) {
    const anchor = target?.closest?.("a[href]");
    if (!anchor || anchor.hasAttribute("download")) {
      return;
    }
    if (anchor.target && anchor.target !== "_self") {
      return;
    }
    if (!sameOrigin(anchor.href)) {
      return;
    }
    return anchor;
  }

  document.addEventListener("pointerover", (event) => {
    const anchor = navAnchor(event.target);
    if (anchor) {
      prefetchUrl(anchor.href);
    }
  });

  document.addEventListener("focusin", (event) => {
    const anchor = navAnchor(event.target);
    if (anchor) {
      prefetchUrl(anchor.href);
    }
  });

  document.addEventListener("click", async (event) => {
    const anchor = navAnchor(event.target);
    if (!anchor || event.defaultPrevented || event.button !== 0) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    try {
      await navigate(anchor.href, true);
    } catch {
      location.assign(anchor.href);
    }
  });

  addEventListener("popstate", async () => {
    const next = location.pathname + location.search;
    if (next === path) {
      return;
    }
    path = next;
    try {
      await navigate(location.href, false);
    } catch {
      location.reload();
    }
  });
})();

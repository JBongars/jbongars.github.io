/* Progressive enhancement: theme persistence + same-origin page swaps.
   Site works without this file. No page cache — in-flight/recent hover
   prefetches plus the browser HTTP cache only.
   enhance() is the page controller: it calls each module's public methods. */
(function () {
  var KEY = "theme";
  var SKELETON_DELAY_MS = 150;
  var SKELETON_MAX_MS = 1000;
  var IMAGE_WAIT_MS = 600;
  var PREFETCH_CAP = 8;
  var toggle = document.getElementById("theme-toggle");
  var main = document.querySelector("main");
  var path = location.pathname + location.search;
  var prefetches = {};
  var prefetchOrder = [];
  var navGen = 0;
  var navAbort = null;

  function applyTheme(light) {
    if (!toggle) return;
    toggle.checked = !!light;
    try {
      localStorage.setItem(KEY, light ? "light" : "dark");
    } catch (_) {}
  }

  if (toggle) {
    try {
      if (localStorage.getItem(KEY) === "light") toggle.checked = true;
    } catch (_) {}
    toggle.addEventListener("change", function () {
      applyTheme(toggle.checked);
    });
  }

  function tagsFromUrl() {
    try {
      var raw = new URL(location.href).searchParams.get("t") || "";
      return raw.split(",").map(function (t) { return t.trim(); }).filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  function call(obj, method) {
    if (obj && typeof obj[method] === "function") obj[method]();
    else if (typeof obj === "function") obj();
  }

  // Compose tag chips onto a fuzzy-find field when the markup asks for it.
  function mountTagSearchOnFuzzyFind() {
    if (!window.booruSearch || !window.fuzzyFind) return;
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-fuzzy-find][data-tag-search]"),
      function (root) {
        var list = root.querySelector("[data-fuzzy-list]");
        var input = root.querySelector(".fuzzy-find__input");
        if (!list || !input) return;
        window.booruSearch.mountField({
          list: list,
          input: input,
          initialTags: tagsFromUrl(),
          listboxId: "fuzzy-find-tags",
          placeholder: "Search notes or tags…",
          fieldClass: "tag-search__field fuzzy-find__field",
          commitTagOnSpace: true,
          commitTagOnTab: true,
          commitTagOnEnter: false,
          commitTitleOnEnter: false,
          onApply: function (query, tags) {
            window.fuzzyFind.apply(query, tags);
          }
        });
      }
    );
  }

  function skipImg(img) {
    if (!img || img.hasAttribute("eleventy:ignore")) return true;
    var w = parseInt(img.getAttribute("width"), 10);
    var h = parseInt(img.getAttribute("height"), 10);
    if (w && h && w <= 32 && h <= 32) return true;
    return false;
  }

  function revealImages(root) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll("img"), function (img) {
      if (skipImg(img)) return;
      if (img.complete) return;
      function finish(ok) {
        img.classList.remove("is-pending");
        if (ok) img.classList.add("is-loaded");
      }
      img.classList.add("is-pending");
      img.addEventListener("load", function () { finish(true); }, { once: true });
      img.addEventListener("error", function () { finish(false); }, { once: true });
      if (img.complete) finish(!!img.naturalWidth);
    });
  }

  function enhance() {
    revealImages(main);
    call(window.fuzzyFind, "hydrate");
    call(window.booruSearch, "hydrate");
    mountTagSearchOnFuzzyFind();
    call(window.hydrateHacklasDisclaimer);
    call(window.hydrateHacklasHelp);
    call(window.hydrateCodeBlocks);
    call(window.hydrateImageLightbox);
    call(window.hydrateComments);
    call(window.hydrateSkillHints);
  }

  if (!main) return;

  enhance();

  function sameOrigin(href) {
    try {
      var u = new URL(href, location.href);
      if (u.origin !== location.origin) return false;
      // Soft-nav on path or query changes; leave hash-only to the browser.
      return (
        u.pathname + u.search !== location.pathname + location.search
      );
    } catch (_) {
      return false;
    }
  }

  function canonical(url) {
    var u = new URL(url, location.href);
    u.hash = "";
    return u.href;
  }

  function localPathname(url) {
    var u = new URL(url, location.href);
    var pathname = u.pathname;
    var prefix = (document.documentElement.getAttribute("data-path-prefix") || "/").replace(/\/$/, "");
    if (prefix) {
      if (pathname === prefix) return "/";
      if (pathname.indexOf(prefix + "/") === 0) pathname = pathname.slice(prefix.length);
    }
    return pathname;
  }

  function pageKind(url) {
    var p = localPathname(url);
    if (
      p === "/blog/" || p === "/blog" ||
      p === "/write-ups/" || p === "/write-ups"
    ) return "cards";
    if (p.indexOf("/blog/") === 0 || p.indexOf("/write-ups/") === 0) return "post";
    return "generic";
  }

  function repeat(n, html) {
    var out = "";
    var i;
    for (i = 0; i < n; i++) out += html;
    return out;
  }

  function skeletonHtml(kind) {
    var live = '<p class="visually-hidden">Loading</p>';
    if (kind === "cards") {
      return (
        live +
        '<div class="skeleton skeleton--cards" aria-hidden="true">' +
          '<div class="skeleton__bone skeleton__title"></div>' +
          '<ul class="card-grid skeleton__grid">' +
            repeat(6,
              '<li>' +
                '<div class="card card--with-media">' +
                  '<div class="card__media skeleton__bone"></div>' +
                  '<div class="skeleton__bone skeleton__line skeleton__line--title"></div>' +
                  '<div class="skeleton__facts">' +
                    '<div class="skeleton__bone skeleton__line"></div>' +
                    '<div class="skeleton__bone skeleton__line skeleton__line--short"></div>' +
                  '</div>' +
                '</div>' +
              '</li>'
            ) +
          '</ul>' +
        '</div>'
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
        '</div>'
      );
    }
    return live;
  }

  function showSkeleton(kind) {
    if (!main || kind === "generic") return;
    window.scrollTo(0, 0);
    main.setAttribute("aria-busy", "true");
    main.innerHTML = skeletonHtml(kind);
  }

  function takeImgs(root, selector, max, out) {
    var nodes = root.querySelectorAll(selector);
    var n = 0;
    var i;
    for (i = 0; i < nodes.length && n < max; i++) {
      if (skipImg(nodes[i])) continue;
      out.push(nodes[i]);
      n += 1;
    }
  }

  function collectPrefetchImages(root) {
    var imgs = [];
    takeImgs(root, ".post-banner__img, .home-hero__image", 4, imgs);
    takeImgs(root, ".card__media img", 6, imgs);
    takeImgs(root, ".prose img", 2, imgs);
    return imgs;
  }

  function decodeImg(el) {
    var src = el.getAttribute("src");
    if (!src) return Promise.resolve();
    var img = new Image();
    var srcset = el.getAttribute("srcset");
    var sizes = el.getAttribute("sizes");
    if (srcset) img.srcset = srcset;
    if (sizes) img.sizes = sizes;
    img.src = src;
    if (typeof img.decode === "function") {
      return img.decode().then(function () {}, function () {});
    }
    return new Promise(function (resolve) {
      img.onload = resolve;
      img.onerror = resolve;
      if (img.complete) resolve();
    });
  }

  function settleWithTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (resolve) { setTimeout(resolve, ms); })
    ]);
  }

  function prefetchImages(root, waitMs) {
    var ms = waitMs == null ? IMAGE_WAIT_MS : waitMs;
    if (ms <= 0) return Promise.resolve();
    return settleWithTimeout(
      Promise.all(collectPrefetchImages(root).map(decodeImg)),
      ms
    );
  }

  function rememberPrefetch(key, p) {
    if (!prefetches[key]) prefetchOrder.push(key);
    prefetches[key] = p;
    while (prefetchOrder.length > PREFETCH_CAP) {
      var old = prefetchOrder.shift();
      if (old !== key) delete prefetches[old];
    }
  }

  function loadDocument(url, signal) {
    var key = canonical(url);
    if (prefetches[key]) return prefetches[key];

    var p = fetch(url, { credentials: "same-origin", signal: signal })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var nextMain = doc.querySelector("main");
        if (!nextMain) throw new Error("no main");
        prefetchImages(nextMain, IMAGE_WAIT_MS);
        return { doc: doc, nextMain: nextMain };
      });

    rememberPrefetch(key, p);
    p.catch(function () {
      if (prefetches[key] === p) delete prefetches[key];
    });
    return p;
  }

  function prefetchUrl(href) {
    if (!sameOrigin(href)) return;
    loadDocument(href);
  }

  function syncNav(doc) {
    var next = doc.querySelector(".site-nav");
    var cur = document.querySelector(".site-nav");
    if (next && cur) cur.replaceWith(next);
  }

  window.syncSoftNavPath = function () {
    path = location.pathname + location.search;
  };

  function applyPage(doc, nextMain, url, push) {
    main.removeAttribute("aria-busy");
    main.replaceWith(nextMain);
    main = nextMain;
    document.title = doc.title;
    syncNav(doc);
    var navToggle = document.getElementById("nav-toggle");
    if (navToggle) navToggle.checked = false;
    if (push) history.pushState(null, "", url);
    var next = new URL(url, location.href);
    path = next.pathname + next.search;
    window.scrollTo(0, 0);
    enhance();
  }

  function navigate(url, push) {
    if (navAbort) navAbort.abort();
    navAbort = typeof AbortController === "function" ? new AbortController() : null;
    var signal = navAbort ? navAbort.signal : undefined;
    var gen = ++navGen;
    var kind = pageKind(url);
    var started = Date.now();
    var skeletonTimer = null;
    var stuckTimer = null;
    var applied = false;

    if (kind !== "generic") {
      skeletonTimer = setTimeout(function () {
        if (gen !== navGen) return;
        showSkeleton(kind);
      }, SKELETON_DELAY_MS);
      stuckTimer = setTimeout(function () {
        if (gen !== navGen || applied) return;
        if (push) location.assign(url);
        else location.reload();
      }, SKELETON_DELAY_MS + SKELETON_MAX_MS);
    }

    return loadDocument(url, signal)
      .then(function (result) {
        if (gen !== navGen) return null;
        if (!result || !result.nextMain) throw new Error("no main");
        var elapsed = Date.now() - started;
        var budget = SKELETON_DELAY_MS + SKELETON_MAX_MS - elapsed;
        var wait = Math.max(0, Math.min(IMAGE_WAIT_MS, budget));
        return prefetchImages(result.nextMain, wait).then(function () {
          return result;
        });
      })
      .then(function (result) {
        if (gen !== navGen || !result) return;
        applied = true;
        clearTimeout(skeletonTimer);
        clearTimeout(stuckTimer);
        applyPage(result.doc, result.nextMain, url, push);
      })
      .catch(function (err) {
        if (gen !== navGen) return;
        applied = true;
        clearTimeout(skeletonTimer);
        clearTimeout(stuckTimer);
        if (err && err.name === "AbortError") return;
        throw err;
      });
  }

  function navAnchor(target) {
    var a = target && target.closest && target.closest("a[href]");
    if (!a || a.hasAttribute("download")) return null;
    if (a.target && a.target !== "_self") return null;
    if (!sameOrigin(a.href)) return null;
    return a;
  }

  document.addEventListener("pointerover", function (e) {
    var a = navAnchor(e.target);
    if (a) prefetchUrl(a.href);
  });

  document.addEventListener("focusin", function (e) {
    var a = navAnchor(e.target);
    if (a) prefetchUrl(a.href);
  });

  document.addEventListener("click", function (e) {
    var a = navAnchor(e.target);
    if (!a || e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(a.href, true).catch(function () {
      location.assign(a.href);
    });
  });

  window.addEventListener("popstate", function () {
    var next = location.pathname + location.search;
    if (next === path) return;
    path = next;
    navigate(location.href, false).catch(function () {
      location.reload();
    });
  });
})();

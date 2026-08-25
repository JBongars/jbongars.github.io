/* Progressive enhancement: theme persistence + same-origin page swaps.
   Site works without this file. No page cache — browser HTTP cache only.
   enhance() is the page controller: it calls each module's public methods. */
(function () {
  var KEY = "theme";
  var toggle = document.getElementById("theme-toggle");
  var main = document.querySelector("main");
  var path = location.pathname + location.search;

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
          commitTitleOnEnter: false,
          arrowsOnlyWhenOpen: true,
          onApply: function (query, tags) {
            window.fuzzyFind.apply(query, tags);
          }
        });
      }
    );
  }

  function enhance() {
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

  function syncNav(doc) {
    var next = doc.querySelector(".site-nav");
    var cur = document.querySelector(".site-nav");
    if (next && cur) cur.replaceWith(next);
  }

  window.syncSoftNavPath = function () {
    path = location.pathname + location.search;
  };

  function navigate(url, push) {
    return fetch(url, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var nextMain = doc.querySelector("main");
        if (!nextMain) throw new Error("no main");
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
      });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download")) return;
    if (!sameOrigin(a.href)) return;
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

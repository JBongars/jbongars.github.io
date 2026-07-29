/* Progressive enhancement: theme persistence + same-origin page swaps.
   Site works without this file. No page cache — browser HTTP cache only. */
(function () {
  var KEY = "theme";
  var toggle = document.getElementById("theme-toggle");
  var main = document.querySelector("main");
  var path = location.pathname + location.search;
  if (!toggle || !main) return;

  function applyTheme(light) {
    toggle.checked = !!light;
    try {
      localStorage.setItem(KEY, light ? "light" : "dark");
    } catch (_) {}
  }

  try {
    if (localStorage.getItem(KEY) === "light") toggle.checked = true;
  } catch (_) {}

  toggle.addEventListener("change", function () {
    applyTheme(toggle.checked);
  });

  function sameOrigin(href) {
    try {
      var u = new URL(href, location.href);
      return u.origin === location.origin && u.pathname !== location.pathname;
    } catch (_) {
      return false;
    }
  }

  function syncNav(doc) {
    var next = doc.querySelector(".site-nav");
    var cur = document.querySelector(".site-nav");
    if (next && cur) cur.replaceWith(next);
  }

  function afterNavigate() {
    if (typeof window.hydrateListing === "function") {
      window.hydrateListing();
    }
    if (typeof window.hydrateFuzzyFind === "function") {
      window.hydrateFuzzyFind();
    }
  }

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
        afterNavigate();
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

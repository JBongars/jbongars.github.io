/* Progressive enhancement: rank and filter Hacklas notes.
   Hydrated only when [data-fuzzy-find] is present. Safe without this file.
   Breadcrumb links use ?q=path/prefix. Tag chips come from booru-search.js. */
(function () {
  "use strict";

  var sessions = [];

  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .trim();
  }

  function queryFromUrl() {
    try {
      return new URL(location.href).searchParams.get("q") || "";
    } catch (_) {
      return "";
    }
  }

  function tagsFromUrl() {
    try {
      var raw = new URL(location.href).searchParams.get("t") || "";
      return raw
        .split(",")
        .map(function (t) {
          return t.trim();
        })
        .filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  function syncSoftPath() {
    if (typeof window.syncSoftNavPath === "function") {
      window.syncSoftNavPath();
    }
  }

  function onHacklasIndex() {
    return (
      location.pathname.replace(/\/$/, "").endsWith("/hacklas") ||
      location.pathname === "/hacklas/"
    );
  }

  function syncQueryUrl(q, tagNames) {
    if (!onHacklasIndex()) return;
    var withPrefix =
      typeof window.siteUrl === "function"
        ? window.siteUrl
        : function (p) {
            return p;
          };
    var parts = [];
    if (tagNames && tagNames.length) {
      parts.push(
        "t=" +
          tagNames
            .map(function (name) {
              return encodeURIComponent(name);
            })
            .join(",")
      );
    }
    if (q && String(q).length) {
      parts.push("q=" + encodeURIComponent(q));
    }
    var next =
      withPrefix("/hacklas/") + (parts.length ? "?" + parts.join("&") : "");
    var cur = location.pathname + location.search;
    if (cur === next) return;
    history.replaceState(null, "", next);
    syncSoftPath();
  }

  function origIndex(li) {
    var n = parseInt(li.getAttribute("data-orig"), 10);
    return isNaN(n) ? 0 : n;
  }

  function liTags(li) {
    return (li.getAttribute("data-tags") || "")
      .split(",")
      .map(function (t) {
        return t.trim().toLowerCase();
      })
      .filter(Boolean);
  }

  function matchesTags(li, tagNames) {
    if (!tagNames || !tagNames.length) return true;
    var tags = liTags(li);
    return tagNames.every(function (name) {
      return tags.indexOf(String(name).toLowerCase()) !== -1;
    });
  }

  /** Shortest subsequence window; higher when the query is compact and early. */
  function fuzzyScore(haystack, query) {
    var h = normalize(haystack);
    var q = normalize(query).replace(/\s+/g, "");
    if (!q) return 0;
    var hi = 0;
    var first = -1;
    var last = -1;
    var run = 0;
    var bestRun = 0;
    var prev = -2;
    var qi;
    for (qi = 0; qi < q.length; qi++) {
      hi = h.indexOf(q.charAt(qi), hi);
      if (hi < 0) return -1;
      if (first < 0) first = hi;
      last = hi;
      if (hi === prev + 1) {
        run += 1;
        if (run > bestRun) bestRun = run;
      } else {
        run = 1;
      }
      prev = hi;
      hi += 1;
    }
    var compactness = q.length / (last - first + 1);
    var earliness = 1 / (1 + first);
    return Math.round(
      40 * compactness + 15 * earliness + 15 * (bestRun / q.length)
    );
  }

  function containsScore(field, q, exact, prefix, contains) {
    if (field === q) return exact;
    if (field.indexOf(q) === 0) return prefix;
    var at = field.indexOf(q);
    if (at >= 0) return contains - Math.min(at, 40);
    return -1;
  }

  /**
   * Rank a note for the query. Higher is better; -1 is no match.
   * Contiguous title/path hits beat loose subsequence matches.
   */
  function scoreItem(li, query) {
    var q = normalize(query);
    if (!q) return 0;

    var title = normalize(li.getAttribute("data-title") || "");
    var path = normalize(li.getAttribute("data-path") || "");
    var tags = normalize((li.getAttribute("data-tags") || "").replace(/,/g, " "));
    var slug = path.split("/").pop() || "";
    var asPath = q.replace(/\s+/g, "/");

    if (path === asPath) return 1000;
    if (path.indexOf(asPath + "/") === 0) return 900;

    var titleHit = containsScore(title, q, 800, 700, 600);
    if (titleHit >= 0) return titleHit;

    var slugHit = containsScore(slug, q, 550, 500, 450);
    if (slugHit >= 0) return slugHit;

    var pathHit = containsScore(path, q, 400, 380, 350);
    if (pathHit >= 0) return pathHit;

    var tagHit = containsScore(tags, q, 320, 300, 280);
    if (tagHit >= 0) return tagHit;

    return fuzzyScore([title, path, tags].join(" "), query);
  }

  function visibleItems(list) {
    return Array.prototype.filter.call(list.children, function (li) {
      return li.style.display !== "none";
    });
  }

  function setActive(items, index) {
    items.forEach(function (li) {
      li.classList.remove("is-active");
      li.removeAttribute("aria-selected");
    });
    if (!items.length) return -1;
    var i = ((index % items.length) + items.length) % items.length;
    items[i].classList.add("is-active");
    items[i].setAttribute("aria-selected", "true");
    if (typeof items[i].scrollIntoView === "function") {
      items[i].scrollIntoView({ block: "nearest" });
    }
    return i;
  }

  /** Drop the last path segment: infiltration/windows → infiltration */
  function parentQuery(q) {
    var trimmed = String(q || "").replace(/\/+$/, "");
    if (!trimmed) return "";
    var idx = trimmed.lastIndexOf("/");
    if (idx < 0) return "";
    return trimmed.slice(0, idx);
  }

  function applySession(session, query, tagNames) {
    var q = query == null ? session.input.value : query;
    var tags = tagNames || [];
    var ranked = Array.prototype.map.call(session.list.children, function (li) {
      var score = matchesTags(li, tags) ? scoreItem(li, q) : -1;
      return { li: li, score: score };
    });
    ranked.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return origIndex(a.li) - origIndex(b.li);
    });
    ranked.forEach(function (row) {
      row.li.style.display = row.score < 0 ? "none" : "";
      session.list.appendChild(row.li);
    });
    var items = visibleItems(session.list);
    session.listActive = items.length ? setActive(items, 0) : -1;
    syncQueryUrl(q, tags);
  }

  function hydrate(root) {
    if (!root || root.getAttribute("data-fuzzy-ready") === "1") return;
    var input = root.querySelector(".fuzzy-find__input");
    var list = root.querySelector("[data-fuzzy-list]");
    if (!input || !list) return;
    root.setAttribute("data-fuzzy-ready", "1");
    Array.prototype.forEach.call(list.children, function (li, i) {
      if (!li.hasAttribute("data-orig")) li.setAttribute("data-orig", String(i));
    });

    var session = { root: root, input: input, list: list, listActive: -1 };
    sessions.push(session);

    function currentTags() {
      try {
        return tagsFromUrl();
      } catch (_) {
        return [];
      }
    }

    function filter() {
      applySession(session, input.value, currentTags());
    }

    var preset = queryFromUrl();
    if (preset) {
      input.value = preset;
      if (typeof input.focus === "function") input.focus();
    }
    applySession(session, input.value, currentTags());

    input.addEventListener("input", filter);

    input.addEventListener("keydown", function (e) {
      var items;
      var cur;
      var link;

      if (e.key === "Backspace" && input.selectionStart === 0 && input.selectionEnd === 0) {
        e.preventDefault();
        if (input.value) {
          input.value = parentQuery(input.value);
          filter();
        } else {
          history.back();
        }
        return;
      }

      items = visibleItems(list);
      if (!items.length && e.key !== "Escape" && e.key !== "Enter") return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        session.listActive = setActive(items, session.listActive + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        session.listActive = setActive(
          items,
          session.listActive <= 0 ? items.length - 1 : session.listActive - 1
        );
      } else if (e.key === "Enter") {
        cur = items[session.listActive] || items[0];
        link = cur && cur.querySelector("a[href]");
        if (link) {
          e.preventDefault();
          syncQueryUrl(input.value, currentTags());
          link.click();
        }
      } else if (e.key === "Escape") {
        if (input.value) {
          e.preventDefault();
          input.value = "";
          filter();
        }
      }
    });

    list.addEventListener("mousemove", function (e) {
      var li = e.target.closest && e.target.closest("li");
      if (!li || !list.contains(li) || li.style.display === "none") return;
      var items = visibleItems(list);
      session.listActive = setActive(items, items.indexOf(li));
    });

    list.addEventListener("click", function () {
      syncQueryUrl(input.value, currentTags());
    });
  }

  function hydrateAll() {
    sessions = sessions.filter(function (session) {
      return session.root && document.contains(session.root);
    });
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-fuzzy-find]"),
      hydrate
    );
  }

  function apply(query, tagNames) {
    sessions.forEach(function (session) {
      applySession(session, query, tagNames);
    });
  }

  window.fuzzyFind = { hydrate: hydrateAll, apply: apply };
  window.applyFuzzyFind = apply;
  window.hydrateFuzzyFind = hydrateAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateAll);
  } else {
    hydrateAll();
  }
})();

/* Progressive enhancement: Spotlight-style fuzzy filter for Hacklas notes.
   Hydrated only when [data-fuzzy-find] is present. Safe without this file.
   Breadcrumb links use ?q=path/prefix — this file prefills and filters from that.
   Backspace at the start of the field steps up the path / goes to the previous page. */
(function () {
  "use strict";

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

  function syncSoftPath() {
    if (typeof window.syncSoftNavPath === "function") {
      window.syncSoftNavPath();
    }
  }

  function syncQueryUrl(q) {
    if (!location.pathname.replace(/\/$/, "").endsWith("/hacklas") &&
        location.pathname !== "/hacklas/") {
      return;
    }
    var next =
      q && String(q).length
        ? "/hacklas/?q=" + encodeURIComponent(q)
        : "/hacklas/";
    var cur = location.pathname + location.search;
    if (cur === next) return;
    history.replaceState(null, "", next);
    syncSoftPath();
  }

  /** True if query characters appear in order (subsequence) in haystack. */
  function fuzzyMatch(haystack, query) {
    var h = normalize(haystack);
    var q = normalize(query);
    if (!q) return true;
    var hi = 0;
    for (var qi = 0; qi < q.length; qi++) {
      var ch = q.charAt(qi);
      if (ch === " ") continue;
      hi = h.indexOf(ch, hi);
      if (hi < 0) return false;
      hi += 1;
    }
    return true;
  }

  function itemHaystack(li) {
    return [
      li.getAttribute("data-title") || "",
      li.getAttribute("data-path") || "",
      li.getAttribute("data-tags") || "",
    ].join(" ");
  }

  /** Prefer path-prefix matches (breadcrumb ?q=), else fuzzy on title/path/tags. */
  function itemMatches(li, query) {
    var q = normalize(query);
    if (!q) return true;

    var path = normalize(li.getAttribute("data-path") || "");
    var asPath = q.replace(/\s+/g, "/");
    if (path === asPath || path.indexOf(asPath + "/") === 0) return true;

    return fuzzyMatch(itemHaystack(li), query);
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

  function hydrate(root) {
    if (!root || root.getAttribute("data-fuzzy-ready") === "1") return;
    var input = root.querySelector(".fuzzy-find__input");
    var list = root.querySelector("[data-fuzzy-list]");
    if (!input || !list) return;
    root.setAttribute("data-fuzzy-ready", "1");

    var activeIndex = -1;

    function filter() {
      var q = input.value;
      Array.prototype.forEach.call(list.children, function (li) {
        li.style.display = itemMatches(li, q) ? "" : "none";
      });
      var items = visibleItems(list);
      activeIndex = items.length ? setActive(items, 0) : -1;
      syncQueryUrl(q);
    }

    var preset = queryFromUrl();
    if (preset) {
      input.value = preset;
      filter();
      if (typeof input.focus === "function") input.focus();
    } else {
      syncQueryUrl(input.value);
    }

    input.addEventListener("input", filter);

    input.addEventListener("keydown", function (e) {
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

      var items = visibleItems(list);
      if (!items.length && e.key !== "Escape") return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = setActive(items, activeIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = setActive(items, activeIndex <= 0 ? items.length - 1 : activeIndex - 1);
      } else if (e.key === "Enter") {
        var cur = items[activeIndex] || items[0];
        var link = cur && cur.querySelector("a[href]");
        if (link) {
          e.preventDefault();
          syncQueryUrl(input.value);
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
      activeIndex = setActive(items, items.indexOf(li));
    });

    // Keep the current query in history before leaving via a result click.
    list.addEventListener("click", function () {
      syncQueryUrl(input.value);
    });
  }

  function hydrateAll() {
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-fuzzy-find]"),
      hydrate
    );
  }

  window.hydrateFuzzyFind = hydrateAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateAll);
  } else {
    hydrateAll();
  }
})();

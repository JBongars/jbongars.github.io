/* Progressive enhancement: rank and filter Hacklas notes.
   Hydrated only when [data-fuzzy-find] is present. Safe without this file.
   Breadcrumb links use ?q=path/prefix. Tag chips come from booru-search.js. */
(function enhanceFuzzyFind() {
  "use strict";

  let sessions = [];

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .trim();
  }

  function queryFromUrl() {
    try {
      return new URL(location.href).searchParams.get("q") || "";
    } catch {
      return "";
    }
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

  function syncSoftPath() {
    if (typeof globalThis.syncSoftNavPath === "function") {
      globalThis.syncSoftNavPath();
    }
  }

  function onHacklasIndex() {
    return (
      location.pathname.replace(/\/$/, "").endsWith("/hacklas") || location.pathname === "/hacklas/"
    );
  }

  function tagQueryPart(tagNames) {
    if (!tagNames || tagNames.length === 0) {
      return "";
    }
    return "t=" + Array.from(tagNames, (name) => encodeURIComponent(name)).join(",");
  }

  function syncQueryUrl(query, tagNames) {
    if (!onHacklasIndex()) {
      return;
    }
    const withPrefix =
      typeof globalThis.siteUrl === "function" ? globalThis.siteUrl : (path) => path;
    const parts = [];
    const tagsPart = tagQueryPart(tagNames);
    if (tagsPart) {
      parts.push(tagsPart);
    }
    if (query && String(query).length > 0) {
      parts.push("q=" + encodeURIComponent(query));
    }
    const next = withPrefix("/hacklas/") + (parts.length > 0 ? "?" + parts.join("&") : "");
    const current = location.pathname + location.search;
    if (current === next) {
      return;
    }
    history.replaceState(undefined, "", next);
    syncSoftPath();
  }

  function origIndex(item) {
    const n = Math.trunc(Number(item.dataset.orig));
    return Number.isNaN(n) ? 0 : n;
  }

  function liTags(item) {
    const tags = [];
    const rawTags = (item.dataset.tags || "").split(",");
    for (const part of rawTags) {
      const tag = part.trim().toLowerCase();
      if (tag) {
        tags.push(tag);
      }
    }
    return tags;
  }

  function matchesTags(item, tagNames) {
    if (!tagNames || tagNames.length === 0) {
      return true;
    }
    const tags = liTags(item);
    return tagNames.every((name) => tags.includes(String(name).toLowerCase()));
  }

  /**
  Shortest subsequence window; higher when the query is compact and early.
  */
  function fuzzyScore(haystack, query) {
    const h = normalize(haystack);
    const q = normalize(query).replaceAll(/\s+/g, "");
    if (!q) {
      return 0;
    }
    let hi = 0;
    let first = -1;
    let last = -1;
    let run = 0;
    let bestRun = 0;
    let previous = -2;
    for (const character of q) {
      hi = h.indexOf(character, hi);
      if (hi < 0) {
        return -1;
      }
      if (first < 0) {
        first = hi;
      }
      last = hi;
      if (hi === previous + 1) {
        run += 1;
        if (run > bestRun) {
          bestRun = run;
        }
      } else {
        run = 1;
      }
      previous = hi;
      hi += 1;
    }
    const compactness = q.length / (last - first + 1);
    const earliness = 1 / (1 + first);
    return Math.round(40 * compactness + 15 * earliness + 15 * (bestRun / q.length));
  }

  function containsScore(field, query, scores) {
    if (field === query) {
      return scores.exact;
    }
    if (field.indexOf(query) === 0) {
      return scores.prefix;
    }
    const at = field.indexOf(query);
    if (at !== -1) {
      return scores.contains - Math.min(at, 40);
    }
    return -1;
  }

  function scorePath(path, asPath) {
    if (path === asPath) {
      return 1000;
    }
    if (path.indexOf(asPath + "/") === 0) {
      return 900;
    }
    return -1;
  }

  function scoreFields(query, fields) {
    const checks = [
      { field: fields.title, scores: { exact: 800, prefix: 700, contains: 600 } },
      { field: fields.slug, scores: { exact: 550, prefix: 500, contains: 450 } },
      { field: fields.path, scores: { exact: 400, prefix: 380, contains: 350 } },
      { field: fields.tags, scores: { exact: 320, prefix: 300, contains: 280 } },
    ];
    for (const check of checks) {
      const hit = containsScore(check.field, query, check.scores);
      if (hit >= 0) {
        return hit;
      }
    }
    return -1;
  }

  /**
   * Rank a note for the query. Higher is better; -1 is no match.
   * Contiguous title/path hits beat loose subsequence matches.
   */
  function scoreItem(item, query) {
    const q = normalize(query);
    if (!q) {
      return 0;
    }

    const title = normalize(item.dataset.title || "");
    const path = normalize(item.dataset.path || "");
    const tags = normalize((item.dataset.tags || "").replaceAll(",", " "));
    const slug = path.split("/").pop() || "";
    const asPath = q.replaceAll(/\s+/g, "/");

    const pathHit = scorePath(path, asPath);
    if (pathHit >= 0) {
      return pathHit;
    }

    const fieldHit = scoreFields(q, { title, slug, path, tags });
    if (fieldHit >= 0) {
      return fieldHit;
    }

    return fuzzyScore([title, path, tags].join(" "), query);
  }

  function visibleItems(list) {
    const items = [];
    for (const item of list.children) {
      if (item.style.display !== "none") {
        items.push(item);
      }
    }
    return items;
  }

  function setActive(items, index) {
    for (const item of items) {
      item.classList.remove("is-active");
      item.removeAttribute("aria-selected");
    }
    if (items.length === 0) {
      return -1;
    }
    const wrapped = ((index % items.length) + items.length) % items.length;
    items[wrapped].classList.add("is-active");
    items[wrapped].setAttribute("aria-selected", "true");
    if (typeof items[wrapped].scrollIntoView === "function") {
      items[wrapped].scrollIntoView({ block: "nearest" });
    }
    return wrapped;
  }

  /**
  Drop the last path segment: infiltration/windows → infiltration
  */
  function parentQuery(query) {
    const trimmed = String(query || "").replace(/\/+$/, "");
    if (!trimmed) {
      return "";
    }
    const index = trimmed.lastIndexOf("/");
    if (index === -1) {
      return "";
    }
    return trimmed.slice(0, index);
  }

  function applySession(session, query, tagNames) {
    const q = query ?? session.input.value;
    const tags = tagNames || [];
    const ranked = [];
    for (const item of session.list.children) {
      const score = matchesTags(item, tags) ? scoreItem(item, q) : -1;
      ranked.push({ item, score });
    }
    ranked.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return origIndex(a.item) - origIndex(b.item);
    });
    for (const row of ranked) {
      row.item.style.display = row.score < 0 ? "none" : "";
      session.list.append(row.item);
    }
    const items = visibleItems(session.list);
    session.listActive = items.length > 0 ? setActive(items, 0) : -1;
    syncQueryUrl(q, tags);
  }

  function markOrigIndexes(list) {
    let index = 0;
    for (const item of list.children) {
      if (!Object.hasOwn(item.dataset, "orig")) {
        item.dataset.orig = String(index);
      }
      index += 1;
    }
  }

  function handleBackspace(event, session) {
    const { input } = session;
    if (event.key !== "Backspace" || input.selectionStart !== 0 || input.selectionEnd !== 0) {
      return false;
    }
    event.preventDefault();
    if (input.value) {
      input.value = parentQuery(input.value);
      applySession(session, input.value, tagsFromUrl());
    } else {
      history.back();
    }
    return true;
  }

  function handleArrow(event, session, items) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      session.listActive = setActive(items, session.listActive + 1);
      return true;
    }
    if (event.key !== "ArrowUp") {
      return false;
    }
    event.preventDefault();
    const previous = session.listActive <= 0 ? items.length : session.listActive;
    session.listActive = setActive(items, previous - 1);
    return true;
  }

  function handleEnter(event, session, items) {
    if (event.key !== "Enter") {
      return false;
    }
    const current = items[session.listActive] || items[0];
    const link = current?.querySelector("a[href]");
    if (link) {
      event.preventDefault();
      syncQueryUrl(session.input.value, tagsFromUrl());
      link.click();
    }
    return true;
  }

  function handleEscape(event, session) {
    if (event.key !== "Escape" || !session.input.value) {
      return false;
    }
    event.preventDefault();
    session.input.value = "";
    applySession(session, session.input.value, tagsFromUrl());
    return true;
  }

  function onInputKeydown(event, session) {
    if (handleBackspace(event, session)) {
      return;
    }
    const items = visibleItems(session.list);
    if (items.length === 0 && event.key !== "Escape" && event.key !== "Enter") {
      return;
    }
    if (handleArrow(event, session, items) || handleEnter(event, session, items)) {
      return;
    }
    handleEscape(event, session);
  }

  function onListMove(event, session) {
    const item = event.target.closest?.("li");
    if (!item || !session.list.contains(item) || item.style.display === "none") {
      return;
    }
    const items = visibleItems(session.list);
    session.listActive = setActive(items, items.indexOf(item));
  }

  function hydrate(root) {
    if (!root || root.dataset.fuzzyReady === "1") {
      return;
    }
    const input = root.querySelector(".fuzzy-find__input");
    const list = root.querySelector("[data-fuzzy-list]");
    if (!input || !list) {
      return;
    }
    root.dataset.fuzzyReady = "1";
    markOrigIndexes(list);

    const session = { root, input, list, listActive: -1 };
    sessions.push(session);

    const preset = queryFromUrl();
    if (preset) {
      input.value = preset;
      if (typeof input.focus === "function") {
        input.focus();
      }
    }
    applySession(session, input.value, tagsFromUrl());

    input.addEventListener("input", () => {
      applySession(session, input.value, tagsFromUrl());
    });
    input.addEventListener("keydown", (event) => {
      onInputKeydown(event, session);
    });
    list.addEventListener("mousemove", (event) => {
      onListMove(event, session);
    });
    list.addEventListener("click", () => {
      syncQueryUrl(input.value, tagsFromUrl());
    });
  }

  function hydrateAll() {
    sessions = sessions.filter((session) => session.root && document.contains(session.root));
    for (const root of document.querySelectorAll("[data-fuzzy-find]")) {
      hydrate(root);
    }
  }

  function apply(query, tagNames) {
    for (const session of sessions) {
      applySession(session, query, tagNames);
    }
  }

  globalThis.fuzzyFind = { hydrate: hydrateAll, apply };
  globalThis.applyFuzzyFind = apply;
  globalThis.hydrateFuzzyFind = hydrateAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateAll);
  } else {
    hydrateAll();
  }
})();

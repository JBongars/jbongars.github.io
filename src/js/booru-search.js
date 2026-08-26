/* Progressive enhancement: tag chips, autocomplete, and listing sort.
   Public methods: booruSearch.mountList(list), booruSearch.mountField(opts).
   The page controller decides when to call them. Safe without this file. */
(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Tag swatch colors
  // ---------------------------------------------------------------------
  // Each tag in the dropdown gets a small color swatch purely so the list
  // is easier to scan. We have no way of knowing whether a tag is really
  // an artist/character/copyright tag, so this is NOT a taxonomy — it's a
  // deterministic hash of the tag's characters into one of a few arbitrary
  // colors. Same tag always gets the same color; that's the only promise.
  var TAG_SWATCH_COLORS = ["blue", "green", "purple", "orange", "pink"];

  function swatchColorForTag(tag) {
    var hash = 0;
    for (var i = 0; i < tag.length; i++) {
      hash = (hash + tag.charCodeAt(i) * (i + 1)) % 997;
    }
    return TAG_SWATCH_COLORS[hash % TAG_SWATCH_COLORS.length];
  }

  // ---------------------------------------------------------------------
  // Data helpers — reading tag data off the DOM
  // ---------------------------------------------------------------------
  var TagData = {
    tagsFor: function (el) {
      var raw = el.getAttribute("data-tags") || "";
      if (!raw) return [];
      return raw
        .split(",")
        .map(function (t) { return t.trim(); })
        .filter(Boolean);
    },

    formatCount: function (n) {
      if (n < 1000) return String(n);
      var k = n / 1000;
      return (Math.round(k * 10) / 10).toString().replace(/\.0$/, "") + "k";
    },

    buildIndex: function (list) {
      var counts = {};
      Array.prototype.forEach.call(list.children, function (li) {
        TagData.tagsFor(li).forEach(function (tag) {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      });
      return Object.keys(counts).map(function (name) {
        return {
          name: name,
          count: counts[name],
          color: swatchColorForTag(name)
        };
      });
    }
  };

  function normalize(s) {
    return String(s || "").toLowerCase().trim();
  }

  // Same subsequence window idea as fuzzy-find.js (that file is not on
  // listing-only pages, so this copy lives here).
  function fuzzyScore(haystack, query) {
    var h = normalize(haystack);
    var q = normalize(query).replace(/\s+/g, "");
    var hi = 0;
    var first = -1;
    var last = -1;
    var run = 0;
    var bestRun = 0;
    var prev = -2;
    var qi;
    if (!q) return 0;
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
    return Math.round(
      40 * (q.length / (last - first + 1)) +
        15 * (1 / (1 + first)) +
        15 * (bestRun / q.length)
    );
  }

  function rankTags(tagIndex, filter, query) {
    var q = normalize(query);
    var scored = [];
    if (!q) return scored;
    tagIndex.forEach(function (tag) {
      var score;
      if (filter.has(tag.name)) return;
      score = fuzzyScore(tag.name, q);
      if (score < 0) return;
      scored.push({ tag: tag, score: score });
    });
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return b.tag.count - a.tag.count;
    });
    return scored.slice(0, 10).map(function (row) { return row.tag; });
  }

  function isDesktopSearch() {
    return window.matchMedia("(min-width: 48rem)").matches;
  }

  // iOS retargets the click that follows pointerdown onto whatever is
  // under the finger after the suggestion row closes (usually a note).
  function swallowNextClick() {
    var timeout;
    function swallow(e) {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
    }
    function cleanup() {
      document.removeEventListener("click", swallow, true);
      clearTimeout(timeout);
    }
    document.addEventListener("click", swallow, true);
    timeout = setTimeout(cleanup, 500);
  }

  // ---------------------------------------------------------------------
  // Sorting
  // ---------------------------------------------------------------------
  var Sort = {
    apply: function (list, mode, dir) {
      var items = Array.prototype.slice.call(list.children);
      items.sort(Sort._comparator(mode, dir));
      items.forEach(function (item) { list.appendChild(item); });
    },

    _comparator: function (mode, dir) {
      var attr = mode === "name" ? "data-title" : "data-date";
      return function (a, b) {
        var av = (a.getAttribute(attr) || "").toLowerCase();
        var bv = (b.getAttribute(attr) || "").toLowerCase();
        if (av < bv) return -dir;
        if (av > bv) return dir;
        return 0;
      };
    }
  };

  // ---------------------------------------------------------------------
  // Filtering — tracks selected tag/title chips and shows/hides items
  // ---------------------------------------------------------------------
  function Filter(list) {
    this.list = list;
    this.selected = []; // { name, kind: "tag" | "title", excluded: bool }
  }

  Filter.prototype.has = function (name) {
    var lower = name.toLowerCase();
    return this.selected.some(function (t) {
      return t.name.toLowerCase() === lower;
    });
  };

  // Returns false (and does nothing) if the name is already selected.
  Filter.prototype.add = function (name, kind, excluded) {
    if (!name || this.has(name)) return false;
    this.selected.push({
      name: name,
      kind: kind,
      excluded: !!excluded,
      color: swatchColorForTag(name)
    });
    return true;
  };

  Filter.prototype.removeAt = function (index) {
    this.selected.splice(index, 1);
  };

  Filter.prototype.removeLast = function () {
    if (!this.selected.length) return false;
    this.selected.pop();
    return true;
  };

  Filter.prototype._names = function (kind, excluded) {
    return this.selected
      .filter(function (t) { return t.kind === kind && !!t.excluded === !!excluded; })
      .map(function (t) { return t.name.toLowerCase(); });
  };

  Filter.prototype.apply = function () {
    var tagInclude = this._names("tag", false);
    var tagExclude = this._names("tag", true);
    var titleInclude = this._names("title", false);
    var titleExclude = this._names("title", true);

    Array.prototype.forEach.call(this.list.children, function (li) {
      var tags = TagData.tagsFor(li).map(function (t) { return t.toLowerCase(); });
      var title = (li.getAttribute("data-title") || "").toLowerCase();

      var visible =
        tagInclude.every(function (t) { return tags.indexOf(t) !== -1; }) &&
        tagExclude.every(function (t) { return tags.indexOf(t) === -1; }) &&
        titleInclude.every(function (t) { return title.indexOf(t) !== -1; }) &&
        titleExclude.every(function (t) { return title.indexOf(t) === -1; });

      li.hidden = !visible;
    });
  };

  // ---------------------------------------------------------------------
  // DOM builder — tiny helper so components below aren't full of
  // createElement/setAttribute boilerplate
  // ---------------------------------------------------------------------
  var Dom = {
    el: function (tag, className, attrs) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (attrs) {
        Object.keys(attrs).forEach(function (key) {
          node.setAttribute(key, attrs[key]);
        });
      }
      return node;
    }
  };

  // ---------------------------------------------------------------------
  // Sort controls component — the "Date / Name" button pair
  // ---------------------------------------------------------------------
  function createSortControls(list, filter) {
    var state = { mode: "date", dir: -1 };

    var bar = Dom.el("div", "list-sort", {
      role: "group",
      "aria-label": "Sort posts"
    });

    function makeButton(mode, text) {
      var btn = Dom.el("button", "list-sort__btn", { type: "button" });
      btn.textContent = text;
      btn.addEventListener("click", function () {
        if (state.mode === mode) {
          state.dir *= -1;
        } else {
          state.mode = mode;
          state.dir = mode === "date" ? -1 : 1;
        }
        sync();
      });
      return btn;
    }

    var dateBtn = makeButton("date", "Date");
    var nameBtn = makeButton("name", "Name");
    bar.appendChild(dateBtn);
    bar.appendChild(nameBtn);

    function sync() {
      dateBtn.setAttribute("aria-pressed", state.mode === "date" ? "true" : "false");
      nameBtn.setAttribute("aria-pressed", state.mode === "name" ? "true" : "false");

      dateBtn.textContent = state.mode === "date"
        ? "Date " + (state.dir < 0 ? "↓" : "↑")
        : "Date";
      nameBtn.textContent = state.mode === "name"
        ? "Name " + (state.dir > 0 ? "↑" : "↓")
        : "Name";

      Sort.apply(list, state.mode, state.dir);
      filter.apply();
    }

    sync();

    return { element: bar };
  }

  // ---------------------------------------------------------------------
  // Tag search component — input, suggestion row, and chips
  // ---------------------------------------------------------------------
  // opts.input              reuse an existing field (Hacklas)
  // opts.mount              parent to attach the field (Hacklas wrap)
  // opts.commitTagOnSpace   Space commits a matching tag (default on)
  // opts.commitTagOnTab     Tab commits the highlighted suggestion
  // opts.commitTagOnEnter   Enter commits the highlighted suggestion
  // opts.commitTitleOnEnter Enter turns leftover text into a title chip
  // opts.onInput            live callback after each keystroke
  // opts.placeholder, opts.listboxId, opts.fieldClass
  function createTagSearch(tagIndex, filter, opts) {
    opts = opts || {};
    var debounceTimer = null;
    var activeIndex = -1;
    var suggestions = [];
    var listboxId = opts.listboxId || "tag-search-listbox";
    var wrap = opts.mount || Dom.el("div", "tag-search");

    var field = Dom.el("div", opts.fieldClass || "tag-search__field");
    var input = opts.input;
    if (input) {
      input.classList.add("tag-search__input");
      if (opts.placeholder) input.setAttribute("placeholder", opts.placeholder);
    } else {
      input = Dom.el("input", "tag-search__input", {
        type: "text",
        placeholder: opts.placeholder || "Filter by tag…",
        autocomplete: "off",
        spellcheck: "false"
      });
    }
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", listboxId);

    var suggest = Dom.el("div", "tag-search__suggest");
    suggest.hidden = true;

    var closeBtn = Dom.el("button", "tag-search__close", { type: "button" });
    closeBtn.setAttribute("aria-label", "Close tag suggestions");
    closeBtn.textContent = "×";

    var dropdown = Dom.el("ul", "tag-search__dropdown", {
      id: listboxId,
      role: "listbox"
    });

    suggest.appendChild(closeBtn);
    suggest.appendChild(dropdown);
    wrap.appendChild(field);
    wrap.appendChild(suggest);
    field.appendChild(input);

    field.addEventListener("click", function (e) {
      if (e.target === field) input.focus();
    });

    closeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      wrap.setAttribute("data-suggest-dismissed", "1");
      closeSuggest();
      input.focus();
    });

    function buildChip(entry, onRemove) {
      var color = entry.color || swatchColorForTag(entry.name);
      var classes =
        "tag-chip tag-chip--" +
        color +
        (entry.excluded ? " tag-chip--exclude" : "") +
        (entry.kind === "title" ? " tag-chip--title" : "");
      var chip = Dom.el("button", classes, { type: "button" });

      var kindLabel = entry.kind === "title" ? "title filter" : "tag";
      chip.setAttribute(
        "aria-label",
        (entry.excluded ? "Remove excluded " : "Remove ") + kindLabel + " " + entry.name
      );

      var label = Dom.el("span", "tag-chip__label");
      label.textContent = (entry.excluded ? "-" : "") + entry.name;

      var x = Dom.el("span", "tag-chip__x", { "aria-hidden": "true" });
      x.textContent = "×";

      chip.appendChild(label);
      chip.appendChild(x);
      var removed = false;
      function removeChip(e) {
        e.preventDefault();
        e.stopPropagation();
        if (removed) return;
        removed = true;
        onRemove();
      }
      chip.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        removeChip(e);
      });
      chip.addEventListener("click", removeChip);
      return chip;
    }

    function renderChips() {
      Array.prototype.slice.call(field.querySelectorAll(".tag-chip")).forEach(function (node) {
        node.remove();
      });

      filter.selected.forEach(function (entry, index) {
        var chip = buildChip(entry, function () {
          filter.removeAt(index);
          renderChips();
          filter.apply();
          input.focus();
        });
        field.insertBefore(chip, input);
      });
    }

    function closeSuggest() {
      suggest.hidden = true;
      dropdown.textContent = "";
      suggestions = [];
      activeIndex = -1;
      input.setAttribute("aria-expanded", "false");
    }

    function suggestOpen() {
      return !suggest.hidden && suggestions.length > 0;
    }

    function highlightActive() {
      var rows = dropdown.querySelectorAll(".tag-search__option");
      Array.prototype.forEach.call(rows, function (row, i) {
        var on = i === activeIndex;
        row.classList.toggle("is-active", on);
        row.setAttribute("aria-selected", on ? "true" : "false");
      });
    }

    function commitTagSuggestion(tag, excluded) {
      if (tag && filter.add(tag.name, "tag", excluded)) {
        renderChips();
        filter.apply();
      }
      input.value = "";
      closeSuggest();
      if (opts.onInput) opts.onInput();
    }

    function resolveTag(name) {
      var lower = String(name || "").toLowerCase();
      var i;
      for (i = 0; i < tagIndex.length; i++) {
        if (tagIndex[i].name.toLowerCase() === lower) return tagIndex[i];
      }
      return null;
    }

    function tryCommitTag() {
      if (suggestOpen() && activeIndex >= 0 && suggestions[activeIndex]) {
        commitTagSuggestion(suggestions[activeIndex], parseQuery().excluded);
        return true;
      }
      var exact = resolveTag(input.value.trim());
      if (exact) {
        commitTagSuggestion(exact, false);
        return true;
      }
      return false;
    }

    function buildOption(tag, index, excluded) {
      var li = Dom.el("li", "tag-search__option", {
        role: "option",
        "aria-selected": "false"
      });

      var swatch = Dom.el("span", "tag-search__cat tag-search__cat--" + tag.color, {
        "aria-hidden": "true"
      });

      var name = Dom.el("span", "tag-search__name");
      name.textContent = (excluded ? "-" : "") + tag.name;

      var count = Dom.el("span", "tag-search__count");
      count.textContent = TagData.formatCount(tag.count);

      li.appendChild(swatch);
      li.appendChild(name);
      li.appendChild(count);

      li.addEventListener("mouseenter", function () {
        activeIndex = index;
        highlightActive();
      });
      // pointerdown (not mousedown): iOS blurs the field — and dismisses
      // this list — before mouse events fire on a tap. Swallow the click
      // that would otherwise land on the note under the overlay.
      li.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        swallowNextClick();
        commitTagSuggestion(tag, excluded);
      });
      li.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        commitTagSuggestion(tag, excluded);
      });

      return li;
    }

    function renderSuggestions(query, excluded) {
      if (wrap.getAttribute("data-suggest-dismissed") === "1") {
        closeSuggest();
        return;
      }

      suggestions = rankTags(tagIndex, filter, query);
      dropdown.textContent = "";
      if (!query || !suggestions.length) {
        closeSuggest();
        return;
      }

      suggestions.forEach(function (tag, i) {
        dropdown.appendChild(buildOption(tag, i, excluded));
      });

      activeIndex = 0;
      highlightActive();
      suggest.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function commitTitleQuery() {
      var raw = input.value.trim();
      if (!raw) return;
      var excluded = raw.charAt(0) === "-";
      var name = excluded ? raw.slice(1).trim() : raw;

      input.value = "";
      closeSuggest();

      if (filter.add(name, "title", excluded)) {
        renderChips();
        filter.apply();
      }
    }

    function parseQuery() {
      var raw = input.value.trim();
      var excluded = raw.charAt(0) === "-";
      return { text: excluded ? raw.slice(1).trim() : raw, excluded: excluded };
    }

    function isInputEmpty() {
      return input.value === "" && input.selectionStart === 0 && input.selectionEnd === 0;
    }

    input.addEventListener("input", function () {
      wrap.removeAttribute("data-suggest-dismissed");
      if (opts.onInput) opts.onInput();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        var q = parseQuery();
        renderSuggestions(q.text, q.excluded);
      }, 200);
    });

    input.addEventListener("keydown", function (e) {
      if ((e.key === " " || e.key === "Spacebar") && opts.commitTagOnSpace !== false) {
        if (input.value.trim()) {
          var spaceQuery;
          if (!suggestOpen()) {
            wrap.removeAttribute("data-suggest-dismissed");
            spaceQuery = parseQuery();
            renderSuggestions(spaceQuery.text, spaceQuery.excluded);
          }
          if (tryCommitTag()) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
        return;
      }

      if (e.key === "Tab" && opts.commitTagOnTab && !e.shiftKey) {
        if (tryCommitTag()) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (!suggestOpen()) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.key === "ArrowRight") {
          activeIndex = (activeIndex + 1) % suggestions.length;
        } else {
          activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
        }
        highlightActive();
        return;
      }

      if (e.key === "Enter") {
        // Desktop Hacklas: Enter opens a note. Mobile keyboards only
        // expose Enter/Go, so commit a tag instead of following a result.
        var mobileCommit = opts.commitTagOnEnter !== false || !isDesktopSearch();
        if (mobileCommit && tryCommitTag()) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (mobileCommit && input.value.trim()) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (opts.commitTitleOnEnter !== false) {
          e.preventDefault();
          commitTitleQuery();
        }
        return;
      }

      if (e.key === "Escape") {
        if (suggestOpen()) {
          e.preventDefault();
          e.stopPropagation();
          wrap.setAttribute("data-suggest-dismissed", "1");
          closeSuggest();
        }
        return;
      }

      if (e.key === "Backspace" && isInputEmpty()) {
        if (filter.removeLast()) {
          e.preventDefault();
          e.stopPropagation();
          renderChips();
          filter.apply();
        }
      }
    }, true);

    if (filter.selected.length) renderChips();

    return { element: wrap, closeSuggest: closeSuggest };
  }

  function tagNames(filter) {
    return filter._names("tag", false);
  }

  // Create search + sort above a [data-sortable-list].
  function mountList(list) {
    if (!list || list.dataset.listingReady === "1") return;
    list.dataset.listingReady = "1";

    var filter = new Filter(list);

    var tools = Dom.el("div", "list-tools");
    tools.appendChild(createTagSearch(TagData.buildIndex(list), filter, {
      commitTagOnSpace: true
    }).element);
    tools.appendChild(createSortControls(list, filter).element);
    list.parentNode.insertBefore(tools, list);
  }

  // Attach chips + autocomplete to an existing input. opts.onApply(query, tags)
  // is called whenever the filter changes; the caller decides what that means.
  function mountField(opts) {
    opts = opts || {};
    var list = opts.list;
    var input = opts.input;
    if (!list || !input) return;
    if (input.getAttribute("data-tag-search-mounted") === "1") return;
    input.setAttribute("data-tag-search-mounted", "1");

    var filter = new Filter(list);
    if (typeof opts.onApply === "function") {
      filter.apply = function () {
        opts.onApply(input.value, tagNames(this));
      };
    }

    (opts.initialTags || []).forEach(function (name) {
      filter.add(name, "tag", false);
    });

    var wrap = Dom.el("div", "tag-search");
    input.parentNode.insertBefore(wrap, input);
    createTagSearch(TagData.buildIndex(list), filter, {
      input: input,
      mount: wrap,
      listboxId: opts.listboxId,
      placeholder: opts.placeholder,
      fieldClass: opts.fieldClass,
      commitTagOnSpace: opts.commitTagOnSpace,
      commitTagOnTab: opts.commitTagOnTab,
      commitTagOnEnter: opts.commitTagOnEnter,
      commitTitleOnEnter: opts.commitTitleOnEnter,
      onInput: function () {
        filter.apply();
      }
    });
    filter.apply();
  }

  function hydrate() {
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-sortable-list]"),
      mountList
    );
  }

  document.addEventListener("click", function (e) {
    if (isDesktopSearch()) return;
    Array.prototype.forEach.call(document.querySelectorAll(".tag-search"), function (search) {
      var suggest;
      var input;
      if (search.contains(e.target)) return;
      search.setAttribute("data-suggest-dismissed", "1");
      suggest = search.querySelector(".tag-search__suggest");
      input = search.querySelector(".tag-search__input");
      if (suggest) suggest.hidden = true;
      if (input) input.setAttribute("aria-expanded", "false");
    });
  });

  window.booruSearch = { hydrate: hydrate, mountList: mountList, mountField: mountField };
  window.hydrateListing = hydrate;
  hydrate();
})();

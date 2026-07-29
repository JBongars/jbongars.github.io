/* Progressive enhancement: listing sort + booru-style tag/title search.
   Hydrated only when [data-sortable-list] is present. Safe without this file. */
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
  // Tag search component — input, autocomplete dropdown, and chips
  // ---------------------------------------------------------------------
  function createTagSearch(tagIndex, filter) {
    var debounceTimer = null;
    var activeIndex = -1;
    var suggestions = [];

    var field = Dom.el("div", "tag-search__field");
    var input = Dom.el("input", "tag-search__input", {
      type: "text",
      placeholder: "Filter by tag…",
      autocomplete: "off",
      spellcheck: "false",
      "aria-autocomplete": "list",
      "aria-expanded": "false",
      "aria-controls": "tag-search-listbox"
    });
    var dropdown = Dom.el("ul", "tag-search__dropdown", {
      id: "tag-search-listbox",
      role: "listbox"
    });
    dropdown.hidden = true;

    field.appendChild(input);
    field.appendChild(dropdown);

    field.addEventListener("click", function (e) {
      if (e.target === field) input.focus();
    });

    // -- chips -----------------------------------------------------------

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
      chip.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        onRemove();
      });
      return chip;
    }

    function renderChips() {
      Array.prototype.slice.call(field.querySelectorAll(".tag-chip")).forEach(function (el) {
        el.remove();
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

    // -- dropdown ----------------------------------------------------------

    function closeDropdown() {
      dropdown.hidden = true;
      dropdown.textContent = "";
      suggestions = [];
      activeIndex = -1;
      input.setAttribute("aria-expanded", "false");
    }

    function highlightActive() {
      var rows = dropdown.querySelectorAll(".tag-search__option");
      Array.prototype.forEach.call(rows, function (row, i) {
        var on = i === activeIndex;
        row.classList.toggle("is-active", on);
        row.setAttribute("aria-selected", on ? "true" : "false");
      });
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
      li.addEventListener("mousedown", function (e) {
        e.preventDefault();
        commitTagSuggestion(tag, excluded);
      });

      return li;
    }

    function renderSuggestions(query, excluded) {
      var q = query.toLowerCase();
      suggestions = tagIndex
        .filter(function (tag) {
          return !filter.has(tag.name) && tag.name.toLowerCase().indexOf(q) === 0;
        })
        .sort(function (a, b) { return b.count - a.count; })
        .slice(0, 10);

      dropdown.textContent = "";
      if (!q || !suggestions.length) {
        closeDropdown();
        return;
      }

      suggestions.forEach(function (tag, i) {
        dropdown.appendChild(buildOption(tag, i, excluded));
      });

      activeIndex = 0;
      highlightActive();
      dropdown.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    // -- committing input ---------------------------------------------------

    function commitTagSuggestion(tag, excluded) {
      if (tag && filter.add(tag.name, "tag", excluded)) {
        renderChips();
        filter.apply();
      }
      input.value = "";
      closeDropdown();
    }

    function commitTitleQuery() {
      var raw = input.value.trim();
      if (!raw) return;
      var excluded = raw.charAt(0) === "-";
      var name = excluded ? raw.slice(1).trim() : raw;

      input.value = "";
      closeDropdown();

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

    // -- events ---------------------------------------------------------

    input.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        var q = parseQuery();
        renderSuggestions(q.text, q.excluded);
      }, 200);
    });

    input.addEventListener("keydown", function (e) {
      if (dropdown.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        var q = parseQuery();
        renderSuggestions(q.text, q.excluded);
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!suggestions.length) return;
        activeIndex = (activeIndex + 1) % suggestions.length;
        highlightActive();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!suggestions.length) return;
        activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
        highlightActive();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (!dropdown.hidden && activeIndex >= 0 && suggestions[activeIndex]) {
          commitTagSuggestion(suggestions[activeIndex], parseQuery().excluded);
        } else {
          commitTitleQuery();
        }
      } else if (e.key === "Escape") {
        if (!dropdown.hidden) {
          e.preventDefault();
          closeDropdown();
        }
      } else if (e.key === "Backspace" && isInputEmpty()) {
        if (filter.removeLast()) {
          e.preventDefault();
          renderChips();
          filter.apply();
        }
      }
    });

    return { element: field, closeDropdown: closeDropdown };
  }

  // ---------------------------------------------------------------------
  // Wiring — build the widget and attach it above the list
  // ---------------------------------------------------------------------
  function hydrateListing() {
    var list = document.querySelector("[data-sortable-list]");
    if (!list || list.dataset.listingReady) return;
    list.dataset.listingReady = "1";

    var filter = new Filter(list);
    var tagIndex = TagData.buildIndex(list);

    var searchWrap = Dom.el("div", "tag-search");
    var search = createTagSearch(tagIndex, filter);
    searchWrap.appendChild(search.element);

    var sortControls = createSortControls(list, filter);

    var tools = Dom.el("div", "list-tools");
    tools.appendChild(searchWrap);
    tools.appendChild(sortControls.element);
    list.parentNode.insertBefore(tools, list);
  }

  document.addEventListener("click", function (e) {
    var search = document.querySelector(".tag-search");
    if (!search || search.contains(e.target)) return;
    var dropdown = search.querySelector(".tag-search__dropdown");
    var input = search.querySelector(".tag-search__input");
    if (dropdown) {
      dropdown.hidden = true;
      dropdown.textContent = "";
    }
    if (input) input.setAttribute("aria-expanded", "false");
  });

  window.hydrateListing = hydrateListing;
  hydrateListing();
})();

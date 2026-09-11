/* Progressive enhancement: tag chips, autocomplete, and listing sort.
   Public methods: booruSearch.mountList(list), booruSearch.mountField(opts).
   The page controller decides when to call them. Safe without this file. */
(function enhanceBooruSearch() {
  "use strict";

  // ---------------------------------------------------------------------
  // Tag swatch colors
  // ---------------------------------------------------------------------
  // Each tag in the dropdown gets a small color swatch purely so the list
  // is easier to scan. We have no way of knowing whether a tag is really
  // an artist/character/copyright tag, so this is NOT a taxonomy — it's a
  // deterministic hash of the tag's characters into one of a few arbitrary
  // colors. Same tag always gets the same color; that's the only promise.
  const TAG_SWATCH_COLORS = ["blue", "green", "purple", "orange", "pink"];

  function swatchColorForTag(tag) {
    let hash = 0;
    for (let index = 0; index < tag.length; index++) {
      hash = (hash + tag.codePointAt(index) * (index + 1)) % 997;
    }
    return TAG_SWATCH_COLORS[hash % TAG_SWATCH_COLORS.length];
  }

  // ---------------------------------------------------------------------
  // Data helpers — reading tag data off the DOM
  // ---------------------------------------------------------------------
  const TagData = {
    tagsFor(element) {
      const raw = element.dataset.tags || "";
      if (!raw) {
        return [];
      }
      const tags = [];
      for (const part of raw.split(",")) {
        const tag = part.trim();
        if (tag) {
          tags.push(tag);
        }
      }
      return tags;
    },

    formatCount(n) {
      if (n < 1000) {
        return String(n);
      }
      const k = n / 1000;
      return (Math.round(k * 10) / 10).toString().replace(/\.0$/, "") + "k";
    },

    buildIndex(list) {
      const counts = {};
      for (const item of list.children) {
        for (const tag of TagData.tagsFor(item)) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
      const index = [];
      for (const [name, count] of Object.entries(counts)) {
        index.push({
          name,
          count,
          color: swatchColorForTag(name),
        });
      }
      return index;
    },
  };

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .trim();
  }

  // Same subsequence window idea as fuzzy-find.js (that file is not on
  // listing-only pages, so this copy lives here).
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
    return Math.round(
      40 * (q.length / (last - first + 1)) + 15 * (1 / (1 + first)) + 15 * (bestRun / q.length),
    );
  }

  function rankTags(tagIndex, filter, query) {
    const q = normalize(query);
    const scored = [];
    if (!q) {
      return scored;
    }
    for (const tag of tagIndex) {
      if (filter.has(tag.name)) {
        continue;
      }
      const score = fuzzyScore(tag.name, q);
      if (score < 0) {
        continue;
      }
      scored.push({ tag, score });
    }
    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.tag.count - a.tag.count;
    });
    return Array.from(scored.slice(0, 10), (row) => row.tag);
  }

  function isDesktopSearch() {
    return matchMedia("(min-width: 48rem)").matches;
  }

  // iOS retargets the click that follows pointerdown onto whatever is
  // under the finger after the suggestion row closes (usually a note).
  function swallowNextClick() {
    function swallow(event) {
      event.preventDefault();
      event.stopPropagation();
      cleanup();
    }
    function cleanup() {
      document.removeEventListener("click", swallow, true);
      clearTimeout(timeout);
    }
    document.addEventListener("click", swallow, { capture: true });
    const timeout = setTimeout(cleanup, 500);
  }

  // ---------------------------------------------------------------------
  // Sorting
  // ---------------------------------------------------------------------
  const Sort = {
    apply(list, mode, direction) {
      const items = [...list.children];
      items.sort(Sort.comparator(mode, direction));
      for (const item of items) {
        list.append(item);
      }
    },

    comparator(mode, direction) {
      const attribute = mode === "name" ? "data-title" : "data-date";
      return (a, b) => {
        const av = (a.getAttribute(attribute) || "").toLowerCase();
        const bv = (b.getAttribute(attribute) || "").toLowerCase();
        if (av < bv) {
          return -direction;
        }
        if (av > bv) {
          return direction;
        }
        return 0;
      };
    },
  };

  // ---------------------------------------------------------------------
  // Filtering — tracks selected tag/title chips and shows/hides items
  // ---------------------------------------------------------------------
  function createFilter(list) {
    const selected = [];

    function has(name) {
      const lower = name.toLowerCase();
      return selected.some((entry) => entry.name.toLowerCase() === lower);
    }

    function add(name, kind, excluded) {
      if (!name || has(name)) {
        return false;
      }
      selected.push({
        name,
        kind,
        excluded: !!excluded,
        color: swatchColorForTag(name),
      });
      return true;
    }

    function removeAt(index) {
      selected.splice(index, 1);
    }

    function removeLast() {
      if (selected.length === 0) {
        return false;
      }
      selected.pop();
      return true;
    }

    function names(kind, excluded) {
      const result = [];
      for (const entry of selected) {
        if (entry.kind === kind && !!entry.excluded === !!excluded) {
          result.push(entry.name.toLowerCase());
        }
      }
      return result;
    }

    function apply() {
      const tagInclude = names("tag", false);
      const tagExclude = names("tag", true);
      const titleInclude = names("title", false);
      const titleExclude = names("title", true);

      for (const item of list.children) {
        const tags = new Set();
        for (const tag of TagData.tagsFor(item)) {
          tags.add(tag.toLowerCase());
        }
        const title = (item.dataset.title || "").toLowerCase();
        const visible =
          tagInclude.every((tag) => tags.has(tag)) &&
          tagExclude.every((tag) => !tags.has(tag)) &&
          titleInclude.every((tag) => title.includes(tag)) &&
          titleExclude.every((tag) => !title.includes(tag));
        item.hidden = !visible;
      }
    }

    return { selected, has, add, removeAt, removeLast, names, apply };
  }

  // ---------------------------------------------------------------------
  // DOM builder — tiny helper so components below aren't full of
  // createElement/setAttribute boilerplate
  // ---------------------------------------------------------------------
  const Dom = {
    element(tag, className, attributes) {
      const node = document.createElement(tag);
      if (className) {
        node.className = className;
      }
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          node.setAttribute(key, value);
        }
      }
      return node;
    },
  };

  // ---------------------------------------------------------------------
  // Sort controls component — the "Date / Name" button pair
  // ---------------------------------------------------------------------
  function createSortControls(list, filter) {
    const state = { mode: "date", direction: -1 };

    const bar = Dom.element("div", "list-sort", {
      role: "group",
      "aria-label": "Sort posts",
    });

    function makeButton(mode, text) {
      const button = Dom.element("button", "list-sort__btn", { type: "button" });
      button.textContent = text;
      button.addEventListener("click", () => {
        if (state.mode === mode) {
          state.direction *= -1;
        } else {
          state.mode = mode;
          state.direction = mode === "date" ? -1 : 1;
        }
        sync();
      });
      return button;
    }

    const dateButton = makeButton("date", "Date");
    const nameButton = makeButton("name", "Name");
    bar.append(dateButton, nameButton);

    function sync() {
      dateButton.setAttribute("aria-pressed", state.mode === "date" ? "true" : "false");
      nameButton.setAttribute("aria-pressed", state.mode === "name" ? "true" : "false");

      dateButton.textContent =
        state.mode === "date" ? "Date " + (state.direction < 0 ? "↓" : "↑") : "Date";
      nameButton.textContent =
        state.mode === "name" ? "Name " + (state.direction > 0 ? "↑" : "↓") : "Name";

      Sort.apply(list, state.mode, state.direction);
      filter.apply();
    }

    sync();

    return { element: bar };
  }

  function chipClasses(entry) {
    return (
      "tag-chip tag-chip--" +
      (entry.color || swatchColorForTag(entry.name)) +
      (entry.excluded ? " tag-chip--exclude" : "") +
      (entry.kind === "title" ? " tag-chip--title" : "")
    );
  }

  function buildChip(entry, onRemove) {
    const chip = Dom.element("button", chipClasses(entry), { type: "button" });

    const kindLabel = entry.kind === "title" ? "title filter" : "tag";
    chip.setAttribute(
      "aria-label",
      (entry.excluded ? "Remove excluded " : "Remove ") + kindLabel + " " + entry.name,
    );

    const label = Dom.element("span", "tag-chip__label");
    label.textContent = (entry.excluded ? "-" : "") + entry.name;

    const x = Dom.element("span", "tag-chip__x", { "aria-hidden": "true" });
    x.textContent = "×";

    chip.append(label, x);
    let isRemoved = false;
    function removeChip(event) {
      event.preventDefault();
      event.stopPropagation();
      if (isRemoved) {
        return;
      }
      isRemoved = true;
      onRemove();
    }
    chip.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      removeChip(event);
    });
    chip.addEventListener("click", removeChip);
    return chip;
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
  function createTagSearch(tagIndex, filter, rawOptions) {
    const options = rawOptions ?? {};
    let debounceTimer;
    let activeIndex = -1;
    let suggestions = [];
    const listboxId = options.listboxId || "tag-search-listbox";
    const wrap = options.mount || Dom.element("div", "tag-search");

    const field = Dom.element("div", options.fieldClass || "tag-search__field");
    let input = options.input;
    if (input) {
      input.classList.add("tag-search__input");
      if (options.placeholder) {
        input.setAttribute("placeholder", options.placeholder);
      }
    } else {
      input = Dom.element("input", "tag-search__input", {
        type: "text",
        placeholder: options.placeholder || "Filter by tag…",
        autocomplete: "off",
        spellcheck: "false",
      });
    }
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", listboxId);

    const suggest = Dom.element("div", "tag-search__suggest");
    suggest.hidden = true;

    const closeButton = Dom.element("button", "tag-search__close", { type: "button" });
    closeButton.setAttribute("aria-label", "Close tag suggestions");
    closeButton.textContent = "×";

    const dropdown = Dom.element("ul", "tag-search__dropdown", {
      id: listboxId,
      role: "listbox",
    });

    suggest.append(closeButton, dropdown);
    wrap.append(field, suggest);
    field.append(input);

    field.addEventListener("click", (event) => {
      if (event.target === field) {
        input.focus();
      }
    });

    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      wrap.dataset.suggestDismissed = "1";
      closeSuggest();
      input.focus();
    });

    function renderChips() {
      for (const node of field.querySelectorAll(".tag-chip")) {
        node.remove();
      }

      let index = 0;
      for (const entry of filter.selected) {
        const chipIndex = index;
        const chip = buildChip(entry, () => {
          filter.removeAt(chipIndex);
          renderChips();
          filter.apply();
          input.focus();
        });
        input.before(chip);
        index += 1;
      }
    }

    function closeSuggest() {
      suggest.hidden = true;
      dropdown.textContent = "";
      suggestions = [];
      activeIndex = -1;
      input.setAttribute("aria-expanded", "false");
    }

    function isSuggestOpen() {
      return !suggest.hidden && suggestions.length > 0;
    }

    function highlightActive() {
      let index = 0;
      for (const row of dropdown.querySelectorAll(".tag-search__option")) {
        const isOn = index === activeIndex;
        row.classList.toggle("is-active", isOn);
        row.setAttribute("aria-selected", isOn ? "true" : "false");
        index += 1;
      }
    }

    function commitTagSuggestion(tag, excluded) {
      if (tag && filter.add(tag.name, "tag", excluded)) {
        renderChips();
        filter.apply();
      }
      input.value = "";
      closeSuggest();
      if (options.onInput) {
        options.onInput();
      }
    }

    function resolveTag(name) {
      const lower = String(name || "").toLowerCase();
      for (const tag of tagIndex) {
        if (tag.name.toLowerCase() === lower) {
          return tag;
        }
      }
    }

    function tryCommitTag() {
      const highlighted = suggestions.at(activeIndex);
      if (highlighted && activeIndex >= 0 && isSuggestOpen()) {
        commitTagSuggestion(highlighted, parseQuery().excluded);
        return true;
      }
      const exact = resolveTag(input.value.trim());
      if (exact) {
        commitTagSuggestion(exact, false);
        return true;
      }
      return false;
    }

    function buildOption(tag, index, excluded) {
      const item = Dom.element("li", "tag-search__option", {
        role: "option",
        "aria-selected": "false",
      });

      const swatch = Dom.element("span", "tag-search__cat tag-search__cat--" + tag.color, {
        "aria-hidden": "true",
      });

      const name = Dom.element("span", "tag-search__name");
      name.textContent = (excluded ? "-" : "") + tag.name;

      const count = Dom.element("span", "tag-search__count");
      count.textContent = TagData.formatCount(tag.count);

      item.append(swatch, name, count);

      item.addEventListener("mouseenter", () => {
        activeIndex = index;
        highlightActive();
      });
      // pointerdown (not mousedown): iOS blurs the field — and dismisses
      // this list — before mouse events fire on a tap. Swallow the click
      // that would otherwise land on the note under the overlay.
      item.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        swallowNextClick();
        commitTagSuggestion(tag, excluded);
      });
      item.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        commitTagSuggestion(tag, excluded);
      });

      return item;
    }

    function renderSuggestions(query, excluded) {
      if (wrap.dataset.suggestDismissed === "1") {
        closeSuggest();
        return;
      }

      suggestions = rankTags(tagIndex, filter, query);
      dropdown.textContent = "";
      if (!query || suggestions.length === 0) {
        closeSuggest();
        return;
      }

      let index = 0;
      for (const tag of suggestions) {
        dropdown.append(buildOption(tag, index, excluded));
        index += 1;
      }

      activeIndex = 0;
      highlightActive();
      suggest.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function commitTitleQuery() {
      const raw = input.value.trim();
      if (!raw) {
        return;
      }
      const isExcluded = raw.charAt(0) === "-";
      const name = isExcluded ? raw.slice(1).trim() : raw;

      input.value = "";
      closeSuggest();

      if (filter.add(name, "title", isExcluded)) {
        renderChips();
        filter.apply();
      }
    }

    function parseQuery() {
      const raw = input.value.trim();
      const isExcluded = raw.charAt(0) === "-";
      return { text: isExcluded ? raw.slice(1).trim() : raw, excluded: isExcluded };
    }

    function isInputEmpty() {
      return input.value === "" && input.selectionStart === 0 && input.selectionEnd === 0;
    }

    function handleSpaceCommit(event) {
      if (event.key !== " " && event.key !== "Spacebar") {
        return false;
      }
      if (options.commitTagOnSpace === false) {
        return false;
      }
      if (!input.value.trim()) {
        return true;
      }
      if (!isSuggestOpen()) {
        delete wrap.dataset.suggestDismissed;
        const spaceQuery = parseQuery();
        renderSuggestions(spaceQuery.text, spaceQuery.excluded);
      }
      if (tryCommitTag()) {
        event.preventDefault();
        event.stopPropagation();
      }
      return true;
    }

    function handleTabCommit(event) {
      if (event.key !== "Tab" || !options.commitTagOnTab || event.shiftKey) {
        return false;
      }
      if (tryCommitTag()) {
        event.preventDefault();
        event.stopPropagation();
      }
      return true;
    }

    function handleArrowHighlight(event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return false;
      }
      if (!isSuggestOpen()) {
        return true;
      }
      event.preventDefault();
      event.stopPropagation();
      const step = event.key === "ArrowRight" ? 1 : -1;
      activeIndex = (activeIndex + step + suggestions.length) % suggestions.length;
      highlightActive();
      return true;
    }

    function handleEnterCommit(event) {
      if (event.key !== "Enter") {
        return false;
      }
      // Desktop Hacklas: Enter opens a note. Mobile keyboards only
      // expose Enter/Go, so commit a tag instead of following a result.
      const isMobileCommit = options.commitTagOnEnter !== false || !isDesktopSearch();
      if (isMobileCommit && tryCommitTag()) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      if (isMobileCommit && input.value.trim()) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      if (options.commitTitleOnEnter !== false) {
        event.preventDefault();
        commitTitleQuery();
      }
      return true;
    }

    function handleEscapeSuggest(event) {
      if (event.key !== "Escape") {
        return false;
      }
      if (isSuggestOpen()) {
        event.preventDefault();
        event.stopPropagation();
        wrap.dataset.suggestDismissed = "1";
        closeSuggest();
      }
      return true;
    }

    function handleBackspaceChip(event) {
      if (event.key !== "Backspace" || !isInputEmpty() || !filter.removeLast()) {
        return false;
      }
      event.preventDefault();
      event.stopPropagation();
      renderChips();
      filter.apply();
      return true;
    }

    input.addEventListener("input", () => {
      delete wrap.dataset.suggestDismissed;
      if (options.onInput) {
        options.onInput();
      }
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const q = parseQuery();
        renderSuggestions(q.text, q.excluded);
      }, 200);
    });

    input.addEventListener(
      "keydown",
      (event) => {
        if (handleSpaceCommit(event) || handleTabCommit(event)) {
          return;
        }
        if (handleArrowHighlight(event) || handleEnterCommit(event)) {
          return;
        }
        if (handleEscapeSuggest(event)) {
          return;
        }
        handleBackspaceChip(event);
      },
      { capture: true },
    );

    if (filter.selected.length > 0) {
      renderChips();
    }

    return { element: wrap, closeSuggest };
  }

  function tagNames(filter) {
    return filter.names("tag", false);
  }

  // Create search + sort above a [data-sortable-list].
  function mountList(list) {
    if (!list || list.dataset.listingReady === "1") {
      return;
    }
    list.dataset.listingReady = "1";

    const filter = createFilter(list);

    const tools = Dom.element("div", "list-tools");
    tools.append(
      createTagSearch(TagData.buildIndex(list), filter, {
        commitTagOnSpace: true,
      }).element,
    );
    tools.append(createSortControls(list, filter).element);
    list.parentNode.insertBefore(tools, list);
  }

  // Attach chips + autocomplete to an existing input. opts.onApply(query, tags)
  // is called whenever the filter changes; the caller decides what that means.
  function mountField(rawOptions) {
    const options = rawOptions ?? {};
    const list = options.list;
    const input = options.input;
    if (!list || !input) {
      return;
    }
    if (input.dataset.tagSearchMounted === "1") {
      return;
    }
    input.dataset.tagSearchMounted = "1";

    const filter = createFilter(list);
    const onApply = options.onApply;
    if (typeof onApply === "function") {
      filter.apply = function applyMounted() {
        onApply(input.value, tagNames(filter));
      };
    }

    const initialTags = options.initialTags || [];
    for (const name of initialTags) {
      filter.add(name, "tag", false);
    }

    const wrap = Dom.element("div", "tag-search");
    input.parentNode.insertBefore(wrap, input);
    createTagSearch(TagData.buildIndex(list), filter, {
      input,
      mount: wrap,
      listboxId: options.listboxId,
      placeholder: options.placeholder,
      fieldClass: options.fieldClass,
      commitTagOnSpace: options.commitTagOnSpace,
      commitTagOnTab: options.commitTagOnTab,
      commitTagOnEnter: options.commitTagOnEnter,
      commitTitleOnEnter: options.commitTitleOnEnter,
      onInput() {
        filter.apply();
      },
    });
    filter.apply();
  }

  function hydrate() {
    for (const list of document.querySelectorAll("[data-sortable-list]")) {
      mountList(list);
    }
  }

  document.addEventListener("click", (event) => {
    if (isDesktopSearch()) {
      return;
    }
    for (const search of document.querySelectorAll(".tag-search")) {
      if (search.contains(event.target)) {
        continue;
      }
      search.dataset.suggestDismissed = "1";
      const suggest = search.querySelector(".tag-search__suggest");
      const input = search.querySelector(".tag-search__input");
      if (suggest) {
        suggest.hidden = true;
      }
      if (input) {
        input.setAttribute("aria-expanded", "false");
      }
    }
  });

  globalThis.booruSearch = { hydrate, mountList, mountField };
  globalThis.hydrateListing = hydrate;
  hydrate();
})();

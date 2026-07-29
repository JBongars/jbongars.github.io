/* Progressive enhancement: theme persistence + same-origin page swaps.
   Site works without this file. No page cache — browser HTTP cache only. */
(function () {
  var KEY = "theme";
  var CATS = ["general", "artist", "character", "copyright"];
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

  function itemTags(el) {
    var raw = el.getAttribute("data-tags") || "";
    if (!raw) return [];
    return raw.split(",").map(function (t) {
      return t.trim();
    }).filter(Boolean);
  }

  function categoryFor(tag) {
    var h = 0;
    for (var i = 0; i < tag.length; i++) h = (h + tag.charCodeAt(i) * (i + 1)) % 997;
    return CATS[h % CATS.length];
  }

  function formatCount(n) {
    if (n >= 1000) {
      var k = n / 1000;
      return (Math.round(k * 10) / 10).toString().replace(/\.0$/, "") + "k";
    }
    return String(n);
  }

  function buildTagIndex(list) {
    var counts = {};
    Array.prototype.forEach.call(list.children, function (li) {
      itemTags(li).forEach(function (tag) {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.keys(counts).map(function (name) {
      return {
        name: name,
        count: counts[name],
        category: categoryFor(name),
      };
    });
  }

  function sortList(list, mode, dir) {
    var items = Array.prototype.slice.call(list.children);
    items.sort(function (a, b) {
      var av;
      var bv;
      if (mode === "name") {
        av = (a.getAttribute("data-title") || "").toLowerCase();
        bv = (b.getAttribute("data-title") || "").toLowerCase();
        if (av < bv) return -dir;
        if (av > bv) return dir;
        return 0;
      }
      av = a.getAttribute("data-date") || "";
      bv = b.getAttribute("data-date") || "";
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
    items.forEach(function (item) {
      list.appendChild(item);
    });
  }

  function hydrateListing() {
    var list = document.querySelector("[data-sortable-list]");
    if (!list || list.dataset.listingReady) return;
    list.dataset.listingReady = "1";

    var sortState = { mode: "date", dir: -1 };
    var selected = [];
    var tagIndex = buildTagIndex(list);
    var debounceTimer = null;
    var activeIndex = -1;
    var suggestions = [];

    var tools = document.createElement("div");
    tools.className = "list-tools";

    /* —— tag search —— */
    var search = document.createElement("div");
    search.className = "tag-search";

    var fieldWrap = document.createElement("div");
    fieldWrap.className = "tag-search__field";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "tag-search__input";
    input.placeholder = "Filter by tag…";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", "tag-search-listbox");

    var dropdown = document.createElement("ul");
    dropdown.className = "tag-search__dropdown";
    dropdown.id = "tag-search-listbox";
    dropdown.setAttribute("role", "listbox");
    dropdown.hidden = true;

    fieldWrap.appendChild(input);
    fieldWrap.appendChild(dropdown);
    search.appendChild(fieldWrap);

    /* —— sort —— */
    var bar = document.createElement("div");
    bar.className = "list-sort";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Sort posts");

    function makeSortBtn(mode, label) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "list-sort__btn";
      btn.textContent = label;
      btn.addEventListener("click", function () {
        if (sortState.mode === mode) sortState.dir *= -1;
        else {
          sortState.mode = mode;
          sortState.dir = mode === "date" ? -1 : 1;
        }
        syncSort();
      });
      return btn;
    }

    var dateBtn = makeSortBtn("date", "Date");
    var nameBtn = makeSortBtn("name", "Name");
    bar.appendChild(dateBtn);
    bar.appendChild(nameBtn);

    tools.appendChild(search);
    tools.appendChild(bar);
    list.parentNode.insertBefore(tools, list);

    fieldWrap.addEventListener("click", function (e) {
      if (e.target === fieldWrap) input.focus();
    });

    function selectedNames(kind, excluded) {
      return selected
        .filter(function (t) {
          return t.kind === kind && !!t.excluded === !!excluded;
        })
        .map(function (t) { return t.name; });
    }

    function hasSelected(name) {
      var lower = name.toLowerCase();
      return selected.some(function (t) {
        return t.name.toLowerCase() === lower;
      });
    }

    function applyFilter() {
      var tagInclude = selectedNames("tag", false);
      var tagExclude = selectedNames("tag", true);
      var titleInclude = selectedNames("title", false);
      var titleExclude = selectedNames("title", true);

      Array.prototype.forEach.call(list.children, function (li) {
        var tags = itemTags(li).map(function (t) { return t.toLowerCase(); });
        var title = (li.getAttribute("data-title") || "").toLowerCase();
        var ok = tagInclude.every(function (t) {
          return tags.indexOf(t.toLowerCase()) !== -1;
        });
        if (ok) {
          ok = tagExclude.every(function (t) {
            return tags.indexOf(t.toLowerCase()) === -1;
          });
        }
        if (ok) {
          ok = titleInclude.every(function (t) {
            return title.indexOf(t.toLowerCase()) !== -1;
          });
        }
        if (ok) {
          ok = titleExclude.every(function (t) {
            return title.indexOf(t.toLowerCase()) === -1;
          });
        }
        li.hidden = !ok;
      });
    }

    function renderChips() {
      Array.prototype.slice
        .call(fieldWrap.querySelectorAll(".tag-chip"))
        .forEach(function (el) { el.remove(); });

      selected.forEach(function (entry, index) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className =
          "tag-chip" +
          (entry.excluded ? " tag-chip--exclude" : "") +
          (entry.kind === "title" ? " tag-chip--title" : "");
        var kindLabel = entry.kind === "title" ? "title filter" : "tag";
        chip.setAttribute(
          "aria-label",
          (entry.excluded ? "Remove excluded " : "Remove ") + kindLabel + " " + entry.name
        );
        var label = document.createElement("span");
        label.className = "tag-chip__label";
        label.textContent = (entry.excluded ? "-" : "") + entry.name;
        var x = document.createElement("span");
        x.className = "tag-chip__x";
        x.setAttribute("aria-hidden", "true");
        x.textContent = "×";
        chip.appendChild(label);
        chip.appendChild(x);
        chip.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          selected.splice(index, 1);
          renderChips();
          applyFilter();
          input.focus();
        });
        fieldWrap.insertBefore(chip, input);
      });
    }

    function removeLastTag() {
      if (!selected.length) return false;
      selected.pop();
      renderChips();
      applyFilter();
      return true;
    }

    function closeDropdown() {
      dropdown.hidden = true;
      dropdown.textContent = "";
      suggestions = [];
      activeIndex = -1;
      input.setAttribute("aria-expanded", "false");
    }

    function highlightRow() {
      var rows = dropdown.querySelectorAll(".tag-search__option");
      Array.prototype.forEach.call(rows, function (row, i) {
        var on = i === activeIndex;
        row.classList.toggle("is-active", on);
        row.setAttribute("aria-selected", on ? "true" : "false");
      });
    }

    function selectSuggestion(tag, excluded) {
      if (!tag || hasSelected(tag.name)) {
        closeDropdown();
        input.value = "";
        return;
      }
      selected.push({ name: tag.name, excluded: !!excluded, kind: "tag" });
      input.value = "";
      closeDropdown();
      renderChips();
      applyFilter();
    }

    function commitTitleQuery() {
      var raw = input.value.trim();
      if (!raw) return false;
      var excluded = raw.charAt(0) === "-";
      var name = excluded ? raw.slice(1).trim() : raw;
      if (!name || hasSelected(name)) {
        input.value = "";
        closeDropdown();
        return false;
      }
      selected.push({ name: name, excluded: excluded, kind: "title" });
      input.value = "";
      closeDropdown();
      renderChips();
      applyFilter();
      return true;
    }

    function renderDropdown(query, excluded) {
      var q = query.toLowerCase();
      suggestions = tagIndex
        .filter(function (tag) {
          if (hasSelected(tag.name)) return false;
          return tag.name.toLowerCase().indexOf(q) === 0;
        })
        .sort(function (a, b) { return b.count - a.count; })
        .slice(0, 10);

      dropdown.textContent = "";
      if (!q || !suggestions.length) {
        closeDropdown();
        return;
      }

      suggestions.forEach(function (tag, i) {
        var li = document.createElement("li");
        li.className = "tag-search__option";
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", "false");

        var swatch = document.createElement("span");
        swatch.className = "tag-search__cat tag-search__cat--" + tag.category;
        swatch.title = tag.category;
        swatch.setAttribute("aria-hidden", "true");

        var name = document.createElement("span");
        name.className = "tag-search__name";
        name.textContent = (excluded ? "-" : "") + tag.name;

        var count = document.createElement("span");
        count.className = "tag-search__count";
        count.textContent = formatCount(tag.count);

        li.appendChild(swatch);
        li.appendChild(name);
        li.appendChild(count);

        li.addEventListener("mouseenter", function () {
          activeIndex = i;
          highlightRow();
        });
        li.addEventListener("mousedown", function (e) {
          e.preventDefault();
          selectSuggestion(tag, excluded);
        });

        dropdown.appendChild(li);
      });

      activeIndex = 0;
      highlightRow();
      dropdown.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function onQuery() {
      var raw = input.value.trim();
      var excluded = raw.charAt(0) === "-";
      var query = excluded ? raw.slice(1).trim() : raw;
      renderDropdown(query, excluded);
    }

    function isInputEmpty() {
      return input.value === "" && input.selectionStart === 0 && input.selectionEnd === 0;
    }

    input.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(onQuery, 200);
    });

    input.addEventListener("keydown", function (e) {
      if (dropdown.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        onQuery();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!suggestions.length) return;
        activeIndex = (activeIndex + 1) % suggestions.length;
        highlightRow();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!suggestions.length) return;
        activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
        highlightRow();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (!dropdown.hidden && activeIndex >= 0 && suggestions[activeIndex]) {
          var raw = input.value.trim();
          selectSuggestion(suggestions[activeIndex], raw.charAt(0) === "-");
        } else {
          commitTitleQuery();
        }
      } else if (e.key === "Escape") {
        if (!dropdown.hidden) {
          e.preventDefault();
          closeDropdown();
        }
      } else if (e.key === "Backspace" && isInputEmpty()) {
        if (removeLastTag()) e.preventDefault();
      }
    });

    function syncSort() {
      dateBtn.setAttribute("aria-pressed", sortState.mode === "date" ? "true" : "false");
      nameBtn.setAttribute("aria-pressed", sortState.mode === "name" ? "true" : "false");
      dateBtn.textContent =
        sortState.mode === "date" ? (sortState.dir < 0 ? "Date ↓" : "Date ↑") : "Date";
      nameBtn.textContent =
        sortState.mode === "name" ? (sortState.dir > 0 ? "Name ↑" : "Name ↓") : "Name";
      sortList(list, sortState.mode, sortState.dir);
      applyFilter();
    }

    syncSort();
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
        hydrateListing();
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

  hydrateListing();
})();

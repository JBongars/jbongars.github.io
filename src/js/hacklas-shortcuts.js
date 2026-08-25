/* Progressive enhancement: Hacklas keyboard shortcuts.
   Site works without this file. */
(function () {
  "use strict";

  function sitePath() {
    var prefix = document.documentElement.getAttribute("data-path-prefix") || "/";
    var prefixTrim = prefix.replace(/\/$/, "");
    var rest = location.pathname || "/";
    if (prefixTrim && rest.indexOf(prefixTrim) === 0) {
      rest = rest.slice(prefixTrim.length) || "/";
    }
    if (rest.charAt(0) !== "/") rest = "/" + rest;
    return rest.replace(/\/+$/, "") || "/";
  }

  function isHacklasIndex() {
    return sitePath() === "/hacklas";
  }

  function isHacklasNote() {
    var p = sitePath();
    return p.indexOf("/hacklas/") === 0;
  }

  function isTextField(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (el.isContentEditable) return true;
    var tag = (el.tagName || "").toLowerCase();
    if (tag === "textarea" || tag === "select") return true;
    if (tag !== "input") return false;
    var type = (el.getAttribute("type") || "text").toLowerCase();
    if (type === "checkbox" || type === "radio" || type === "button" || type === "submit" || type === "reset" || type === "file" || type === "hidden" || type === "range" || type === "color" || type === "image") {
      return false;
    }
    return true;
  }

  function overlayOpen() {
    var help = document.querySelector("[data-shortcuts-modal]");
    if (help && !help.hidden) return true;
    var disc = document.querySelector("[data-hacklas-disclaimer]");
    if (disc && !disc.hidden) return true;
    return false;
  }

  function hacklasHref() {
    return typeof window.siteUrl === "function"
      ? window.siteUrl("/hacklas/")
      : "/hacklas/";
  }

  function goToHacklas() {
    var href = hacklasHref();
    var links = document.querySelectorAll(".nav-list a[href]");
    for (var i = 0; i < links.length; i++) {
      try {
        var u = new URL(links[i].href, location.href);
        var target = new URL(href, location.href);
        if (u.pathname.replace(/\/$/, "") === target.pathname.replace(/\/$/, "")) {
          links[i].click();
          return;
        }
      } catch (_) {}
    }
    location.assign(href);
  }

  function typeIntoSearch(ch) {
    var input = document.querySelector("[data-fuzzy-find] .fuzzy-find__input");
    if (!input) return false;
    input.focus();
    input.value = String(input.value || "") + ch;
    if (typeof input.setSelectionRange === "function") {
      var len = input.value.length;
      input.setSelectionRange(len, len);
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  function openFirstResult() {
    var list = document.querySelector("[data-fuzzy-list]");
    if (!list) return false;
    var active = list.querySelector("li.is-active");
    var item = active && active.style.display !== "none" ? active : null;
    if (!item) {
      var items = list.children;
      for (var i = 0; i < items.length; i++) {
        if (items[i].style.display === "none") continue;
        item = items[i];
        break;
      }
    }
    var link = item && item.querySelector("a[href]");
    if (!link) return false;
    link.click();
    return true;
  }

  function goBackFromNote() {
    var link = document.querySelector("a[data-back]");
    if (link) {
      link.click();
      return;
    }
    history.back();
  }

  function isActivateKey(el) {
    var tag = (el && el.tagName ? el.tagName : "").toLowerCase();
    return tag === "a" || tag === "button" || tag === "summary";
  }

  document.addEventListener(
    "keydown",
    function (e) {
      if (e.defaultPrevented || e.isComposing) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (overlayOpen()) return;
      if (isTextField(document.activeElement)) return;

      if (e.key === "Enter") {
        if (isActivateKey(document.activeElement)) return;
        if (!isHacklasIndex()) return;
        if (openFirstResult()) e.preventDefault();
        return;
      }

      if (e.key === "Backspace") {
        if (e.repeat) return;
        if (!isHacklasNote()) return;
        e.preventDefault();
        goBackFromNote();
        return;
      }

      if (!e.key || e.key.length !== 1) return;

      if (!isHacklasIndex() && (e.key === "h" || e.key === "H")) {
        if (e.repeat) return;
        e.preventDefault();
        goToHacklas();
        return;
      }

      if (isHacklasIndex()) {
        e.preventDefault();
        typeIntoSearch(e.key);
      }
    },
    true
  );
})();

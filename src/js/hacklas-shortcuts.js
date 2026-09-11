/* Progressive enhancement: Hacklas keyboard shortcuts.
   Site works without this file. */
(function enhanceHacklasShortcuts() {
  "use strict";

  const NON_TEXT_INPUT_TYPES = new Set([
    "checkbox",
    "radio",
    "button",
    "submit",
    "reset",
    "file",
    "hidden",
    "range",
    "color",
    "image",
  ]);

  function sitePath() {
    const prefix = document.documentElement.dataset.pathPrefix || "/";
    const prefixTrim = prefix.replace(/\/$/, "");
    let rest = location.pathname || "/";
    if (prefixTrim && rest.indexOf(prefixTrim) === 0) {
      rest = rest.slice(prefixTrim.length) || "/";
    }
    if (rest.charAt(0) !== "/") {
      rest = "/" + rest;
    }
    return rest.replace(/\/+$/, "") || "/";
  }

  function isHacklasIndex() {
    return sitePath() === "/hacklas";
  }

  function isHacklasNote() {
    return sitePath().indexOf("/hacklas/") === 0;
  }

  function isTextField(element) {
    if (!element || element === document.body || element === document.documentElement) {
      return false;
    }
    if (element.isContentEditable) {
      return true;
    }
    const tag = (element.tagName || "").toLowerCase();
    if (tag === "textarea" || tag === "select") {
      return true;
    }
    if (tag !== "input") {
      return false;
    }
    const type = (element.getAttribute("type") || "text").toLowerCase();
    return !NON_TEXT_INPUT_TYPES.has(type);
  }

  function isSearchUi(element) {
    if (!element?.closest) {
      return false;
    }
    return !!(element.closest(".tag-search") || element.closest("[data-fuzzy-find]"));
  }

  function overlayOpen() {
    const help = document.querySelector("[data-shortcuts-modal]");
    if (help && !help.hidden) {
      return true;
    }
    const disclaimer = document.querySelector("[data-hacklas-disclaimer]");
    return Boolean(disclaimer && !disclaimer.hidden);
  }

  function hacklasHref() {
    return typeof globalThis.siteUrl === "function" ? globalThis.siteUrl("/hacklas/") : "/hacklas/";
  }

  function goToHacklas() {
    const href = hacklasHref();
    const links = document.querySelectorAll(".nav-list a[href]");
    for (const link of links) {
      try {
        const url = new URL(link.href, location.href);
        const target = new URL(href, location.href);
        if (url.pathname.replace(/\/$/, "") === target.pathname.replace(/\/$/, "")) {
          link.click();
          return;
        }
      } catch {
        // Ignore malformed hrefs.
      }
    }
    location.assign(href);
  }

  function typeIntoSearch(character) {
    const input = document.querySelector("[data-fuzzy-find] .fuzzy-find__input");
    if (!input) {
      return false;
    }
    input.focus();
    input.value = String(input.value || "") + character;
    if (typeof input.setSelectionRange === "function") {
      const length_ = input.value.length;
      input.setSelectionRange(length_, length_);
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  function firstVisibleItem(list) {
    const active = list.querySelector("li.is-active");
    if (active && active.style.display !== "none") {
      return active;
    }
    for (const item of list.children) {
      if (item.style.display !== "none") {
        return item;
      }
    }
  }

  function openFirstResult() {
    const list = document.querySelector("[data-fuzzy-list]");
    if (!list) {
      return false;
    }
    const link = firstVisibleItem(list)?.querySelector("a[href]");
    if (!link) {
      return false;
    }
    link.click();
    return true;
  }

  function goBackFromNote() {
    const link = document.querySelector("a[data-back]");
    if (link) {
      link.click();
      return;
    }
    history.back();
  }

  function isActivateKey(element) {
    const tag = (element?.tagName || "").toLowerCase();
    return ["a", "button", "summary"].includes(tag);
  }

  function shouldIgnoreShortcut(event) {
    if (event.defaultPrevented || event.isComposing) {
      return true;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return true;
    }
    if (overlayOpen()) {
      return true;
    }
    return isTextField(document.activeElement) || isSearchUi(document.activeElement);
  }

  function handleEnter(event) {
    if (event.key !== "Enter") {
      return false;
    }
    if (isActivateKey(document.activeElement) || !isHacklasIndex()) {
      return true;
    }
    if (openFirstResult()) {
      event.preventDefault();
    }
    return true;
  }

  function handleBackspace(event) {
    if (event.key !== "Backspace") {
      return false;
    }
    if (event.repeat || !isHacklasNote()) {
      return true;
    }
    event.preventDefault();
    goBackFromNote();
    return true;
  }

  function handleHacklasKey(event) {
    if (isHacklasIndex() || (event.key !== "h" && event.key !== "H")) {
      return false;
    }
    if (event.repeat) {
      return true;
    }
    event.preventDefault();
    goToHacklas();
    return true;
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (shouldIgnoreShortcut(event)) {
        return;
      }
      if (handleEnter(event) || handleBackspace(event)) {
        return;
      }
      if (!event.key || event.key.length !== 1) {
        return;
      }
      if (handleHacklasKey(event)) {
        return;
      }
      if (isHacklasIndex()) {
        event.preventDefault();
        typeIntoSearch(event.key);
      }
    },
    { capture: true },
  );
})();

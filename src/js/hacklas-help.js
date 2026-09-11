/* Progressive enhancement: desktop Hacklas shortcuts help.
   Button and dialog are created in JS and hidden below the desktop nav breakpoint.
   Site works without this file. */
(function enhanceHacklasHelp() {
  "use strict";

  const DESKTOP = "(min-width: 48rem)";
  const TITLE_ID = "shortcuts-modal-title";
  let lastFocus;

  const ROWS = [
    { keys: ["h"], desc: "Go to Hacklas" },
    { keys: ["Type"], desc: "Search notes on the Hacklas index" },
    { keys: ["Space"], desc: "Add the matching tag as a filter" },
    { keys: ["Tab"], desc: "Add the highlighted tag as a filter" },
    { keys: ["Left", "Right"], desc: "Highlight a matching tag" },
    { keys: ["Up", "Down"], desc: "Highlight a note" },
    { keys: ["Enter"], desc: "Open the highlighted note" },
    { keys: ["Backspace"], desc: "Go back from a note" },
  ];

  function isDesktop() {
    return matchMedia(DESKTOP).matches;
  }

  function element(tag, className) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    return node;
  }

  function onHacklas() {
    const path = location.pathname.replace(/\/$/, "");
    return path.slice(-8) === "/hacklas" || path.includes("/hacklas/");
  }

  function unmount() {
    const button = document.querySelector(".shortcuts-help");
    const modal = getModal();
    if (button) {
      button.remove();
    }
    if (modal) {
      modal.remove();
    }
    document.documentElement.classList.remove("shortcuts-open");
  }

  function hacklasNavItem() {
    const links = document.querySelectorAll(".nav-list a[href]");
    for (const link of links) {
      try {
        const url = new URL(link.href, location.href);
        const path = url.pathname.replace(/\/$/, "");
        if (path.slice(-8) === "/hacklas") {
          return link.closest("li");
        }
      } catch {
        // Ignore malformed hrefs.
      }
    }
  }

  function disclaimerOpen() {
    if (document.documentElement.classList.contains("disclaimer-open")) {
      return true;
    }
    return !!document.querySelector("[data-hacklas-disclaimer]:not([hidden])");
  }

  function getModal() {
    return document.querySelector("[data-shortcuts-modal]");
  }

  function isOpen() {
    const modal = getModal();
    return !!(modal && !modal.hidden);
  }

  function focusSafely(node) {
    if (node && typeof node.focus === "function") {
      try {
        node.focus();
      } catch {
        // focus() can throw if the node is not focusable.
      }
    }
  }

  function setOpen(open) {
    const modal = ensureModal();
    modal.hidden = !open;
    document.documentElement.classList.toggle("shortcuts-open", !!open);
    if (open) {
      lastFocus = document.activeElement;
      focusSafely(modal.querySelector("button[data-shortcuts-close]"));
      return;
    }
    focusSafely(lastFocus);
    lastFocus = undefined;
  }

  function close() {
    setOpen(false);
  }

  function open() {
    if (!isDesktop() || disclaimerOpen()) {
      return;
    }
    setOpen(true);
  }

  function toggle() {
    if (isOpen()) {
      close();
    } else {
      open();
    }
  }

  function appendShortcutRows(list) {
    for (const shortcut of ROWS) {
      const row = element("li", "shortcuts-modal__row");
      const keys = element("span", "shortcuts-modal__keys");
      for (const key of shortcut.keys) {
        const kbd = document.createElement("kbd");
        kbd.textContent = key;
        keys.append(kbd);
      }
      const desc = element("p", "shortcuts-modal__desc");
      desc.textContent = shortcut.desc;
      row.append(keys, desc);
      list.append(row);
    }
  }

  function ensureModal() {
    const existing = getModal();
    if (existing) {
      return existing;
    }

    const modal = element("div", "shortcuts-modal");
    modal.dataset.shortcutsModal = "";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", TITLE_ID);
    modal.hidden = true;

    const backdrop = element("div", "shortcuts-modal__backdrop");
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.dataset.shortcutsClose = "";

    const panel = element("div", "shortcuts-modal__panel");

    const title = element("h2", "shortcuts-modal__title");
    title.id = TITLE_ID;
    title.textContent = "Keyboard shortcuts";

    const list = element("ul", "shortcuts-modal__list");
    appendShortcutRows(list);

    const closeButton = element("button", "shortcuts-modal__close");
    closeButton.type = "button";
    closeButton.dataset.shortcutsClose = "";
    closeButton.textContent = "Close";

    panel.append(title, list, closeButton);
    modal.append(backdrop, panel);
    document.body.append(modal);
    return modal;
  }

  function mountButton() {
    const navItem = hacklasNavItem();
    if (!navItem?.parentNode) {
      return;
    }

    const existing = navItem.parentNode.querySelector(".shortcuts-help");
    if (existing) {
      existing.remove();
    }

    const item = element("li", "shortcuts-help");
    const button = element("button", "shortcuts-help__btn");
    button.type = "button";
    button.setAttribute("aria-label", "Hacklas keyboard shortcuts");
    button.dataset.shortcutsHelp = "";
    button.textContent = "?";
    item.append(button);
    navItem.parentNode.insertBefore(item, navItem.nextSibling);
  }

  function hydrate() {
    if (!onHacklas()) {
      unmount();
      return;
    }
    ensureModal();
    mountButton();
  }

  document.addEventListener("click", (event) => {
    const help = event.target.closest?.("[data-shortcuts-help]");
    if (help) {
      event.preventDefault();
      toggle();
      return;
    }
    const closer = event.target.closest?.("[data-shortcuts-close]");
    if (closer && getModal()?.contains(closer)) {
      event.preventDefault();
      close();
    }
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape" || !isOpen()) {
        return;
      }
      event.preventDefault();
      close();
    },
    { capture: true },
  );

  const media = matchMedia(DESKTOP);
  function onBreakpoint(event) {
    if (!event.matches) {
      close();
    }
  }
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", onBreakpoint);
  } else if (typeof media.addListener === "function") {
    media.addListener(onBreakpoint);
  }

  globalThis.hydrateHacklasHelp = hydrate;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrate);
  } else {
    hydrate();
  }
})();

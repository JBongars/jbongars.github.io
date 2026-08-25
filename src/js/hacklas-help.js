/* Progressive enhancement: desktop Hacklas shortcuts help.
   Button and dialog are created in JS and hidden below the desktop nav breakpoint.
   Site works without this file. */
(function () {
  "use strict";

  var DESKTOP = "(min-width: 48rem)";
  var TITLE_ID = "shortcuts-modal-title";
  var lastFocus = null;

  var ROWS = [
    { keys: ["h"], desc: "Go to Hacklas" },
    { keys: ["Type"], desc: "Search notes on the Hacklas index" },
    { keys: ["Space"], desc: "Add the matching tag as a filter" },
    { keys: ["Enter"], desc: "Open the first matching note" },
    { keys: ["Backspace"], desc: "Go back from a note" }
  ];

  function isDesktop() {
    return window.matchMedia(DESKTOP).matches;
  }

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function hacklasNavItem() {
    var links = document.querySelectorAll(".nav-list a[href]");
    for (var i = 0; i < links.length; i++) {
      try {
        var u = new URL(links[i].href, location.href);
        var p = u.pathname.replace(/\/$/, "");
        if (p.slice(-8) === "/hacklas") return links[i].closest("li");
      } catch (_) {}
    }
    return null;
  }

  function disclaimerOpen() {
    if (document.documentElement.classList.contains("disclaimer-open")) return true;
    return !!document.querySelector("[data-hacklas-disclaimer]:not([hidden])");
  }

  function getModal() {
    return document.querySelector("[data-shortcuts-modal]");
  }

  function isOpen() {
    var modal = getModal();
    return !!(modal && !modal.hidden);
  }

  function setOpen(open) {
    var modal = ensureModal();
    modal.hidden = !open;
    document.documentElement.classList.toggle("shortcuts-open", !!open);
    if (open) {
      lastFocus = document.activeElement;
      var closeBtn = modal.querySelector("button[data-shortcuts-close]");
      if (closeBtn && typeof closeBtn.focus === "function") {
        try {
          closeBtn.focus();
        } catch (_) {}
      }
    } else if (lastFocus && typeof lastFocus.focus === "function") {
      try {
        lastFocus.focus();
      } catch (_) {}
      lastFocus = null;
    }
  }

  function close() {
    setOpen(false);
  }

  function open() {
    if (!isDesktop() || disclaimerOpen()) return;
    setOpen(true);
  }

  function toggle() {
    if (isOpen()) close();
    else open();
  }

  function ensureModal() {
    var existing = getModal();
    if (existing) return existing;

    var modal = el("div", "shortcuts-modal");
    modal.setAttribute("data-shortcuts-modal", "");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", TITLE_ID);
    modal.hidden = true;

    var backdrop = el("div", "shortcuts-modal__backdrop");
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.setAttribute("data-shortcuts-close", "");

    var panel = el("div", "shortcuts-modal__panel");

    var title = el("h2", "shortcuts-modal__title");
    title.id = TITLE_ID;
    title.textContent = "Keyboard shortcuts";

    var list = el("ul", "shortcuts-modal__list");
    for (var i = 0; i < ROWS.length; i++) {
      var row = el("li", "shortcuts-modal__row");
      var keys = el("span", "shortcuts-modal__keys");
      for (var k = 0; k < ROWS[i].keys.length; k++) {
        var kbd = document.createElement("kbd");
        kbd.textContent = ROWS[i].keys[k];
        keys.appendChild(kbd);
      }
      var desc = el("p", "shortcuts-modal__desc");
      desc.textContent = ROWS[i].desc;
      row.appendChild(keys);
      row.appendChild(desc);
      list.appendChild(row);
    }

    var closeBtn = el("button", "shortcuts-modal__close");
    closeBtn.type = "button";
    closeBtn.setAttribute("data-shortcuts-close", "");
    closeBtn.textContent = "Close";

    panel.appendChild(title);
    panel.appendChild(list);
    panel.appendChild(closeBtn);
    modal.appendChild(backdrop);
    modal.appendChild(panel);
    document.body.appendChild(modal);
    return modal;
  }

  function mountButton() {
    var navItem = hacklasNavItem();
    if (!navItem || !navItem.parentNode) return;

    var existing = navItem.parentNode.querySelector(".shortcuts-help");
    if (existing) existing.remove();

    var li = el("li", "shortcuts-help");
    var btn = el("button", "shortcuts-help__btn");
    btn.type = "button";
    btn.setAttribute("aria-label", "Hacklas keyboard shortcuts");
    btn.setAttribute("data-shortcuts-help", "");
    btn.textContent = "?";
    li.appendChild(btn);
    navItem.parentNode.insertBefore(li, navItem.nextSibling);
  }

  function hydrate() {
    ensureModal();
    mountButton();
  }

  document.addEventListener("click", function (e) {
    var help = e.target.closest && e.target.closest("[data-shortcuts-help]");
    if (help) {
      e.preventDefault();
      toggle();
      return;
    }
    var closer = e.target.closest && e.target.closest("[data-shortcuts-close]");
    if (closer && getModal() && getModal().contains(closer)) {
      e.preventDefault();
      close();
    }
  });

  document.addEventListener(
    "keydown",
    function (e) {
      if (e.key !== "Escape" || !isOpen()) return;
      e.preventDefault();
      close();
    },
    true
  );

  var mq = window.matchMedia(DESKTOP);
  function onBreakpoint(e) {
    if (!e.matches) close();
  }
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onBreakpoint);
  } else if (typeof mq.addListener === "function") {
    mq.addListener(onBreakpoint);
  }

  window.hydrateHacklasHelp = hydrate;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrate);
  } else {
    hydrate();
  }
})();

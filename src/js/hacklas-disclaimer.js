/* Progressive enhancement: Hacklas disclaimer gate.
   Acknowledged state is stored in localStorage.
   Listeners are delegated on document so they survive site.js main swaps. */
(function enhanceHacklasDisclaimer() {
  "use strict";

  const KEY = "hacklas-disclaimer-ack";
  const SELECTOR = "[data-hacklas-disclaimer]";

  function isAcked() {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  }

  function setAcked() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // localStorage may be blocked.
    }
  }

  function setBodyLocked(locked) {
    document.documentElement.classList.toggle("disclaimer-open", !!locked);
  }

  function pathPrefix() {
    const raw = document.documentElement.dataset.pathPrefix || "/";
    return raw.at(-1) === "/" ? raw : raw + "/";
  }

  function isHacklasHref(href) {
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) {
        return false;
      }
      const prefix = pathPrefix().replace(/\/$/, "");
      let rest = url.pathname;
      if (prefix && rest.indexOf(prefix) === 0) {
        rest = rest.slice(prefix.length);
      }
      if (rest.charAt(0) !== "/") {
        rest = "/" + rest;
      }
      return rest === "/hacklas" || rest.indexOf("/hacklas/") === 0;
    } catch {
      return false;
    }
  }

  function leaveHacklas(homeHref) {
    const home =
      homeHref || (typeof globalThis.siteUrl === "function" ? globalThis.siteUrl("/") : "/");
    const reference = document.referrer;
    if (reference && !isHacklasHref(reference)) {
      const here = location.href;
      history.back();
      setTimeout(() => {
        if (location.href === here) {
          location.assign(home);
        }
      }, 250);
      return;
    }
    location.assign(home);
  }

  function hideAll() {
    for (const modal of document.querySelectorAll(SELECTOR)) {
      modal.hidden = true;
    }
    setBodyLocked(false);
  }

  function hydrate(modal) {
    if (!modal || modal.nodeType !== 1) {
      return;
    }

    if (isAcked()) {
      modal.hidden = true;
      return;
    }

    modal.hidden = false;
    setBodyLocked(true);

    const button = modal.querySelector("[data-hacklas-disclaimer-ack]");
    if (button && typeof button.focus === "function") {
      try {
        button.focus();
      } catch {
        // focus() can throw if the node is not focusable yet.
      }
    }
  }

  function hydrateAll() {
    const modals = document.querySelectorAll(SELECTOR);
    if (modals.length === 0) {
      setBodyLocked(false);
      return;
    }
    for (const modal of modals) {
      hydrate(modal);
    }
    if (isAcked() || !document.querySelector(SELECTOR + ":not([hidden])")) {
      setBodyLocked(false);
    }
  }

  document.addEventListener(
    "click",
    (event) => {
      const ack = event.target.closest?.("[data-hacklas-disclaimer-ack]");
      if (ack) {
        setAcked();
        hideAll();
        return;
      }
      const refuse = event.target.closest?.("[data-hacklas-disclaimer-refuse]");
      if (refuse) {
        event.preventDefault();
        leaveHacklas(refuse.getAttribute("href"));
      }
    },
    { capture: true },
  );

  globalThis.hydrateHacklasDisclaimer = hydrateAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateAll);
  } else {
    hydrateAll();
  }
})();

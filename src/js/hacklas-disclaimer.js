/* Progressive enhancement: Hacklas disclaimer gate.
   Acknowledged state is stored in localStorage.
   Listeners are delegated on document so they survive site.js main swaps. */
(function () {
  "use strict";

  var KEY = "hacklas-disclaimer-ack";
  var SELECTOR = "[data-hacklas-disclaimer]";

  function isAcked() {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function setAcked() {
    try {
      localStorage.setItem(KEY, "1");
    } catch (_) {}
  }

  function setBodyLocked(locked) {
    document.documentElement.classList.toggle("disclaimer-open", !!locked);
  }

  function pathPrefix() {
    var raw = document.documentElement.getAttribute("data-path-prefix") || "/";
    return raw.charAt(raw.length - 1) === "/" ? raw : raw + "/";
  }

  function isHacklasHref(href) {
    try {
      var url = new URL(href, location.href);
      if (url.origin !== location.origin) return false;
      var prefix = pathPrefix().replace(/\/$/, "");
      var rest = url.pathname;
      if (prefix && rest.indexOf(prefix) === 0) rest = rest.slice(prefix.length);
      if (rest.charAt(0) !== "/") rest = "/" + rest;
      return rest === "/hacklas" || rest.indexOf("/hacklas/") === 0;
    } catch (_) {
      return false;
    }
  }

  function leaveHacklas(homeHref) {
    var home =
      homeHref ||
      (typeof window.siteUrl === "function" ? window.siteUrl("/") : "/");
    var ref = document.referrer;
    if (ref && !isHacklasHref(ref)) {
      var here = location.href;
      history.back();
      setTimeout(function () {
        if (location.href === here) location.assign(home);
      }, 250);
      return;
    }
    location.assign(home);
  }

  function hideAll() {
    Array.prototype.forEach.call(document.querySelectorAll(SELECTOR), function (modal) {
      modal.hidden = true;
    });
    setBodyLocked(false);
  }

  function hydrate(modal) {
    if (!modal || modal.nodeType !== 1) return;

    if (isAcked()) {
      modal.hidden = true;
      return;
    }

    modal.hidden = false;
    setBodyLocked(true);

    var btn = modal.querySelector("[data-hacklas-disclaimer-ack]");
    if (btn && typeof btn.focus === "function") {
      try {
        btn.focus();
      } catch (_) {}
    }
  }

  function hydrateAll() {
    var modals = document.querySelectorAll(SELECTOR);
    if (!modals.length) {
      setBodyLocked(false);
      return;
    }
    Array.prototype.forEach.call(modals, hydrate);
    if (isAcked() || !document.querySelector(SELECTOR + ":not([hidden])")) {
      setBodyLocked(false);
    }
  }

  document.addEventListener(
    "click",
    function (e) {
      var ack =
        e.target.closest && e.target.closest("[data-hacklas-disclaimer-ack]");
      if (ack) {
        setAcked();
        hideAll();
        return;
      }
      var refuse =
        e.target.closest && e.target.closest("[data-hacklas-disclaimer-refuse]");
      if (refuse) {
        e.preventDefault();
        leaveHacklas(refuse.getAttribute("href"));
      }
    },
    true
  );

  window.hydrateHacklasDisclaimer = hydrateAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateAll);
  } else {
    hydrateAll();
  }
})();

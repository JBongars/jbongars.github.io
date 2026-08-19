/* Progressive enhancement: Hacklas disclaimer gate.
   Acknowledged state is stored in localStorage. */
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

  function hydrate(root) {
    var modal = root && root.nodeType === 1 && root.matches && root.matches(SELECTOR)
      ? root
      : (root || document).querySelector(SELECTOR);
    if (!modal || modal.getAttribute("data-disclaimer-ready") === "1") return;
    modal.setAttribute("data-disclaimer-ready", "1");

    if (isAcked()) {
      modal.hidden = true;
      setBodyLocked(false);
      return;
    }

    modal.hidden = false;
    setBodyLocked(true);

    var refuse = modal.querySelector("[data-hacklas-disclaimer-refuse]");
    if (refuse) {
      refuse.addEventListener("click", function (e) {
        e.preventDefault();
        leaveHacklas(refuse.getAttribute("href"));
      });
    }

    var btn = modal.querySelector("[data-hacklas-disclaimer-ack]");
    if (btn) {
      btn.addEventListener("click", function () {
        setAcked();
        modal.hidden = true;
        setBodyLocked(false);
      });
      if (typeof btn.focus === "function") {
        try {
          btn.focus();
        } catch (_) {}
      }
    }
  }

  function hydrateAll() {
    var modals = document.querySelectorAll(SELECTOR);
    if (!modals.length) {
      setBodyLocked(false);
      return;
    }
    Array.prototype.forEach.call(modals, hydrate);
    if (!document.querySelector(SELECTOR + ":not([hidden])")) {
      setBodyLocked(false);
    }
  }

  window.hydrateHacklasDisclaimer = hydrateAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateAll);
  } else {
    hydrateAll();
  }
})();

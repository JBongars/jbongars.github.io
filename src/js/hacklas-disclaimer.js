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

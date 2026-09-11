/*
 * Apply stored theme before first paint. Safe if localStorage is blocked.
 */
(function applyStoredTheme() {
  try {
    if (localStorage.getItem("theme") === "light") {
      const toggle = document.querySelector("#theme-toggle");
      if (toggle) {
        toggle.checked = true;
      }
    }
  } catch {
    // localStorage may be blocked (private mode, disabled storage).
  }
})();

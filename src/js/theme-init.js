/* Apply stored theme before first paint. Safe if localStorage is blocked. */
(function () {
  try {
    if (localStorage.getItem("theme") === "light") {
      var toggle = document.getElementById("theme-toggle");
      if (toggle) toggle.checked = true;
    }
  } catch (e) {}
})();

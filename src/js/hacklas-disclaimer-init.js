/* Hide the Hacklas disclaimer immediately if already acknowledged. */
(function () {
  try {
    if (localStorage.getItem("hacklas-disclaimer-ack") === "1") {
      var root = document.currentScript && document.currentScript.parentElement;
      if (root) root.hidden = true;
    }
  } catch (e) {}
})();

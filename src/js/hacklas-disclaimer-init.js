/*
 * Hide the Hacklas disclaimer immediately if already acknowledged.
 */
(function hideAcknowledgedDisclaimer() {
  try {
    if (localStorage.getItem("hacklas-disclaimer-ack") === "1") {
      const root = document.currentScript?.parentElement;
      if (root) {
        root.hidden = true;
      }
    }
  } catch {
    // localStorage may be blocked.
  }
})();

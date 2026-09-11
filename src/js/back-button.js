/* Progressive enhancement: [data-back] goes to the previous history entry.
   Without JS, the href (Hacklas index) is used. */
(function enhanceBackLinks() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[data-back]");
    if (!link || event.defaultPrevented) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    history.back();
  });
})();

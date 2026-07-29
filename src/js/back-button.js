/* Progressive enhancement: [data-back] goes to the previous history entry.
   Without JS, the href (Hacklas index) is used. */
(function () {
  "use strict";

  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest("a[data-back]");
    if (!link || e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.button !== 0) return;

    e.preventDefault();
    history.back();
  });
})();

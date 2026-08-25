/* Progressive enhancement: parent checklist items toggle descendants.
   Native checkboxes and strikethrough CSS still work without this file. */
(function () {
  "use strict";

  function ownCheckbox(item) {
    return (
      item.querySelector(
        ":scope > .task-list-item__control > .task-list-item__checkbox"
      ) ||
      item.querySelector(
        ":scope > p > .task-list-item__control > .task-list-item__checkbox"
      )
    );
  }

  function parentTaskItem(item) {
    var list = item.parentElement;
    var host = list && list.parentElement;
    if (!host || !host.closest) return null;
    return host.closest("li.task-list-item");
  }

  function setDescendants(item, checked) {
    var own = ownCheckbox(item);
    var boxes = item.querySelectorAll(".task-list-item__checkbox");
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i] === own) continue;
      boxes[i].checked = checked;
      boxes[i].indeterminate = false;
    }
  }

  function syncAncestors(item) {
    var parentItem = parentTaskItem(item);
    while (parentItem) {
      var own = ownCheckbox(parentItem);
      if (own) {
        var boxes = parentItem.querySelectorAll(".task-list-item__checkbox");
        var all = true;
        var anyChild = false;
        for (var i = 0; i < boxes.length; i++) {
          if (boxes[i] === own) continue;
          anyChild = true;
          if (!boxes[i].checked) all = false;
        }
        if (anyChild) {
          own.checked = all;
          own.indeterminate = false;
        }
      }
      parentItem = parentTaskItem(parentItem);
    }
  }

  document.addEventListener("change", function (e) {
    var target = e.target;
    if (
      !target ||
      !target.classList ||
      !target.classList.contains("task-list-item__checkbox")
    ) {
      return;
    }
    var item = target.closest("li.task-list-item");
    if (!item || ownCheckbox(item) !== target) return;
    setDescendants(item, target.checked);
    syncAncestors(item);
  });
})();

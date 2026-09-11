/* Progressive enhancement: parent checklist items toggle descendants.
   Native checkboxes and strikethrough CSS still work without this file. */
(function enhanceTaskLists() {
  function ownCheckbox(item) {
    return (
      item.querySelector(":scope > .task-list-item__control > .task-list-item__checkbox") ||
      item.querySelector(":scope > p > .task-list-item__control > .task-list-item__checkbox")
    );
  }

  function parentTaskItem(item) {
    const list = item.parentElement;
    const host = list?.parentElement;
    return host?.closest?.("li.task-list-item");
  }

  function setDescendants(item, isChecked) {
    const own = ownCheckbox(item);
    for (const box of item.querySelectorAll(".task-list-item__checkbox")) {
      if (box === own) {
        continue;
      }
      box.checked = isChecked;
      box.indeterminate = false;
    }
  }

  function childBoxes(parentItem, own) {
    return [...parentItem.querySelectorAll(".task-list-item__checkbox")].filter(
      (box) => box !== own,
    );
  }

  function syncAncestors(item) {
    let parentItem = parentTaskItem(item);
    while (parentItem) {
      const own = ownCheckbox(parentItem);
      if (own) {
        const boxes = childBoxes(parentItem, own);
        if (boxes.length > 0) {
          own.checked = boxes.every((box) => box.checked);
          own.indeterminate = false;
        }
      }
      parentItem = parentTaskItem(parentItem);
    }
  }

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!target?.classList?.contains("task-list-item__checkbox")) {
      return;
    }
    const item = target.closest("li.task-list-item");
    if (!item || ownCheckbox(item) !== target) {
      return;
    }
    setDescendants(item, target.checked);
    syncAncestors(item);
  });
})();

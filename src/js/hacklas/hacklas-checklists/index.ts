/* Progressive enhancement: parent checklist items toggle descendants.
   Native checkboxes and strikethrough CSS still work without this file. */

export const TASK_CHECKBOX_HOOK = "[data-task-checkbox]";
export const TASK_ITEM_HOOK = "[data-task-item]";

const enhancedRoots = new WeakSet<ParentNode>();

function noop(): void {
  /*
   * Teardown is a no-op when this root was not enhanced.
   */
}

function ownCheckbox(item: Element): HTMLInputElement | undefined {
  for (const box of item.querySelectorAll(TASK_CHECKBOX_HOOK)) {
    if (box instanceof HTMLInputElement && box.closest(TASK_ITEM_HOOK) === item) {
      return box;
    }
  }
}

function parentTaskItem(item: Element): HTMLElement | undefined {
  const host = item.parentElement?.closest(TASK_ITEM_HOOK);
  return host instanceof HTMLElement ? host : undefined;
}

function setDescendants(item: Element, isChecked: boolean): void {
  const own = ownCheckbox(item);
  for (const box of item.querySelectorAll(TASK_CHECKBOX_HOOK)) {
    if (box === own || !(box instanceof HTMLInputElement)) {
      continue;
    }
    box.checked = isChecked;
    box.indeterminate = false;
  }
}

function childBoxes(parentItem: Element, own: HTMLInputElement | undefined): HTMLInputElement[] {
  const boxes: HTMLInputElement[] = [];
  for (const box of parentItem.querySelectorAll(TASK_CHECKBOX_HOOK)) {
    if (box !== own && box instanceof HTMLInputElement) {
      boxes.push(box);
    }
  }
  return boxes;
}

function syncAncestors(item: Element): void {
  let parentItem = parentTaskItem(item);
  while (parentItem) {
    const own = ownCheckbox(parentItem);
    const boxes = childBoxes(parentItem, own);
    if (own && boxes.length > 0) {
      own.checked = boxes.every((box) => box.checked);
      own.indeterminate = false;
    }
    parentItem = parentTaskItem(parentItem);
  }
}

function eventTarget(event: Event): Element | undefined {
  const { target } = event;
  return target instanceof Element ? target : undefined;
}

function onChange(event: Event, root: ParentNode): void {
  const target = eventTarget(event);
  if (!(target instanceof HTMLInputElement) || !target.matches(TASK_CHECKBOX_HOOK)) {
    return;
  }
  const item = target.closest(TASK_ITEM_HOOK);
  if (!item || !root.contains(item) || ownCheckbox(item) !== target) {
    return;
  }
  setDescendants(item, target.checked);
  syncAncestors(item);
}

export function init(root: ParentNode = document): () => void {
  if (!(root instanceof Document || root instanceof Element)) {
    return noop;
  }
  if (enhancedRoots.has(root)) {
    return noop;
  }

  const controller = new AbortController();
  enhancedRoots.add(root);
  root.addEventListener(
    "change",
    (event) => {
      onChange(event, root);
    },
    { signal: controller.signal },
  );

  return () => {
    controller.abort();
    enhancedRoots.delete(root);
  };
}

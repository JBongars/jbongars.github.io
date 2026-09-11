/* Progressive enhancement: tag chips, autocomplete, and listing sort.
   init hydrates [data-sortable-list] and composes tag search onto fuzzy-find. */

import { apply, FUZZY_INPUT_HOOK, FUZZY_LIST_HOOK } from "../fuzzy-find";
import { matchMediaQuery, type MatchMediaLike } from "../platform";
import type {
  BooruSearchDependencies,
  FilterEntry,
  ListFilter,
  MountFieldConfig,
  MountListConfig,
  MountedTools,
  ResolvedTagSearchOptions,
  SortMode,
  SortState,
  SwatchColor,
  TagRecord,
  TagSearchConfig,
  TagSearchOptions,
  TagSearchState,
} from "./types";

export type { BooruSearchDependencies } from "./types";

export const SORTABLE_LIST_HOOK = "[data-sortable-list]";
const TAG_SEARCH_ON_FUZZY_HOOK = "[data-fuzzy-find][data-tag-search]";
const DESKTOP_QUERY = "(min-width: 48rem)";
const TAG_SWATCH_COLORS = [
  "blue",
  "green",
  "purple",
  "orange",
  "pink",
] as const satisfies readonly SwatchColor[];
const SUGGEST_LIMIT = 10;
const SUGGEST_DEBOUNCE_MS = 200;
const SWALLOW_CLICK_MS = 500;

const enhancedRoots = new WeakSet<ParentNode>();

function noop(): void {
  /*
   * Teardown is a no-op when this root was not enhanced.
   */
}

function swatchColorForTag(tag: string): SwatchColor {
  let hash = 0;
  let index = 0;
  for (const character of tag) {
    hash = (hash + (character.codePointAt(0) ?? 0) * (index + 1)) % 997;
    index += 1;
  }
  return TAG_SWATCH_COLORS[hash % TAG_SWATCH_COLORS.length] ?? "blue";
}

function tagsFor(element: HTMLElement): string[] {
  const tags: string[] = [];
  const rawTags = element.dataset["tags"] ?? "";
  for (const part of rawTags.split(",")) {
    const tag = part.trim();
    if (tag.length > 0) {
      tags.push(tag);
    }
  }
  return tags;
}

function formatCount(count: number): string {
  if (count < 1000) {
    return String(count);
  }
  const thousands = Math.round((count / 1000) * 10) / 10;
  return `${String(thousands).replace(/\.0$/u, "")}k`;
}

function buildIndex(list: Element): TagRecord[] {
  const counts = new Map<string, number>();
  for (const child of list.children) {
    if (!(child instanceof HTMLElement)) {
      continue;
    }
    for (const tag of tagsFor(child)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const index: TagRecord[] = [];
  for (const [name, count] of counts) {
    index.push({ name, count, color: swatchColorForTag(name) });
  }
  return index;
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function subsequenceScore(hay: string, needle: string): number {
  let cursor = 0;
  let first = -1;
  let last = -1;
  let run = 0;
  let bestRun = 0;
  let previous = -2;
  for (const character of needle) {
    cursor = hay.indexOf(character, cursor);
    if (cursor < 0) {
      return -1;
    }
    first = first < 0 ? cursor : first;
    last = cursor;
    run = cursor === previous + 1 ? run + 1 : 1;
    bestRun = Math.max(bestRun, run);
    previous = cursor;
    cursor += 1;
  }
  return Math.round(
    40 * (needle.length / (last - first + 1)) +
      15 * (1 / (1 + first)) +
      15 * (bestRun / needle.length),
  );
}

function fuzzyScore(haystack: string, query: string): number {
  return subsequenceScore(normalize(haystack), normalize(query).replaceAll(/\s+/gu, ""));
}

function rankTags(tagIndex: TagRecord[], filter: ListFilter, query: string): TagRecord[] {
  const needle = normalize(query);
  if (!needle) {
    return [];
  }
  const scored: { tag: TagRecord; score: number }[] = [];
  for (const tag of tagIndex) {
    if (filter.hasChip(tag.name)) {
      continue;
    }
    const score = fuzzyScore(tag.name, needle);
    if (score < 0) {
      continue;
    }
    scored.push({ tag, score });
  }
  scored.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return right.tag.count - left.tag.count;
  });
  return scored.slice(0, SUGGEST_LIMIT).map((row) => row.tag);
}

function isDesktopSearch(media: MatchMediaLike): boolean {
  return media(DESKTOP_QUERY).matches;
}

function swallowNextClick(signal: AbortSignal): void {
  const controller = new AbortController();
  function cleanup(): void {
    controller.abort();
    clearTimeout(timeout);
  }
  function swallow(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    cleanup();
  }
  document.addEventListener("click", swallow, { capture: true, signal: controller.signal });
  const timeout = setTimeout(cleanup, SWALLOW_CLICK_MS);
  signal.addEventListener("abort", cleanup, { once: true });
}

function sortValue(item: Element, mode: SortMode): string {
  const attribute = mode === "name" ? "data-title" : "data-date";
  return (item.getAttribute(attribute) ?? "").toLowerCase();
}

function compareItems(state: SortState, left: Element, right: Element): number {
  const leftValue = sortValue(left, state.mode);
  const rightValue = sortValue(right, state.mode);
  if (leftValue < rightValue) {
    return -state.direction;
  }
  if (leftValue > rightValue) {
    return state.direction;
  }
  return 0;
}

function applySort(list: Element, state: SortState): void {
  const items = [...list.children];
  items.sort((left, right) => compareItems(state, left, right));
  for (const item of items) {
    list.append(item);
  }
}

function isItemVisible(item: HTMLElement, names: ListFilter["names"]): boolean {
  const tags = new Set(tagsFor(item).map((tag) => tag.toLowerCase()));
  return names(false).every((tag) => tags.has(tag)) && names(true).every((tag) => !tags.has(tag));
}

function createFilter(list: Element): ListFilter {
  const selected: FilterEntry[] = [];

  function hasChip(name: string): boolean {
    const lower = name.toLowerCase();
    return selected.some((entry) => entry.name.toLowerCase() === lower);
  }

  function didAdd(name: string, isExcluded: boolean): boolean {
    if (name.length === 0 || hasChip(name)) {
      return false;
    }
    selected.push({ name, isExcluded, color: swatchColorForTag(name) });
    return true;
  }

  function removeAt(index: number): void {
    selected.splice(index, 1);
  }

  function didRemoveLast(): boolean {
    if (selected.length === 0) {
      return false;
    }
    selected.pop();
    return true;
  }

  function names(isExcluded: boolean): string[] {
    const result: string[] = [];
    for (const entry of selected) {
      if (entry.isExcluded === isExcluded) {
        result.push(entry.name.toLowerCase());
      }
    }
    return result;
  }

  function applyFilter(): void {
    for (const child of list.children) {
      if (child instanceof HTMLElement) {
        child.hidden = !isItemVisible(child, names);
      }
    }
  }

  const filter: ListFilter = {
    selected,
    hasChip,
    didAdd,
    removeAt,
    didRemoveLast,
    names,
    apply: applyFilter,
  };
  return filter;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  attributes?: Record<string, string>,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      node.setAttribute(key, value);
    }
  }
  return node;
}

function defaultDirection(mode: SortMode): number {
  return mode === "date" ? -1 : 1;
}

function syncSortButton(
  button: HTMLButtonElement,
  spec: { label: string; arrow: string; on: boolean },
): void {
  button.setAttribute("aria-pressed", spec.on ? "true" : "false");
  button.textContent = spec.on ? `${spec.label} ${spec.arrow}` : spec.label;
}

function createSortControls(list: Element, filter: ListFilter, signal: AbortSignal): HTMLElement {
  const state: SortState = { mode: "date", direction: -1 };
  const bar = element("div", "list-sort", { role: "group", "aria-label": "Sort posts" });
  const dateButton = element("button", "list-sort__btn", { type: "button" });
  const nameButton = element("button", "list-sort__btn", { type: "button" });
  dateButton.textContent = "Date";
  nameButton.textContent = "Name";

  function chooseMode(mode: SortMode): void {
    if (state.mode === mode) {
      state.direction *= -1;
    } else {
      state.mode = mode;
      state.direction = defaultDirection(mode);
    }
    syncSort();
  }

  function syncSort(): void {
    syncSortButton(dateButton, {
      label: "Date",
      arrow: state.direction < 0 ? "↓" : "↑",
      on: state.mode === "date",
    });
    syncSortButton(nameButton, {
      label: "Name",
      arrow: state.direction > 0 ? "↑" : "↓",
      on: state.mode === "name",
    });
    applySort(list, state);
    filter.apply();
  }

  dateButton.addEventListener(
    "click",
    () => {
      chooseMode("date");
    },
    { signal },
  );
  nameButton.addEventListener(
    "click",
    () => {
      chooseMode("name");
    },
    { signal },
  );
  bar.append(dateButton, nameButton);
  syncSort();
  return bar;
}

function chipClasses(entry: FilterEntry): string {
  const exclude = entry.isExcluded ? " tag-chip--exclude" : "";
  return `tag-chip tag-chip--${entry.color}${exclude}`;
}

function buildChip(
  entry: FilterEntry,
  onRemove: () => void,
  signal: AbortSignal,
): HTMLButtonElement {
  const chip = element("button", chipClasses(entry), { type: "button" });
  const prefix = entry.isExcluded ? "Remove excluded " : "Remove ";
  chip.setAttribute("aria-label", `${prefix}tag ${entry.name}`);
  const label = element("span", "tag-chip__label");
  label.textContent = `${entry.isExcluded ? "-" : ""}${entry.name}`;
  const close = element("span", "tag-chip__x", { "aria-hidden": "true" });
  close.textContent = "×";
  chip.append(label, close);
  let isRemoved = false;
  function removeChip(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (isRemoved) {
      return;
    }
    isRemoved = true;
    onRemove();
  }
  chip.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      removeChip(event);
    },
    { signal },
  );
  chip.addEventListener("click", removeChip, { signal });
  return chip;
}

function resolveOptions(options: TagSearchOptions): ResolvedTagSearchOptions {
  return {
    listboxId: options.listboxId ?? "tag-search-listbox",
    placeholder: options.placeholder ?? "Filter by tag…",
    fieldClass: options.fieldClass ?? "tag-search__field",
    commitTagOnSpace: options.commitTagOnSpace !== false,
    commitTagOnTab: options.commitTagOnTab === true,
    commitTagOnEnter: options.commitTagOnEnter !== false,
    onInput: options.onInput,
  };
}

function parseQuery(value: string): { text: string; isExcluded: boolean } {
  const raw = value.trim();
  const isExcluded = raw.startsWith("-");
  return { text: isExcluded ? raw.slice(1).trim() : raw, isExcluded };
}

function closeSuggest(state: TagSearchState): void {
  state.suggest.hidden = true;
  state.dropdown.textContent = "";
  state.suggestions = [];
  state.activeIndex = -1;
  state.input.setAttribute("aria-expanded", "false");
}

function isSuggestOpen(state: TagSearchState): boolean {
  return !state.suggest.hidden && state.suggestions.length > 0;
}

function highlightActive(state: TagSearchState): void {
  let index = 0;
  for (const row of state.dropdown.querySelectorAll(".tag-search__option")) {
    const isOn = index === state.activeIndex;
    row.classList.toggle("is-active", isOn);
    row.setAttribute("aria-selected", isOn ? "true" : "false");
    index += 1;
  }
}

function renderChips(state: TagSearchState): void {
  for (const node of state.field.querySelectorAll(".tag-chip")) {
    node.remove();
  }
  let index = 0;
  for (const entry of state.filter.selected) {
    const chipIndex = index;
    const chip = buildChip(
      entry,
      () => {
        state.filter.removeAt(chipIndex);
        renderChips(state);
        state.filter.apply();
        state.input.focus();
      },
      state.signal,
    );
    state.input.before(chip);
    index += 1;
  }
}

function commitTagSuggestion(state: TagSearchState, tag: TagRecord, isExcluded: boolean): void {
  if (state.filter.didAdd(tag.name, isExcluded)) {
    renderChips(state);
    state.filter.apply();
  }
  state.input.value = "";
  closeSuggest(state);
  state.options.onInput?.();
}

function resolveTag(tagIndex: TagRecord[], name: string): TagRecord | undefined {
  const lower = name.toLowerCase();
  return tagIndex.find((tag) => tag.name.toLowerCase() === lower);
}

function didCommitTag(state: TagSearchState): boolean {
  const highlighted = state.suggestions.at(state.activeIndex);
  if (highlighted && state.activeIndex >= 0 && isSuggestOpen(state)) {
    commitTagSuggestion(state, highlighted, parseQuery(state.input.value).isExcluded);
    return true;
  }
  const exact = resolveTag(state.tagIndex, state.input.value.trim());
  if (exact) {
    commitTagSuggestion(state, exact, false);
    return true;
  }
  return false;
}

function buildOption(
  state: TagSearchState,
  tag: TagRecord,
  meta: { index: number; isExcluded: boolean },
): HTMLLIElement {
  const item = element("li", "tag-search__option", { role: "option", "aria-selected": "false" });
  const swatch = element("span", `tag-search__cat tag-search__cat--${tag.color}`, {
    "aria-hidden": "true",
  });
  const name = element("span", "tag-search__name");
  name.textContent = `${meta.isExcluded ? "-" : ""}${tag.name}`;
  const count = element("span", "tag-search__count");
  count.textContent = formatCount(tag.count);
  item.append(swatch, name, count);
  item.addEventListener(
    "mouseenter",
    () => {
      state.activeIndex = meta.index;
      highlightActive(state);
    },
    { signal: state.signal },
  );
  item.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      swallowNextClick(state.signal);
      commitTagSuggestion(state, tag, meta.isExcluded);
    },
    { signal: state.signal },
  );
  item.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      commitTagSuggestion(state, tag, meta.isExcluded);
    },
    { signal: state.signal },
  );
  return item;
}

function renderSuggestions(state: TagSearchState, query: string, isExcluded: boolean): void {
  if (state.wrap.dataset["suggestDismissed"] === "1" || query.length === 0) {
    closeSuggest(state);
    return;
  }
  state.suggestions = rankTags(state.tagIndex, state.filter, query);
  state.dropdown.textContent = "";
  if (state.suggestions.length === 0) {
    closeSuggest(state);
    return;
  }
  let index = 0;
  for (const tag of state.suggestions) {
    state.dropdown.append(buildOption(state, tag, { index, isExcluded }));
    index += 1;
  }
  state.activeIndex = 0;
  highlightActive(state);
  state.suggest.hidden = false;
  state.input.setAttribute("aria-expanded", "true");
}

function isInputEmpty(input: HTMLInputElement): boolean {
  return input.value === "" && input.selectionStart === 0 && input.selectionEnd === 0;
}

function onSpaceCommit(event: KeyboardEvent, state: TagSearchState): void {
  if (!state.options.commitTagOnSpace || state.input.value.trim().length === 0) {
    return;
  }
  if (!isSuggestOpen(state)) {
    delete state.wrap.dataset["suggestDismissed"];
    const spaceQuery = parseQuery(state.input.value);
    renderSuggestions(state, spaceQuery.text, spaceQuery.isExcluded);
  }
  if (didCommitTag(state)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function onTabCommit(event: KeyboardEvent, state: TagSearchState): void {
  if (!state.options.commitTagOnTab || event.shiftKey) {
    return;
  }
  if (didCommitTag(state)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function onArrowHighlight(event: KeyboardEvent, state: TagSearchState): void {
  if (!isSuggestOpen(state)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const step = event.key === "ArrowRight" ? 1 : -1;
  state.activeIndex =
    (state.activeIndex + step + state.suggestions.length) % state.suggestions.length;
  highlightActive(state);
}

function onEnterCommit(event: KeyboardEvent, state: TagSearchState): void {
  const isMobileCommit = state.options.commitTagOnEnter || !isDesktopSearch(state.matchMedia);
  if (!isMobileCommit) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  void didCommitTag(state);
}

function onEscapeSuggest(event: KeyboardEvent, state: TagSearchState): void {
  if (!isSuggestOpen(state)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  state.wrap.dataset["suggestDismissed"] = "1";
  closeSuggest(state);
}

function onBackspaceChip(event: KeyboardEvent, state: TagSearchState): void {
  if (!isInputEmpty(state.input) || !state.filter.didRemoveLast()) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  renderChips(state);
  state.filter.apply();
}

function onSearchKeydown(event: Event, state: TagSearchState): void {
  if (!(event instanceof KeyboardEvent)) {
    return;
  }
  if (event.key === " " || event.key === "Spacebar") {
    onSpaceCommit(event, state);
    return;
  }
  if (event.key === "Tab") {
    onTabCommit(event, state);
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    onArrowHighlight(event, state);
    return;
  }
  if (event.key === "Enter") {
    onEnterCommit(event, state);
    return;
  }
  if (event.key === "Escape") {
    onEscapeSuggest(event, state);
    return;
  }
  if (event.key === "Backspace") {
    onBackspaceChip(event, state);
  }
}

function bindTagSearch(state: TagSearchState): void {
  const { signal } = state;
  state.field.addEventListener(
    "click",
    (event) => {
      if (event.target === state.field) {
        state.input.focus();
      }
    },
    { signal },
  );
  state.input.addEventListener(
    "input",
    () => {
      delete state.wrap.dataset["suggestDismissed"];
      state.options.onInput?.();
      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(() => {
        const query = parseQuery(state.input.value);
        renderSuggestions(state, query.text, query.isExcluded);
      }, SUGGEST_DEBOUNCE_MS);
    },
    { signal },
  );
  state.input.addEventListener(
    "keydown",
    (event) => {
      onSearchKeydown(event, state);
    },
    { capture: true, signal },
  );
}

function reuseOrCreateInput(
  options: TagSearchOptions,
  resolved: ResolvedTagSearchOptions,
): HTMLInputElement {
  if (options.input) {
    options.input.classList.add("tag-search__input");
    if (options.placeholder) {
      options.input.setAttribute("placeholder", options.placeholder);
    }
    return options.input;
  }
  return element("input", "tag-search__input", {
    type: "text",
    placeholder: resolved.placeholder,
    autocomplete: "off",
    spellcheck: "false",
  });
}

function createTagSearch(config: TagSearchConfig): HTMLElement {
  const options = resolveOptions(config.options);
  const wrap = config.options.mount ?? element("div", "tag-search");
  const field = element("div", options.fieldClass);
  const input = reuseOrCreateInput(config.options, options);
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", options.listboxId);
  const suggest = element("div", "tag-search__suggest");
  suggest.hidden = true;
  const closeButton = element("button", "tag-search__close", { type: "button" });
  closeButton.setAttribute("aria-label", "Close tag suggestions");
  closeButton.textContent = "×";
  const dropdown = element("ul", "tag-search__dropdown", {
    id: options.listboxId,
    role: "listbox",
  });
  suggest.append(closeButton, dropdown);
  wrap.append(field, suggest);
  field.append(input);
  const state: TagSearchState = {
    debounceTimer: undefined,
    activeIndex: -1,
    suggestions: [],
    tagIndex: config.tagIndex,
    filter: config.filter,
    options,
    wrap,
    field,
    input,
    suggest,
    dropdown,
    matchMedia: config.matchMedia,
    signal: config.signal,
  };
  closeButton.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      wrap.dataset["suggestDismissed"] = "1";
      closeSuggest(state);
      input.focus();
    },
    { signal: config.signal },
  );
  bindTagSearch(state);
  if (config.filter.selected.length > 0) {
    renderChips(state);
  }
  config.signal.addEventListener("abort", () => {
    clearTimeout(state.debounceTimer);
  });
  return wrap;
}

function includedTagNames(filter: ListFilter): string[] {
  return filter.names(false);
}

function mountList(config: MountListConfig): void {
  const { list, matchMedia, signal, mounted } = config;
  if (!(list instanceof HTMLElement) || list.dataset["listingReady"] === "1") {
    return;
  }
  list.dataset["listingReady"] = "1";
  const filter = createFilter(list);
  const tools = element("div", "list-tools");
  tools.append(
    createTagSearch({
      tagIndex: buildIndex(list),
      filter,
      options: { commitTagOnSpace: true },
      matchMedia,
      signal,
    }),
  );
  tools.append(createSortControls(list, filter, signal));
  list.before(tools);
  mounted.push({ list, tools });
}

function tagsFromUrl(locationLike: Pick<Location, "href">): string[] {
  const tags: string[] = [];
  try {
    const rawTags = new URL(locationLike.href).searchParams.get("t") ?? "";
    for (const part of rawTags.split(",")) {
      const tag = part.trim();
      if (tag.length > 0) {
        tags.push(tag);
      }
    }
  } catch {
    return tags;
  }
  return tags;
}

function mountField(config: MountFieldConfig): void {
  const { list, input, matchMedia, locationLike, signal } = config;
  if (input.dataset["tagSearchMounted"] === "1") {
    return;
  }
  input.dataset["tagSearchMounted"] = "1";
  const filter = createFilter(list);
  filter.apply = () => {
    apply(input.value, includedTagNames(filter));
  };
  for (const name of tagsFromUrl(locationLike)) {
    filter.didAdd(name, false);
  }
  const wrap = element("div", "tag-search");
  input.before(wrap);
  createTagSearch({
    tagIndex: buildIndex(list),
    filter,
    options: {
      input,
      mount: wrap,
      listboxId: "fuzzy-find-tags",
      placeholder: "Search notes or tags…",
      fieldClass: "tag-search__field fuzzy-find__field",
      commitTagOnSpace: true,
      commitTagOnTab: true,
      commitTagOnEnter: false,
      onInput() {
        filter.apply();
      },
    },
    matchMedia,
    signal,
  });
  filter.apply();
}

function mountTagSearchOnFuzzyFind(
  root: ParentNode,
  config: Omit<MountFieldConfig, "list" | "input">,
): void {
  for (const field of root.querySelectorAll(TAG_SEARCH_ON_FUZZY_HOOK)) {
    const list = field.querySelector(FUZZY_LIST_HOOK);
    const hooked = field.querySelector(FUZZY_INPUT_HOOK);
    const fallback = field.querySelector("input");
    const input = hooked instanceof HTMLInputElement ? hooked : fallback;
    if (list && input instanceof HTMLInputElement) {
      mountField({ ...config, list, input });
    }
  }
}

function dismissOutsideSuggest(event: Event, media: MatchMediaLike): void {
  if (isDesktopSearch(media)) {
    return;
  }
  const { target } = event;
  if (!(target instanceof Node)) {
    return;
  }
  for (const search of document.querySelectorAll(".tag-search")) {
    if (!(search instanceof HTMLElement) || search.contains(target)) {
      continue;
    }
    search.dataset["suggestDismissed"] = "1";
    const suggest = search.querySelector(".tag-search__suggest");
    const input = search.querySelector(".tag-search__input");
    if (suggest instanceof HTMLElement) {
      suggest.hidden = true;
    }
    if (input) {
      input.setAttribute("aria-expanded", "false");
    }
  }
}

function unmountTools(mounted: MountedTools[]): void {
  for (const entry of mounted) {
    entry.tools.remove();
    delete entry.list.dataset["listingReady"];
  }
}

export function init(
  root: ParentNode = document,
  dependencies: BooruSearchDependencies = {},
): () => void {
  if (!(root instanceof Document || root instanceof Element)) {
    return noop;
  }
  if (enhancedRoots.has(root)) {
    return noop;
  }

  const media = dependencies.matchMedia ?? matchMediaQuery;
  const locationLike = dependencies.location ?? location;
  const controller = new AbortController();
  const { signal } = controller;
  const mounted: MountedTools[] = [];

  enhancedRoots.add(root);
  for (const list of root.querySelectorAll(SORTABLE_LIST_HOOK)) {
    mountList({ list, matchMedia: media, signal, mounted });
  }
  mountTagSearchOnFuzzyFind(root, { matchMedia: media, locationLike, signal });
  document.addEventListener(
    "click",
    (event) => {
      dismissOutsideSuggest(event, media);
    },
    { signal },
  );

  return () => {
    controller.abort();
    unmountTools(mounted);
    enhancedRoots.delete(root);
  };
}

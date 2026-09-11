/* Progressive enhancement: rank and filter Hacklas notes.
   Hydrated only when [data-fuzzy-find] is present. Safe without this file.
   Breadcrumb links use ?q=path/prefix. Tag chips come from booru-search. */

import { siteUrl } from "../site-url";
import type {
  FieldScores,
  FuzzyFindDependencies,
  FuzzyFindLocation,
  FuzzySession,
  HydrateContext,
  NoteFields,
  RankedRow,
} from "./types";

export type { FuzzyFindDependencies, FuzzyFindLocation } from "./types";

export const FUZZY_FIND_HOOK = "[data-fuzzy-find]";
export const FUZZY_LIST_HOOK = "[data-fuzzy-list]";
export const FUZZY_INPUT_HOOK = "[data-fuzzy-input]";

const TITLE_SCORES: FieldScores = { exact: 800, prefix: 700, contains: 600 };
const SLUG_SCORES: FieldScores = { exact: 550, prefix: 500, contains: 450 };
const PATH_SCORES: FieldScores = { exact: 400, prefix: 380, contains: 350 };
const TAG_SCORES: FieldScores = { exact: 320, prefix: 300, contains: 280 };

const enhancedRoots = new WeakSet<ParentNode>();
const sessions: FuzzySession[] = [];

function noop(): void {
  /*
   * Teardown is a no-op when this root was not enhanced.
   */
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function pageLocation(dependencies: FuzzyFindDependencies): FuzzyFindLocation {
  return dependencies.location ?? location;
}

function pageHistory(dependencies: FuzzyFindDependencies): Pick<History, "replaceState" | "back"> {
  return dependencies.history ?? history;
}

function searchParameter(locationLike: FuzzyFindLocation, key: string): string {
  try {
    return new URL(locationLike.href).searchParams.get(key) ?? "";
  } catch {
    return "";
  }
}

function queryFromUrl(locationLike: FuzzyFindLocation): string {
  return searchParameter(locationLike, "q");
}

function tagsFromUrl(locationLike: FuzzyFindLocation): string[] {
  const tags: string[] = [];
  const rawTags = searchParameter(locationLike, "t");
  for (const part of rawTags.split(",")) {
    const tag = part.trim();
    if (tag.length > 0) {
      tags.push(tag);
    }
  }
  return tags;
}

function isHacklasIndex(pathname: string): boolean {
  return pathname.replace(/\/$/u, "").endsWith("/hacklas") || pathname === "/hacklas/";
}

function tagQueryPart(tagNames: string[]): string {
  if (tagNames.length === 0) {
    return "";
  }
  return `t=${tagNames.map((name) => encodeURIComponent(name)).join(",")}`;
}

function nextHacklasHref(query: string, tagNames: string[]): string {
  const parts: string[] = [];
  const tagsPart = tagQueryPart(tagNames);
  if (tagsPart.length > 0) {
    parts.push(tagsPart);
  }
  if (query.length > 0) {
    parts.push(`q=${encodeURIComponent(query)}`);
  }
  const suffix = parts.length > 0 ? `?${parts.join("&")}` : "";
  return siteUrl("/hacklas/") + suffix;
}

function syncQueryUrl(session: FuzzySession, query: string, tagNames: string[]): void {
  if (!isHacklasIndex(session.location.pathname)) {
    return;
  }
  const next = nextHacklasHref(query, tagNames);
  const current = session.location.pathname + session.location.search;
  if (current === next) {
    return;
  }
  session.history.replaceState(undefined, "", next);
  document.dispatchEvent(new CustomEvent("site:pathreplace"));
}

function origIndex(item: HTMLElement): number {
  const parsed = Math.trunc(Number(item.dataset["orig"]));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function liTags(item: HTMLElement): string[] {
  const tags: string[] = [];
  const rawTags = item.dataset["tags"] ?? "";
  for (const part of rawTags.split(",")) {
    const tag = part.trim().toLowerCase();
    if (tag.length > 0) {
      tags.push(tag);
    }
  }
  return tags;
}

function hasMatchingTags(item: HTMLElement, tagNames: string[]): boolean {
  if (tagNames.length === 0) {
    return true;
  }
  const tags = liTags(item);
  return tagNames.every((name) => tags.includes(name.toLowerCase()));
}

/**
 * Shortest subsequence window; higher when the query is compact and early.
 */
function fuzzyScore(haystack: string, query: string): number {
  const hay = normalize(haystack);
  const needle = normalize(query).replaceAll(/\s+/gu, "");
  if (needle.length === 0) {
    return 0;
  }
  return subsequenceScore(hay, needle);
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
  const compactness = needle.length / (last - first + 1);
  const earliness = 1 / (1 + first);
  return Math.round(40 * compactness + 15 * earliness + 15 * (bestRun / needle.length));
}

function containsScore(field: string, query: string, scores: FieldScores): number {
  if (field === query) {
    return scores.exact;
  }
  if (field.startsWith(query)) {
    return scores.prefix;
  }
  const at = field.indexOf(query);
  if (at === -1) {
    return -1;
  }
  return scores.contains - Math.min(at, 40);
}

function scorePath(path: string, asPath: string): number {
  if (path === asPath) {
    return 1000;
  }
  if (path.startsWith(`${asPath}/`)) {
    return 900;
  }
  return -1;
}

function scoreFields(query: string, fields: NoteFields): number {
  const checks: { field: string; scores: FieldScores }[] = [
    { field: fields.title, scores: TITLE_SCORES },
    { field: fields.slug, scores: SLUG_SCORES },
    { field: fields.path, scores: PATH_SCORES },
    { field: fields.tags, scores: TAG_SCORES },
  ];
  for (const check of checks) {
    const hit = containsScore(check.field, query, check.scores);
    if (hit >= 0) {
      return hit;
    }
  }
  return -1;
}

function noteFields(item: HTMLElement): NoteFields {
  const title = normalize(item.dataset["title"] ?? "");
  const path = normalize(item.dataset["path"] ?? "");
  const tags = normalize((item.dataset["tags"] ?? "").replaceAll(",", " "));
  return { title, path, tags, slug: path.split("/").pop() ?? "" };
}

/**
 * Rank a note for the query. Higher is better; -1 is no match.
 * Contiguous title/path hits beat loose subsequence matches.
 */
function scoreItem(item: HTMLElement, query: string): number {
  const normalized = normalize(query);
  if (normalized.length === 0) {
    return 0;
  }
  const fields = noteFields(item);
  const pathHit = scorePath(fields.path, normalized.replaceAll(/\s+/gu, "/"));
  if (pathHit >= 0) {
    return pathHit;
  }
  const fieldHit = scoreFields(normalized, fields);
  if (fieldHit >= 0) {
    return fieldHit;
  }
  return fuzzyScore(`${fields.title} ${fields.path} ${fields.tags}`, query);
}

function listItems(list: Element): HTMLElement[] {
  const items: HTMLElement[] = [];
  for (const child of list.children) {
    if (child instanceof HTMLElement) {
      items.push(child);
    }
  }
  return items;
}

function visibleItems(list: Element): HTMLElement[] {
  return listItems(list).filter((item) => item.style.display !== "none");
}

function clearActive(items: HTMLElement[]): void {
  for (const item of items) {
    item.classList.remove("is-active");
    item.removeAttribute("aria-selected");
  }
}

function setActive(items: HTMLElement[], index: number): number {
  clearActive(items);
  if (items.length === 0) {
    return -1;
  }
  const wrapped = ((index % items.length) + items.length) % items.length;
  const current = items[wrapped];
  if (!current) {
    return -1;
  }
  current.classList.add("is-active");
  current.setAttribute("aria-selected", "true");
  if (typeof current.scrollIntoView === "function") {
    current.scrollIntoView({ block: "nearest" });
  }
  return wrapped;
}

/**
 * Drop the last path segment: infiltration/windows → infiltration
 */
function parentQuery(query: string): string {
  const trimmed = query.replace(/\/+$/u, "");
  if (trimmed.length === 0) {
    return "";
  }
  const index = trimmed.lastIndexOf("/");
  return index === -1 ? "" : trimmed.slice(0, index);
}

function compareRanked(left: RankedRow, right: RankedRow): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  return origIndex(left.item) - origIndex(right.item);
}

function applySession(session: FuzzySession, query: string, tagNames: string[]): void {
  const ranked = listItems(session.list).map((item) => ({
    item,
    score: hasMatchingTags(item, tagNames) ? scoreItem(item, query) : -1,
  }));
  ranked.sort(compareRanked);
  for (const row of ranked) {
    row.item.style.display = row.score < 0 ? "none" : "";
    session.list.append(row.item);
  }
  const items = visibleItems(session.list);
  session.listActive = items.length > 0 ? setActive(items, 0) : -1;
  syncQueryUrl(session, query, tagNames);
}

function markOrigIndexes(list: Element): void {
  let index = 0;
  for (const item of listItems(list)) {
    if (!Object.hasOwn(item.dataset, "orig")) {
      item.dataset["orig"] = String(index);
    }
    index += 1;
  }
}

function onBackspace(event: KeyboardEvent, session: FuzzySession): void {
  const { input } = session;
  if (input.selectionStart !== 0 || input.selectionEnd !== 0) {
    return;
  }
  event.preventDefault();
  if (input.value.length > 0) {
    input.value = parentQuery(input.value);
    applySession(session, input.value, tagsFromUrl(session.location));
    return;
  }
  session.history.back();
}

function onArrow(event: KeyboardEvent, session: FuzzySession, items: HTMLElement[]): void {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    session.listActive = setActive(items, session.listActive + 1);
    return;
  }
  event.preventDefault();
  const previous = session.listActive <= 0 ? items.length : session.listActive;
  session.listActive = setActive(items, previous - 1);
}

function onEnter(event: KeyboardEvent, session: FuzzySession, items: HTMLElement[]): void {
  const current = items[session.listActive] ?? items[0];
  const link = current?.querySelector("a[href]");
  if (link instanceof HTMLAnchorElement) {
    event.preventDefault();
    syncQueryUrl(session, session.input.value, tagsFromUrl(session.location));
    link.click();
  }
}

function onEscape(event: KeyboardEvent, session: FuzzySession): void {
  if (session.input.value.length === 0) {
    return;
  }
  event.preventDefault();
  session.input.value = "";
  applySession(session, session.input.value, tagsFromUrl(session.location));
}

function onInputKeydown(event: Event, session: FuzzySession): void {
  if (!(event instanceof KeyboardEvent)) {
    return;
  }
  if (event.key === "Backspace") {
    onBackspace(event, session);
    return;
  }
  const items = visibleItems(session.list);
  if (items.length === 0 && event.key !== "Escape" && event.key !== "Enter") {
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    onArrow(event, session, items);
    return;
  }
  if (event.key === "Enter") {
    onEnter(event, session, items);
    return;
  }
  if (event.key === "Escape") {
    onEscape(event, session);
  }
}

function onListMove(event: Event, session: FuzzySession): void {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  const item = target.closest("li");
  if (!item || !session.list.contains(item) || item.style.display === "none") {
    return;
  }
  const items = visibleItems(session.list);
  session.listActive = setActive(items, items.indexOf(item));
}

function hasSession(field: HTMLElement): boolean {
  return sessions.some((session) => session.root === field);
}

function bindSession(session: FuzzySession, signal: AbortSignal): void {
  const { input, list } = session;
  input.addEventListener(
    "input",
    () => {
      applySession(session, input.value, tagsFromUrl(session.location));
    },
    { signal },
  );
  input.addEventListener(
    "keydown",
    (event) => {
      onInputKeydown(event, session);
    },
    { signal },
  );
  list.addEventListener(
    "mousemove",
    (event) => {
      onListMove(event, session);
    },
    { signal },
  );
  list.addEventListener(
    "click",
    () => {
      syncQueryUrl(session, input.value, tagsFromUrl(session.location));
    },
    { signal },
  );
}

function fieldInput(field: Element): HTMLInputElement | undefined {
  const hooked = field.querySelector(FUZZY_INPUT_HOOK);
  if (hooked instanceof HTMLInputElement) {
    return hooked;
  }
  const fallback = field.querySelector("input");
  return fallback instanceof HTMLInputElement ? fallback : undefined;
}

function hydrateField(field: Element, context: HydrateContext): void {
  if (!(field instanceof HTMLElement) || hasSession(field)) {
    return;
  }
  const input = fieldInput(field);
  const list = field.querySelector(FUZZY_LIST_HOOK);
  if (!input || !(list instanceof HTMLElement)) {
    return;
  }
  markOrigIndexes(list);
  const session: FuzzySession = {
    host: context.host,
    root: field,
    input,
    list,
    listActive: -1,
    location: pageLocation(context.dependencies),
    history: pageHistory(context.dependencies),
  };
  sessions.push(session);
  const preset = queryFromUrl(session.location);
  if (preset.length > 0) {
    input.value = preset;
    input.focus();
  }
  applySession(session, input.value, tagsFromUrl(session.location));
  bindSession(session, context.signal);
}

function dropSessionsFor(host: ParentNode): void {
  const kept = sessions.filter((session) => session.host !== host);
  sessions.length = 0;
  sessions.push(...kept);
}

export function apply(query: string, tagNames: string[]): void {
  for (const session of sessions) {
    applySession(session, query, tagNames);
  }
}

export function init(
  root: ParentNode = document,
  dependencies: FuzzyFindDependencies = {},
): () => void {
  if (!(root instanceof Document || root instanceof Element)) {
    return noop;
  }
  if (enhancedRoots.has(root)) {
    return noop;
  }

  const controller = new AbortController();
  enhancedRoots.add(root);
  const context: HydrateContext = { host: root, signal: controller.signal, dependencies };
  for (const field of root.querySelectorAll(FUZZY_FIND_HOOK)) {
    hydrateField(field, context);
  }

  return () => {
    controller.abort();
    dropSessionsFor(root);
    enhancedRoots.delete(root);
  };
}

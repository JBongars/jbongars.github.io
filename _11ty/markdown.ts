import Prism from "prismjs";
import loadLanguages from "prismjs/components/index.js";
import { withPathPrefix } from "./paths.ts";
import { escapeHtml, unescapeHtml, asString, asStringOrEmpty } from "./text.ts";
import { isContentMarkdown } from "./content.ts";

loadLanguages.silent = true;

interface MarkdownToken {
  type: string;
  tag: string;
  markup: string;
  content: string;
  attrs: [string, string][] | null | undefined;
  children: MarkdownToken[] | null;
  attrGet(name: string): string | null;
  attrJoin(name: string, value: string): void;
  attrSet(name: string, value: string): void;
  attrIndex(name: string): number;
  attrPush(attribute: [string, string]): void;
}

interface MarkdownEnvironment {
  page?: { inputPath?: string };
  _taskListId?: number;
  _headingSlugs?: Record<string, number>;
}

interface MarkdownState {
  env?: MarkdownEnvironment;
  tokens: MarkdownToken[];
  Token: new (type: string, tag: string, nesting: number) => MarkdownToken;
}

interface MarkdownRendererSelf {
  renderToken(tokens: MarkdownToken[], index: number, options: unknown): string;
}

type MarkdownRenderArguments = [
  tokens: MarkdownToken[],
  index: number,
  options: unknown,
  environment: MarkdownEnvironment,
  self: MarkdownRendererSelf,
];

type MarkdownRenderRule = (...rendererArguments: MarkdownRenderArguments) => string;

export interface MarkdownLibrary {
  set(options: {
    html: boolean;
    linkify: boolean;
    highlight: (source: string, lang: string) => string;
  }): void;
  core: {
    ruler: {
      push(name: string, plugin: (state: MarkdownState) => void): void;
      after(before: string, name: string, plugin: (state: MarkdownState) => void): void;
    };
  };
  renderer: {
    rules: {
      link_open?: MarkdownRenderRule;
      heading_open?: MarkdownRenderRule;
    };
  };
}

function sanitizeLanguage(lang: unknown): string {
  const cleaned = asString(lang ?? "text").replaceAll(/[^a-zA-Z0-9_+-]/g, "");
  return cleaned || "text";
}

const LANGUAGE_ALIASES: Record<string, string> = {
  py: "python",
  python3: "python",
  curl: "bash",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  fish: "bash",
  txt: "text",
  text: "text",
  plaintext: "text",
  "robots.txt": "text",
  robotstxt: "text",
  js: "javascript",
  ts: "typescript",
  yml: "yaml",
  md: "markdown",
  html: "markup",
  xml: "markup",
  svg: "markup",
  ps1: "powershell",
  pwsh: "powershell",
  posh: "powershell",
};

function resolveLanguage(lang: unknown): string {
  const raw = asStringOrEmpty(lang).trim().toLowerCase();
  if (!raw) {
    return "text";
  }
  const aliased = LANGUAGE_ALIASES[raw];
  if (aliased !== undefined) {
    return aliased;
  }
  const cleaned = sanitizeLanguage(raw).toLowerCase();
  return LANGUAGE_ALIASES[cleaned] ?? (cleaned || "text");
}

function hasPrismLanguage(lang: string): boolean {
  if (!lang || lang === "text") {
    return false;
  }
  if (Object.hasOwn(Prism.languages, lang)) {
    return true;
  }
  try {
    loadLanguages([lang]);
  } catch {
    return false;
  }
  return Object.hasOwn(Prism.languages, lang);
}

function wrapCodeBlock(lang: string, innerHtml: string): string {
  const safeLang = sanitizeLanguage(lang);
  return `<pre class="language-${safeLang}"><code class="language-${safeLang}">${innerHtml}</code></pre>`;
}

function highlightCode(source: string, lang: string): string {
  const language = resolveLanguage(lang);
  if (language === "text" || !hasPrismLanguage(language)) {
    return wrapCodeBlock(language === "text" ? "text" : language, escapeHtml(source));
  }
  const grammar = Prism.languages[language];
  if (grammar === undefined) {
    return wrapCodeBlock(language, escapeHtml(source));
  }
  // Prism.highlight escapes HTML in the source; safe for exploit/payload samples.
  return wrapCodeBlock(language, Prism.highlight(source, grammar, language));
}

function slugifyHeading(text: string): string {
  return text
    .replaceAll(/<[^>]*>/g, "")
    .normalize("NFKD")
    .replaceAll(/[\u{0300}-\u{036F}]/gu, "")
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function uniqueSlug(base: string, seen: Record<string, number>): string {
  const fallback = base || "section";
  const count = seen[fallback];
  if (count === undefined) {
    seen[fallback] = 0;
    return fallback;
  }
  const next = count + 1;
  seen[fallback] = next;
  return `${fallback}-${String(next)}`;
}

interface TocItem {
  level: string;
  id: string;
  title: string;
}

function buildToc(content?: unknown): string {
  if (!content) {
    return "";
  }
  const html = asString(content);
  // Skip the title h1; include shifted section headings (h2–h4).
  const headingPattern = /<h([2-4])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  const items: TocItem[] = [];
  let match = headingPattern.exec(html);
  while (match) {
    const level = match[1];
    const id = match[2];
    const rawTitle = match[3];
    if (level !== undefined && id !== undefined && rawTitle !== undefined) {
      const title = unescapeHtml(rawTitle.replaceAll(/<[^>]+>/g, "").trim());
      if (title) {
        items.push({ level, id, title });
      }
    }
    match = headingPattern.exec(html);
  }
  if (items.length < 2) {
    return "";
  }
  const lines = ['<ul class="toc__list">'];
  for (const item of items) {
    lines.push(
      `<li class="toc__item toc__item--h${item.level}">` +
        `<a href="#${escapeHtml(item.id)}">${escapeHtml(item.title)}</a>` +
        `</li>`,
    );
  }
  lines.push("</ul>");
  return lines.join("");
}

function headingCloseToken(tokens: MarkdownToken[], start: number): MarkdownToken | undefined {
  return tokens.slice(start + 1).find((token) => token.type === "heading_close");
}

/**
 * Demote every markdown heading one level (# → h2, ## → h3, …, capped at h6).
 * Page title is rendered by the post layout from front matter.
 * Skip hacklas notes — those keep author markdown headings as written.
 */
function demoteBodyHeadings(state: MarkdownState): void {
  const inputPath = state.env?.page?.inputPath;
  if (isContentMarkdown(inputPath, "hacklas")) {
    return;
  }
  for (const [index, open] of state.tokens.entries()) {
    if (open.type !== "heading_open") {
      continue;
    }
    const close = headingCloseToken(state.tokens, index);
    const level = Math.trunc(Number(open.tag.slice(1)));
    const nextLevel = Number.isFinite(level) ? Math.min(level + 1, 6) : 2;
    const tag = `h${String(nextLevel)}`;
    open.tag = tag;
    if (close) {
      close.tag = tag;
    }
  }
}

/**
 * Headings longer than this are treated as bold callouts, not section titles.
 */
const LONG_HEADING_CHARS = 80;

interface HeadingParts {
  open: MarkdownToken;
  inline: MarkdownToken;
  close: MarkdownToken;
}

function headingParts(tokens: MarkdownToken[], index: number): HeadingParts | undefined {
  const open = tokens[index];
  if (open?.type !== "heading_open") {
    return;
  }
  const inline = tokens[index + 1];
  const close = tokens[index + 2];
  if (inline?.type !== "inline" || close?.type !== "heading_close") {
    return;
  }
  return { open, inline, close };
}

function convertLongHeading(state: MarkdownState, parts: HeadingParts): void {
  const text = (parts.inline.content || "").trim();
  if (text.length < LONG_HEADING_CHARS) {
    return;
  }
  parts.open.type = "paragraph_open";
  parts.open.tag = "p";
  parts.open.markup = "";
  parts.open.attrs = undefined;
  parts.close.type = "paragraph_close";
  parts.close.tag = "p";
  parts.close.markup = "";
  const strongOpen = new state.Token("strong_open", "strong", 1);
  const strongClose = new state.Token("strong_close", "strong", -1);
  const fallbackText = Object.assign(new state.Token("text", "", 0), { content: text });
  parts.inline.children = parts.inline.children
    ? [strongOpen, ...parts.inline.children, strongClose]
    : [strongOpen, fallbackText, strongClose];
}

/**
 * Hacklas notes sometimes use #### for long bold notes. Turn those into
 * <p><strong>…</strong></p> so they don't land in the TOC or look like titles.
 */
function softenLongHeadings(state: MarkdownState): void {
  const inputPath = state.env?.page?.inputPath;
  if (!isContentMarkdown(inputPath, "hacklas")) {
    return;
  }
  for (const index of state.tokens.keys()) {
    const parts = headingParts(state.tokens, index);
    if (parts) {
      convertLongHeading(state, parts);
    }
  }
}

const TASK_ITEM_RE = /^\[([ xX])\]\s+/;

function listItemToken(tokens: MarkdownToken[], index: number): MarkdownToken | undefined {
  const previous = tokens[index - 1];
  const beforePrevious = tokens[index - 2];
  if (previous?.type === "paragraph_open" && beforePrevious?.type === "list_item_open") {
    return beforePrevious;
  }
  if (previous?.type === "list_item_open") {
    return previous;
  }
}

function markTaskList(tokens: MarkdownToken[], index: number): void {
  const open = tokens
    .slice(0, index)
    .findLast((token) => token.type === "bullet_list_open" || token.type === "bullet_list_close");
  if (open?.type === "bullet_list_open" && !/\btask-list\b/.test(open.attrGet("class") ?? "")) {
    open.attrJoin("class", "task-list");
  }
}

function wrapTaskCheckbox(state: MarkdownState, inline: MarkdownToken, isChecked: boolean): void {
  const environment = (state.env ??= {});
  const id = `task-${String((environment._taskListId = (environment._taskListId ?? 0) + 1))}`;
  const checkbox = new state.Token("checkbox", "input", 0);
  checkbox.attrSet("type", "checkbox");
  checkbox.attrSet("class", "task-list-item__checkbox");
  checkbox.attrSet("id", id);
  if (isChecked) {
    checkbox.attrSet("checked", "");
  }
  const controlOpen = new state.Token("label_open", "label", 1);
  controlOpen.attrSet("class", "task-list-item__control");
  controlOpen.attrSet("for", id);
  const controlClose = new state.Token("label_close", "label", -1);
  const bodyOpen = new state.Token("label_open", "label", 1);
  bodyOpen.attrSet("class", "task-list-item__body");
  bodyOpen.attrSet("for", id);
  const bodyClose = new state.Token("label_close", "label", -1);
  const rest = inline.children ?? [];
  inline.children = [controlOpen, checkbox, controlClose, bodyOpen, ...rest, bodyClose];
}

function applyTaskItem(
  state: MarkdownState,
  tokens: MarkdownToken[],
  item: { index: number; inline: MarkdownToken; listItem: MarkdownToken },
): void {
  const match = TASK_ITEM_RE.exec(item.inline.content);
  const marker = match?.[1];
  if (match === null || marker === undefined) {
    return;
  }
  const isChecked = marker.toLowerCase() === "x";
  item.inline.content = item.inline.content.slice(match[0].length);
  const first = item.inline.children?.at(0);
  if (first?.type === "text") {
    first.content = first.content.replace(TASK_ITEM_RE, "");
  }
  if (!/\btask-list-item\b/.test(item.listItem.attrGet("class") ?? "")) {
    item.listItem.attrJoin("class", "task-list-item");
  }
  markTaskList(tokens, item.index);
  wrapTaskCheckbox(state, item.inline, isChecked);
}

/**
 * Turn GitHub-style `- [ ]` / `- [x]` list items into real checkboxes.
 * Needed for hacklas checklists (and any other markdown that uses them).
 */
function renderTaskLists(state: MarkdownState): void {
  const tokens = state.tokens;
  for (const [index, inline] of tokens.entries()) {
    if (inline.type !== "inline" || !inline.content) {
      continue;
    }
    const listItem = listItemToken(tokens, index);
    if (listItem) {
      applyTaskItem(state, tokens, { index, inline, listItem });
    }
  }
}

function markBangImage(children: MarkdownToken[], index: number): void {
  const child = children[index];
  if (child?.type !== "image") {
    return;
  }
  const previous = children[index - 1];
  if (previous?.type !== "text" || !previous.content.endsWith("!")) {
    return;
  }
  previous.content = previous.content.slice(0, -1);
  child.attrJoin("class", "prose-img--full");
  if (previous.content === "") {
    children.splice(index - 1, 1);
  }
}

/**
 * `!![alt](src)` is a full-width image. markdown-it already parses that as a
 * literal "!" plus a normal image; strip the extra bang and mark the img.
 */
function markFullWidthImages(state: MarkdownState): void {
  for (const token of state.tokens) {
    if (token.type !== "inline" || !token.children) {
      continue;
    }
    const children = token.children;
    for (let index = children.length - 1; index >= 0; index -= 1) {
      markBangImage(children, index);
    }
  }
}

function rewriteRelativeMarkdownPath(pathPart: string, suffix: string): string {
  if (pathPart.startsWith("/")) {
    const withSlash = pathPart.endsWith("/") ? pathPart : `${pathPart}/`;
    const prefixed = withPathPrefix(withSlash);
    return (typeof prefixed === "string" ? prefixed : withSlash) + suffix;
  }
  const relative = pathPart.startsWith("./") ? `../${pathPart.slice(2)}` : `../${pathPart}`;
  const withSlash = relative.endsWith("/") ? relative : `${relative}/`;
  return withSlash + suffix;
}

/**
 * Rewrite relative *.md links for Eleventy pretty URLs.
 * Source files sit beside each other, but pages live in …/slug/ directories,
 * so `./note.md` must become `../note/` (not `./note.md` or `./note/`).
 */
function rewriteMarkdownLinkHref(href: unknown): unknown {
  if (!href || typeof href !== "string") {
    return href;
  }
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#|\?)/i.test(href)) {
    return href;
  }
  const match = /^(.*?)(\.md)([?#][\s\S]*)?$/i.exec(href);
  if (!match) {
    return href;
  }
  return rewriteRelativeMarkdownPath(match[1] ?? "", match[3] ?? "");
}

function isExternalHref(href: unknown): boolean {
  return /^(https?:|mailto:|tel:)/i.test(asStringOrEmpty(href));
}

function setLinkAttribute(token: MarkdownToken, name: string, value: string): void {
  const attributeIndex = token.attrIndex(name);
  const attributes = token.attrs;
  const pair = attributes?.[attributeIndex];
  if (pair === undefined || attributeIndex < 0) {
    token.attrPush([name, value]);
    return;
  }
  pair[1] = value;
}

function renderDefaultLinkOpen(...rendererArguments: MarkdownRenderArguments): string {
  const [tokens, index, options, , self] = rendererArguments;
  return self.renderToken(tokens, index, options);
}

function tokenHref(token: MarkdownToken): { index: number; value: string } | undefined {
  const hrefIndex = token.attrIndex("href");
  const pair = token.attrs?.[hrefIndex];
  if (pair === undefined || hrefIndex < 0) {
    return;
  }
  return { index: hrefIndex, value: pair[1] };
}

function renderLinkOpen(
  defaultLinkOpen: MarkdownRenderRule,
  ...rendererArguments: MarkdownRenderArguments
): string {
  const [tokens, index, options, environment, self] = rendererArguments;
  const token = tokens[index];
  if (token === undefined) {
    return defaultLinkOpen(...rendererArguments);
  }
  const href = tokenHref(token);
  if (href !== undefined) {
    const rewritten = rewriteMarkdownLinkHref(href.value);
    const pair = token.attrs?.[href.index];
    if (pair !== undefined) {
      pair[1] = asString(rewritten);
    }
  }
  const currentHref = tokenHref(token)?.value ?? "";
  if (isExternalHref(currentHref)) {
    setLinkAttribute(token, "target", "_blank");
    setLinkAttribute(token, "rel", "noopener noreferrer");
  }
  return defaultLinkOpen(tokens, index, options, environment, self);
}

function headingText(tokens: MarkdownToken[], index: number): string {
  const inline = tokens[index + 1];
  if (inline?.children) {
    return inline.children.map((child) => child.content).join("");
  }
  return inline?.content ?? "";
}

function renderHeadingOpen(...rendererArguments: MarkdownRenderArguments): string {
  const [tokens, index, options, environment, self] = rendererArguments;
  const token = tokens[index];
  if (token === undefined) {
    return self.renderToken(tokens, index, options);
  }
  environment._headingSlugs ??= {};
  const slug = uniqueSlug(slugifyHeading(headingText(tokens, index)), environment._headingSlugs);
  token.attrSet("id", slug);
  return self.renderToken(tokens, index, options);
}

function configureMarkdown(markdownLibrary: MarkdownLibrary): void {
  markdownLibrary.set({
    html: false,
    linkify: true,
    highlight: highlightCode,
  });
  const corePlugins: [string, (state: MarkdownState) => void][] = [
    ["demote_body_headings", demoteBodyHeadings],
    ["soften_long_headings", softenLongHeadings],
  ];
  for (const [name, plugin] of corePlugins) {
    markdownLibrary.core.ruler.push(name, plugin);
  }
  markdownLibrary.core.ruler.after("inline", "task_lists", renderTaskLists);
  markdownLibrary.core.ruler.after("inline", "full_width_images", markFullWidthImages);

  const defaultLinkOpen = markdownLibrary.renderer.rules.link_open ?? renderDefaultLinkOpen;
  markdownLibrary.renderer.rules.link_open = (...rendererArguments) =>
    renderLinkOpen(defaultLinkOpen, ...rendererArguments);
  markdownLibrary.renderer.rules.heading_open = renderHeadingOpen;
}

function warmPrismLanguages(): void {
  loadLanguages(["bash", "python", "json", "php", "markup", "c", "javascript"]);
}

export { buildToc, configureMarkdown, warmPrismLanguages };

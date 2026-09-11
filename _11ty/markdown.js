import Prism from "prismjs";
import loadLanguages from "prismjs/components/index.js";
import { withPathPrefix } from "./paths.js";
import { escapeHtml, unescapeHtml } from "./text.js";
import { isContentMarkdown } from "./content.js";

loadLanguages.silent = true;

function sanitizeLanguage(lang) {
  const cleaned = String(lang || "text").replaceAll(/[^a-zA-Z0-9_+-]/g, "");
  return cleaned || "text";
}

const LANGUAGE_ALIASES = {
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

function resolveLanguage(lang) {
  const raw = String(lang || "")
    .trim()
    .toLowerCase();
  if (!raw) {
    return "text";
  }
  if (Object.hasOwn(LANGUAGE_ALIASES, raw)) {
    return LANGUAGE_ALIASES[raw];
  }
  const cleaned = sanitizeLanguage(raw).toLowerCase();
  return LANGUAGE_ALIASES[cleaned] || cleaned || "text";
}

function hasPrismLanguage(lang) {
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

function wrapCodeBlock(lang, innerHtml) {
  const safeLang = sanitizeLanguage(lang);
  return `<pre class="language-${safeLang}"><code class="language-${safeLang}">${innerHtml}</code></pre>`;
}

function highlightCode(source, lang) {
  const language = resolveLanguage(lang);
  if (language === "text" || !hasPrismLanguage(language)) {
    return wrapCodeBlock(language === "text" ? "text" : language, escapeHtml(source));
  }
  // Prism.highlight escapes HTML in the source; safe for exploit/payload samples.
  const highlighted = Prism.highlight(source, Prism.languages[language], language);
  return wrapCodeBlock(language, highlighted);
}

function slugifyHeading(text) {
  return String(text)
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

function uniqueSlug(base, seen) {
  const fallback = base || "section";
  if (!Object.hasOwn(seen, fallback)) {
    seen[fallback] = 0;
    return fallback;
  }
  seen[fallback] += 1;
  return `${fallback}-${seen[fallback]}`;
}

function buildToc(content) {
  if (!content) {
    return "";
  }
  // Skip the title h1; include shifted section headings (h2–h4).
  const headingPattern = /<h([2-4])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  const items = [];
  let match = headingPattern.exec(content);
  while (match) {
    const level = match[1];
    const id = match[2];
    const title = unescapeHtml(match[3].replaceAll(/<[^>]+>/g, "").trim());
    if (title) {
      items.push({ level, id, title });
    }
    match = headingPattern.exec(content);
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

function headingCloseToken(tokens, start) {
  return tokens.slice(start + 1).find((token) => token.type === "heading_close");
}

/**
 * Demote every markdown heading one level (# → h2, ## → h3, …, capped at h6).
 * Page title is rendered by the post layout from front matter.
 * Skip hacklas notes — those keep author markdown headings as written.
 */
function demoteBodyHeadings(state) {
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
    const tag = `h${nextLevel}`;
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

function headingParts(tokens, index) {
  const open = tokens[index];
  if (open.type !== "heading_open") {
    return;
  }
  const inline = tokens[index + 1];
  const close = tokens[index + 2];
  if (inline?.type !== "inline" || close?.type !== "heading_close") {
    return;
  }
  return { open, inline, close };
}

function convertLongHeading(state, parts) {
  const text = String(parts.inline.content || "").trim();
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
function softenLongHeadings(state) {
  const inputPath = state.env?.page?.inputPath;
  if (!isContentMarkdown(inputPath, "hacklas")) {
    return;
  }
  for (const [index] of state.tokens.entries()) {
    const parts = headingParts(state.tokens, index);
    if (parts) {
      convertLongHeading(state, parts);
    }
  }
}

const TASK_ITEM_RE = /^\[([ xX])\]\s+/;

function listItemToken(tokens, index) {
  if (
    tokens[index - 1]?.type === "paragraph_open" &&
    tokens[index - 2]?.type === "list_item_open"
  ) {
    return tokens[index - 2];
  }
  if (tokens[index - 1]?.type === "list_item_open") {
    return tokens[index - 1];
  }
}

function markTaskList(tokens, index) {
  const open = tokens
    .slice(0, index)
    .findLast((token) => token.type === "bullet_list_open" || token.type === "bullet_list_close");
  if (open?.type === "bullet_list_open" && !/\btask-list\b/.test(open.attrGet("class") || "")) {
    open.attrJoin("class", "task-list");
  }
}

function wrapTaskCheckbox(state, inline, isChecked) {
  const environment = (state.env ||= {});
  const id = `task-${(environment._taskListId = (environment._taskListId || 0) + 1)}`;
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
  const rest = inline.children || [];
  inline.children = [controlOpen, checkbox, controlClose, bodyOpen, ...rest, bodyClose];
}

function applyTaskItem(state, tokens, { index, inline, listItem }) {
  const match = inline.content.match(TASK_ITEM_RE);
  if (!match) {
    return;
  }
  const isChecked = match[1].toLowerCase() === "x";
  inline.content = inline.content.slice(match[0].length);
  const first = inline.children?.at(0);
  if (first?.type === "text") {
    first.content = first.content.replace(TASK_ITEM_RE, "");
  }
  if (!/\btask-list-item\b/.test(listItem.attrGet("class") || "")) {
    listItem.attrJoin("class", "task-list-item");
  }
  markTaskList(tokens, index);
  wrapTaskCheckbox(state, inline, isChecked);
}

/**
 * Turn GitHub-style `- [ ]` / `- [x]` list items into real checkboxes.
 * Needed for hacklas checklists (and any other markdown that uses them).
 */
function renderTaskLists(state) {
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

function markBangImage(children, index) {
  const child = children[index];
  if (child.type !== "image") {
    return;
  }
  const previous = children[index - 1];
  if (!previous || previous.type !== "text" || !previous.content.endsWith("!")) {
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
function markFullWidthImages(state) {
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

/**
 * Rewrite relative *.md links for Eleventy pretty URLs.
 * Source files sit beside each other, but pages live in …/slug/ directories,
 * so `./note.md` must become `../note/` (not `./note.md` or `./note/`).
 */
function rewriteMarkdownLinkHref(href) {
  if (!href || typeof href !== "string") {
    return href;
  }
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#|\?)/i.test(href)) {
    return href;
  }
  const match = href.match(/^(.*?)(\.md)([?#][\s\S]*)?$/i);
  if (!match) {
    return href;
  }
  let pathPart = match[1];
  const suffix = match[3] || "";
  if (pathPart.startsWith("/")) {
    // Site-root path: /hacklas/foo.md → /hacklas/foo/ (honours PATH_PREFIX)
    if (!pathPart.endsWith("/")) {
      pathPart += "/";
    }
    return withPathPrefix(pathPart) + suffix;
  }
  // Pretty-URL pages are one directory deeper than the source .md file.
  pathPart = pathPart.startsWith("./") ? `../${pathPart.slice(2)}` : `../${pathPart}`;
  if (!pathPart.endsWith("/")) {
    pathPart += "/";
  }
  return pathPart + suffix;
}

function isExternalHref(href) {
  return /^(https?:|mailto:|tel:)/i.test(String(href || ""));
}

function setLinkAttribute(token, name, value) {
  const attributeIndex = token.attrIndex(name);
  if (attributeIndex < 0) {
    token.attrPush([name, value]);
    return;
  }
  token.attrs[attributeIndex][1] = value;
}

function renderDefaultLinkOpen(...rendererArguments) {
  const [tokens, index, options, , self] = rendererArguments;
  return self.renderToken(tokens, index, options);
}

function renderLinkOpen(defaultLinkOpen, ...rendererArguments) {
  const [tokens, index] = rendererArguments;
  const token = tokens[index];
  const hrefIndex = token.attrIndex("href");
  if (hrefIndex >= 0) {
    token.attrs[hrefIndex][1] = rewriteMarkdownLinkHref(token.attrs[hrefIndex][1]);
  }
  const href = hrefIndex >= 0 ? token.attrs[hrefIndex][1] : "";
  if (isExternalHref(href)) {
    setLinkAttribute(token, "target", "_blank");
    setLinkAttribute(token, "rel", "noopener noreferrer");
  }
  return defaultLinkOpen(...rendererArguments);
}

function headingText(tokens, index) {
  const inline = tokens[index + 1];
  if (inline?.children) {
    return inline.children.map((child) => child.content || "").join("");
  }
  return inline?.content || "";
}

function renderHeadingOpen(...rendererArguments) {
  const [tokens, index, options, environment, self] = rendererArguments;
  const token = tokens[index];
  environment._headingSlugs ||= Object.create(null);
  const slug = uniqueSlug(slugifyHeading(headingText(tokens, index)), environment._headingSlugs);
  token.attrSet("id", slug);
  return self.renderToken(tokens, index, options);
}

function configureMarkdown(markdownLibrary) {
  markdownLibrary.set({
    html: false,
    linkify: true,
    highlight: highlightCode,
  });
  const corePlugins = [
    ["demote_body_headings", demoteBodyHeadings],
    ["soften_long_headings", softenLongHeadings],
  ];
  for (const [name, plugin] of corePlugins) {
    markdownLibrary.core.ruler.push(name, plugin);
  }
  markdownLibrary.core.ruler.after("inline", "task_lists", renderTaskLists);
  markdownLibrary.core.ruler.after("inline", "full_width_images", markFullWidthImages);

  const defaultLinkOpen = markdownLibrary.renderer.rules.link_open || renderDefaultLinkOpen;
  markdownLibrary.renderer.rules.link_open = (...rendererArguments) =>
    renderLinkOpen(defaultLinkOpen, ...rendererArguments);
  markdownLibrary.renderer.rules.heading_open = renderHeadingOpen;
}

function warmPrismLanguages() {
  loadLanguages(["bash", "python", "json", "php", "markup", "c", "javascript"]);
}

export { buildToc, configureMarkdown, warmPrismLanguages };

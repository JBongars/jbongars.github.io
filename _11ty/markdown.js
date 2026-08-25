const Prism = require("prismjs");
const loadLanguages = require("prismjs/components/index.js");
const { withPathPrefix } = require("./paths");
const { escapeHtml } = require("./text");
const { isContentMarkdown } = require("./content");

loadLanguages.silent = true;

function sanitizeLanguage(lang) {
  const cleaned = String(lang || "text").replace(/[^a-zA-Z0-9_+-]/g, "");
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
  if (!raw) return "text";
  if (LANGUAGE_ALIASES[raw]) return LANGUAGE_ALIASES[raw];
  const cleaned = sanitizeLanguage(raw).toLowerCase();
  return LANGUAGE_ALIASES[cleaned] || cleaned || "text";
}

function hasPrismLanguage(lang) {
  if (!lang || lang === "text") return false;
  if (Prism.languages[lang]) return true;
  try {
    loadLanguages([lang]);
  } catch (_) {
    return false;
  }
  return Boolean(Prism.languages[lang]);
}

function wrapCodeBlock(lang, innerHtml) {
  const safeLang = sanitizeLanguage(lang);
  return `<pre class="language-${safeLang}"><code class="language-${safeLang}">${innerHtml}</code></pre>`;
}

function highlightCode(str, lang) {
  const language = resolveLanguage(lang);

  if (language === "text" || !hasPrismLanguage(language)) {
    return wrapCodeBlock(language === "text" ? "text" : language, escapeHtml(str));
  }

  // Prism.highlight escapes HTML in the source; safe for exploit/payload samples.
  const highlighted = Prism.highlight(str, Prism.languages[language], language);
  return wrapCodeBlock(language, highlighted);
}

function slugifyHeading(text) {
  return String(text)
    .replace(/<[^>]*>/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueSlug(base, seen) {
  const fallback = base || "section";
  if (seen[fallback] == null) {
    seen[fallback] = 0;
    return fallback;
  }
  seen[fallback] += 1;
  return `${fallback}-${seen[fallback]}`;
}

function buildToc(content) {
  if (!content) return "";

  // Skip the title h1; include shifted section headings (h2–h4).
  const headingPattern = /<h([2-4])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  const items = [];
  let match;

  while ((match = headingPattern.exec(content)) !== null) {
    const level = match[1];
    const id = match[2];
    const title = match[3].replace(/<[^>]+>/g, "").trim();
    if (!title) continue;
    items.push({ level, id, title });
  }

  if (items.length < 2) return "";

  const lines = ['<ul class="toc__list">'];
  for (const item of items) {
    lines.push(
      `<li class="toc__item toc__item--h${item.level}">` +
        `<a href="#${escapeHtml(item.id)}">${escapeHtml(item.title)}</a>` +
        `</li>`
    );
  }
  lines.push("</ul>");
  return lines.join("");
}

/**
 * Demote every markdown heading one level (# → h2, ## → h3, …, capped at h6).
 * Page title is rendered by the post layout from front matter.
 * Skip hacklas notes — those keep author markdown headings as written.
 */
function demoteBodyHeadings(state) {
  const inputPath = state.env?.page?.inputPath;
  if (isContentMarkdown(inputPath, "hacklas")) return;

  for (let i = 0; i < state.tokens.length; i++) {
    const open = state.tokens[i];
    if (open.type !== "heading_open") continue;

    let close = null;
    for (let j = i + 1; j < state.tokens.length; j++) {
      if (state.tokens[j].type === "heading_close") {
        close = state.tokens[j];
        break;
      }
    }

    const level = Number.parseInt(open.tag.slice(1), 10);
    const nextLevel = Number.isFinite(level) ? Math.min(level + 1, 6) : 2;
    const tag = `h${nextLevel}`;
    open.tag = tag;
    if (close) close.tag = tag;
  }
}

/** Headings longer than this are treated as bold callouts, not section titles. */
const LONG_HEADING_CHARS = 80;

/**
 * Hacklas notes sometimes use #### for long bold notes. Turn those into
 * <p><strong>…</strong></p> so they don't land in the TOC or look like titles.
 */
function softenLongHeadings(state) {
  const inputPath = state.env?.page?.inputPath;
  if (!isContentMarkdown(inputPath, "hacklas")) return;

  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    const open = tokens[i];
    if (open.type !== "heading_open") continue;

    const inline = tokens[i + 1];
    const close = tokens[i + 2];
    if (!inline || inline.type !== "inline" || !close || close.type !== "heading_close") {
      continue;
    }

    const text = String(inline.content || "").trim();
    if (text.length < LONG_HEADING_CHARS) continue;

    open.type = "paragraph_open";
    open.tag = "p";
    open.markup = "";
    if (open.attrs) open.attrs = null;

    close.type = "paragraph_close";
    close.tag = "p";
    close.markup = "";

    const strongOpen = new state.Token("strong_open", "strong", 1);
    const strongClose = new state.Token("strong_close", "strong", -1);
    inline.children = inline.children
      ? [strongOpen, ...inline.children, strongClose]
      : [
          strongOpen,
          Object.assign(new state.Token("text", "", 0), { content: text }),
          strongClose,
        ];
  }
}

const TASK_ITEM_RE = /^\[([ xX])\]\s+/;

/**
 * Turn GitHub-style `- [ ]` / `- [x]` list items into real checkboxes.
 * Needed for hacklas checklists (and any other markdown that uses them).
 */
function renderTaskLists(state) {
  const tokens = state.tokens;

  for (let i = 0; i < tokens.length; i++) {
    const inline = tokens[i];
    if (inline.type !== "inline" || !inline.content) continue;

    let listItem = null;
    if (
      tokens[i - 1]?.type === "paragraph_open" &&
      tokens[i - 2]?.type === "list_item_open"
    ) {
      listItem = tokens[i - 2];
    } else if (tokens[i - 1]?.type === "list_item_open") {
      listItem = tokens[i - 1];
    }
    if (!listItem) continue;

    const match = inline.content.match(TASK_ITEM_RE);
    if (!match) continue;

    const checked = match[1].toLowerCase() === "x";
    inline.content = inline.content.slice(match[0].length);

    if (inline.children && inline.children.length) {
      const first = inline.children[0];
      if (first.type === "text") {
        first.content = first.content.replace(TASK_ITEM_RE, "");
      }
    }

    if (!/\btask-list-item\b/.test(listItem.attrGet("class") || "")) {
      listItem.attrJoin("class", "task-list-item");
    }

    for (let j = i - 1; j >= 0; j--) {
      if (tokens[j].type === "bullet_list_open") {
        if (!/\btask-list\b/.test(tokens[j].attrGet("class") || "")) {
          tokens[j].attrJoin("class", "task-list");
        }
        break;
      }
      if (tokens[j].type === "bullet_list_close") break;
    }

    const env = state.env || (state.env = {});
    const id = `task-${(env._taskListId = (env._taskListId || 0) + 1)}`;

    const checkbox = new state.Token("checkbox", "input", 0);
    checkbox.attrSet("type", "checkbox");
    checkbox.attrSet("class", "task-list-item__checkbox");
    checkbox.attrSet("id", id);
    if (checked) checkbox.attrSet("checked", "");

    const controlOpen = new state.Token("label_open", "label", 1);
    controlOpen.attrSet("class", "task-list-item__control");
    controlOpen.attrSet("for", id);
    const controlClose = new state.Token("label_close", "label", -1);

    const bodyOpen = new state.Token("label_open", "label", 1);
    bodyOpen.attrSet("class", "task-list-item__body");
    bodyOpen.attrSet("for", id);
    const bodyClose = new state.Token("label_close", "label", -1);

    const rest = inline.children || [];
    inline.children = [
      controlOpen,
      checkbox,
      controlClose,
      bodyOpen,
      ...rest,
      bodyClose,
    ];
  }
}

/**
 * `!![alt](src)` is a full-width image. markdown-it already parses that as a
 * literal "!" plus a normal image; strip the extra bang and mark the img.
 */
function markFullWidthImages(state) {
  for (const token of state.tokens) {
    if (token.type !== "inline" || !token.children) continue;

    const children = token.children;
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child.type !== "image") continue;

      const prev = children[i - 1];
      if (!prev || prev.type !== "text" || !prev.content.endsWith("!")) {
        continue;
      }

      prev.content = prev.content.slice(0, -1);
      child.attrJoin("class", "prose-img--full");
      if (prev.content === "") children.splice(i - 1, 1);
    }
  }
}

/**
 * Rewrite relative *.md links for Eleventy pretty URLs.
 * Source files sit beside each other, but pages live in …/slug/ directories,
 * so `./note.md` must become `../note/` (not `./note.md` or `./note/`).
 */
function rewriteMarkdownLinkHref(href) {
  if (!href || typeof href !== "string") return href;
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#|\?)/i.test(href)) return href;

  const match = href.match(/^(.*?)(\.md)([?#][\s\S]*)?$/i);
  if (!match) return href;

  let pathPart = match[1];
  const suffix = match[3] || "";

  if (pathPart.startsWith("/")) {
    // Site-root path: /hacklas/foo.md → /hacklas/foo/ (honours PATH_PREFIX)
    if (!pathPart.endsWith("/")) pathPart += "/";
    return withPathPrefix(pathPart) + suffix;
  }

  // Pretty-URL pages are one directory deeper than the source .md file.
  if (pathPart.startsWith("./")) {
    pathPart = `../${pathPart.slice(2)}`;
  } else {
    pathPart = `../${pathPart}`;
  }

  if (!pathPart.endsWith("/")) pathPart += "/";
  return pathPart + suffix;
}

function isExternalHref(href) {
  return /^(https?:|mailto:|tel:)/i.test(String(href || ""));
}

function configureMarkdown(mdLib) {
  mdLib.set({
    html: false,
    linkify: true,
    highlight: highlightCode,
  });

  mdLib.core.ruler.push("demote_body_headings", demoteBodyHeadings);
  mdLib.core.ruler.push("soften_long_headings", softenLongHeadings);
  mdLib.core.ruler.after("inline", "task_lists", renderTaskLists);
  mdLib.core.ruler.after("inline", "full_width_images", markFullWidthImages);

  const defaultLinkOpen =
    mdLib.renderer.rules.link_open ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  mdLib.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const hrefIndex = token.attrIndex("href");
    if (hrefIndex >= 0) {
      token.attrs[hrefIndex][1] = rewriteMarkdownLinkHref(
        token.attrs[hrefIndex][1]
      );
    }

    const href = hrefIndex >= 0 ? token.attrs[hrefIndex][1] : "";
    if (isExternalHref(href)) {
      const targetIndex = token.attrIndex("target");
      if (targetIndex < 0) {
        token.attrPush(["target", "_blank"]);
      } else {
        token.attrs[targetIndex][1] = "_blank";
      }

      const relIndex = token.attrIndex("rel");
      if (relIndex < 0) {
        token.attrPush(["rel", "noopener noreferrer"]);
      } else {
        token.attrs[relIndex][1] = "noopener noreferrer";
      }
    }

    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  mdLib.renderer.rules.heading_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const inline = tokens[idx + 1];
    const text =
      inline && inline.children
        ? inline.children.map((child) => child.content || "").join("")
        : inline?.content || "";

    env._headingSlugs = env._headingSlugs || Object.create(null);
    const slug = uniqueSlug(slugifyHeading(text), env._headingSlugs);
    token.attrSet("id", slug);

    return self.renderToken(tokens, idx, options);
  };
}

function warmPrismLanguages() {
  loadLanguages(["bash", "python", "json", "php", "markup", "c", "javascript"]);
}

module.exports = { buildToc, configureMarkdown, warmPrismLanguages };

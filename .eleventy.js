const fs = require("node:fs");
const path = require("node:path");
const Prism = require("prismjs");
const loadLanguages = require("prismjs/components/index.js");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const { eleventyImageTransformPlugin } = require("@11ty/eleventy-img");
const features = require("./src/_data/features.json");
const security = require("./src/_data/security.js");

loadLanguages.silent = true;

/**
 * Site root for GitHub Pages. User site: SITE_URL=https://jbongars.github.io/
 * Project Pages still work via PATH_PREFIX=/repo/ or a SITE_URL pathname.
 */
function resolvePathPrefix() {
  const fromEnv = process.env.PATH_PREFIX || process.env.ELEVENTY_PATH_PREFIX;
  let raw = fromEnv;
  if (!raw && process.env.SITE_URL) {
    try {
      raw = new URL(process.env.SITE_URL).pathname;
    } catch {
      raw = process.env.SITE_URL;
    }
  }
  if (!raw || raw === "/") return "/";
  let p = String(raw).trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1 && !p.endsWith("/")) p = `${p}/`;
  return p;
}

const pathPrefix = resolvePathPrefix();

/** Prepend pathPrefix to a root-absolute path (/css/… → /prefix/css/…). */
function withPathPrefix(href) {
  if (!href || typeof href !== "string" || !href.startsWith("/")) return href;
  if (pathPrefix === "/") return href;
  return pathPrefix.replace(/\/$/, "") + href;
}

function siteOrigin() {
  const raw = process.env.SITE_URL;
  return raw ? String(raw).replace(/\/?$/, "") : "";
}

function absoluteHref(pathname) {
  const href = pathname == null || pathname === "" ? "/" : String(pathname);
  const normalized = href.startsWith("/") ? href : `/${href}`;
  const origin = siteOrigin();
  return origin ? `${origin}${normalized}` : normalized;
}

function xmlEscape(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function plainSummary(html, max = 280) {
  const text = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

function personNode() {
  const personResume = require("./src/_data/resume.json");
  const origin = siteOrigin();
  const person = {
    "@type": "Person",
    name: personResume.name,
    jobTitle: personResume.title,
  };
  if (origin) {
    person.url = `${origin}/`;
    person.image = `${origin}/img/profile.jpg`;
  }
  const sameAs = [personResume.linkedin, personResume.github].filter(Boolean);
  if (sameAs.length) person.sameAs = sameAs;
  if (personResume.location) {
    person.address = {
      "@type": "PostalAddress",
      addressLocality: personResume.location,
    };
  }
  if (Array.isArray(personResume.skills) && personResume.skills.length) {
    person.knowsAbout = personResume.skills;
  }
  return person;
}

function listItems(collection) {
  return (collection || []).map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: absoluteHref(item.url),
    name: item.data?.title || item.fileSlug,
  }));
}

function pageDescription(data) {
  const raw = data.description;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  const personResume = require("./src/_data/resume.json");
  const name = personResume.name || "";
  const role = personResume.title || "";
  const url = data.page?.url || "/";
  const inputPath = data.page?.inputPath;
  const heading = data.title || data.page?.fileSlug || name;
  if (url === "/") {
    return `${name} — ${role} in Singapore. The resume is compact employment history; the blog covers depth that does not fit there; write-ups are hands-on offensive security work.`;
  }
  if (url === "/resume/") {
    return `Resume for ${name}, ${role} in Singapore. Compact employment history; see the blog and write-ups for depth.`;
  }
  if (url === "/blog/") {
    return `Blog by ${name}: project notes and longer explanations for skills and work the resume cannot hold.`;
  }
  if (url === "/write-ups/") {
    return `HackTheBox and Offensive Security machine write-ups by ${name}.`;
  }
  if (isContentMarkdown(inputPath, "blog")) {
    return `${heading} — blog post by ${name}.`;
  }
  if (isContentMarkdown(inputPath, "write-ups")) {
    return `${heading} — offensive security write-up by ${name}.`;
  }
  return `${role} in Singapore. Resume, blog, write-ups, and LinkedIn.`;
}

function buildJsonLd(data) {
  const pageUrl = data.page?.url || "/";
  const url = absoluteHref(pageUrl);
  const person = personNode();
  const inputPath = data.page?.inputPath;
  const description = pageDescription(data);
  const headline = data.title || person.name;

  if (pageUrl === "/") {
    return {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url,
      name: person.name,
      description,
      mainEntity: person,
      hasPart: [
        { "@type": "WebPage", name: "Resume", url: absoluteHref("/resume/") },
        { "@type": "CollectionPage", name: "Blog", url: absoluteHref("/blog/") },
        {
          "@type": "CollectionPage",
          name: "Write-Ups",
          url: absoluteHref("/write-ups/"),
        },
      ],
    };
  }

  if (pageUrl === "/resume/") {
    return {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url,
      name: `${person.name} — Resume`,
      description,
      mainEntity: person,
    };
  }

  if (pageUrl === "/blog/" || pageUrl === "/write-ups/") {
    const isBlog = pageUrl === "/blog/";
    const items = isBlog ? data.collections?.blog : data.collections?.writeUps;
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      url,
      name: isBlog ? "Blog" : "Write-Ups",
      description,
      about: person,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: (items || []).length,
        itemListElement: listItems(items),
      },
    };
  }

  if (
    isContentMarkdown(inputPath, "blog") ||
    isContentMarkdown(inputPath, "write-ups")
  ) {
    const isWriteUp = isContentMarkdown(inputPath, "write-ups");
    const node = {
      "@context": "https://schema.org",
      "@type": isWriteUp ? "TechArticle" : "BlogPosting",
      url,
      headline,
      description,
      author: person,
      mainEntityOfPage: url,
    };
    if (data.date instanceof Date && !Number.isNaN(data.date.getTime())) {
      node.datePublished = data.date.toISOString().slice(0, 10);
    }
    if (person.image) node.image = person.image;
    return node;
  }

  return {
    "@context": "https://schema.org",
    ...person,
    description,
  };
}

function isContentMarkdown(inputPath, folder) {
  return (
    typeof inputPath === "string" &&
    inputPath.includes(`${path.sep}${folder}${path.sep}`) &&
    inputPath.endsWith(".md")
  );
}

/** Path segments under src/hacklas/… (dirs + filename stem) used as note tags. */
function hacklasPathParts(inputPath) {
  if (!inputPath) return [];
  const normalized = String(inputPath).replace(/\\/g, "/");
  const marker = "/hacklas/";
  const idx = normalized.lastIndexOf(marker);
  if (idx < 0) return [];
  const rel = normalized
    .slice(idx + marker.length)
    .replace(/\.md$/i, "");
  return rel.split("/").filter(Boolean);
}

/**
 * Parse the inline note chrome used in hacklas markdown:
 *   # Title
 *   **Author:** …
 *   **Date:** …
 *   **Path:** …
 *   ---
 */
function parseHacklasMeta(inputPath) {
  if (!inputPath || !fs.existsSync(inputPath)) return {};
  const raw = fs.readFileSync(inputPath, "utf8");

  const titleMatch = raw.match(/^#\s+(.+?)\s*$/m);
  const authorMatch = raw.match(/^\*\*Author:\*\*\s*(.+?)\s*$/im);
  const dateMatch = raw.match(/^\*\*Date:\*\*\s*(.+?)\s*$/im);

  let date;
  if (dateMatch) {
    const day = dateMatch[1].match(/(\d{4}-\d{2}-\d{2})/);
    if (day) {
      // Noon UTC so toISOString().slice(0, 10) keeps the authored calendar day.
      date = new Date(`${day[1]}T12:00:00.000Z`);
    }
  }

  return {
    title: titleMatch ? titleMatch[1].trim() : undefined,
    author: authorMatch
      ? authorMatch[1].replace(/\\$/, "").trim()
      : undefined,
    date,
  };
}

/**
 * Remove title + Author/Date/Path block (+ following hr) from rendered note HTML.
 * Layout renders Title / Author / Date / Tags instead.
 */
function stripNoteChrome(content) {
  if (!content) return content;
  let out = String(content);
  out = out.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, "");
  out = out.replace(
    /^\s*<p>(?=[\s\S]*?<strong>(?:Author|Date|Path):<\/strong>)[\s\S]*?<\/p>\s*/i,
    ""
  );
  out = out.replace(/^\s*<hr\s*\/?>\s*/i, "");
  return out;
}

function isReadableFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

const BANNER_FILES = ["banner.jpg", "banner.jpeg", "banner.png", "banner.webp"];
const SRC_ROOT = path.join(__dirname, "src");

function findBannerFile(dir) {
  for (const name of BANNER_FILES) {
    if (fs.existsSync(path.join(dir, name))) return name;
  }
  return null;
}

/** YAML map or CSS string → declaration block for banner_style / banner_style_light. */
function cssDecls(value) {
  if (value == null || value === false || value === "") return "";
  if (typeof value === "string") {
    const css = value.trim().replace(/<\//g, "");
    if (!css) return "";
    return /;\s*$/.test(css) ? css : `${css};`;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value)
      .map(([prop, raw]) => {
        if (raw == null || String(raw).trim() === "") return "";
        const name = String(prop).trim();
        if (!/^-{0,2}[a-zA-Z][\w-]*$/.test(name)) return "";
        const val = String(raw).trim().replace(/;$/, "").replace(/<\//g, "");
        return `${name}: ${val};`;
      })
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function readFrontMatter(inputPath) {
  if (!inputPath || !fs.existsSync(inputPath)) return null;
  const raw = fs.readFileSync(inputPath, "utf8");
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return null;
  return raw.slice(3, end);
}

function frontMatterHasKey(inputPath, key) {
  const fm = readFrontMatter(inputPath);
  if (fm == null) return false;
  return new RegExp(`^${key}\\s*:`, "m").test(fm);
}

function frontMatterValue(inputPath, key) {
  const fm = readFrontMatter(inputPath);
  if (fm == null) return null;
  const match = fm.match(new RegExp(`^${key}\\s*:\\s*(.+?)\\s*$`, "m"));
  if (!match) return null;
  let value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value || null;
}

/** Resolve a banner_path (relative or site-absolute) to a file under src/. */
function resolveBannerFile(inputPath, bannerPath) {
  if (!inputPath || bannerPath == null) return null;
  const trimmed = String(bannerPath).trim();
  if (!trimmed) return null;

  const fromDir = path.dirname(
    path.isAbsolute(inputPath) ? inputPath : path.resolve(__dirname, inputPath)
  );
  const absFile = trimmed.startsWith("/")
    ? path.resolve(SRC_ROOT, trimmed.replace(/^\/+/, ""))
    : path.resolve(fromDir, trimmed);

  const rel = path.relative(SRC_ROOT, absFile);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  if (!isReadableFile(absFile)) return null;
  return absFile;
}

function srcFileToUrl(absFile) {
  return `/${path.relative(SRC_ROOT, absFile).split(path.sep).join("/")}`;
}

function fileCreatedDate(inputPath) {
  const stats = fs.statSync(inputPath);
  // birthtime is the file creation time on macOS/Windows; some Linux FS
  // report epoch 0 when unsupported — fall back to mtime in that case.
  if (stats.birthtimeMs && stats.birthtimeMs > 0) return stats.birthtime;
  return stats.mtime;
}

function passthroughBannerFile(eleventyConfig, absFile) {
  if (!absFile) return;
  const dest = path.relative(SRC_ROOT, absFile).split(path.sep).join("/");
  eleventyConfig.addPassthroughCopy({
    [path.relative(__dirname, absFile)]: dest,
  });
}

function passthroughMediaFolders(eleventyConfig, folder) {
  // Dotfolders like .media are skipped by default globs; map each entry's
  // .media dir explicitly so relative ![](.media/...) paths resolve.
  // Also copy optional banner.* beside each entry, and banner_path targets.
  // Read-only scan — does not modify anything under src/{folder}.
  const dir = path.join(__dirname, "src", folder);
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const entryDir = path.join("src", folder, entry.name);
    const mediaSrc = path.join(entryDir, ".media");
    if (fs.existsSync(mediaSrc)) {
      eleventyConfig.addPassthroughCopy({
        [mediaSrc]: path.join(folder, entry.name, ".media"),
      });
    }
    const bannerName = findBannerFile(path.join(__dirname, entryDir));
    if (bannerName) {
      eleventyConfig.addPassthroughCopy({
        [path.join(entryDir, bannerName)]: path.join(
          folder,
          entry.name,
          bannerName
        ),
      });
    }
    const mdPath = path.join(__dirname, entryDir, "index.md");
    passthroughBannerFile(
      eleventyConfig,
      resolveBannerFile(mdPath, frontMatterValue(mdPath, "banner_path"))
    );
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

    listItem.attrJoin("class", "task-list-item");

    for (let j = i - 1; j >= 0; j--) {
      if (tokens[j].type === "bullet_list_open") {
        tokens[j].attrJoin("class", "task-list");
        break;
      }
      if (tokens[j].type === "bullet_list_close") break;
    }

    const checkbox = new state.Token("html_inline", "", 0);
    checkbox.content =
      `<input type="checkbox" class="task-list-item__checkbox"` +
      `${checked ? " checked" : ""}>`;
    const space = new state.Token("text", "", 0);
    space.content = " ";
    inline.children = inline.children || [];
    inline.children.unshift(space);
    inline.children.unshift(checkbox);
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

  // Add stable ids to headings for in-page TOC links.
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

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight, {
    lineSeparator: "\n",
  });
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["avif", "webp", "auto"],
    widths: [400, 800, 1200],
    failOnError: false,
    // Same hashed files as production — the on-request /.11ty/image/ URLs
    // 404 in --serve (especially for .media/ sources).
    transformOnRequest: false,
    htmlOptions: {
      imgAttributes: {
        loading: "lazy",
        decoding: "async",
        sizes: "(max-width: 48rem) 100vw, 40rem",
      },
    },
  });

  eleventyConfig.addGlobalData("pathPrefix", pathPrefix);
  eleventyConfig.addGlobalData("siteUrl", () => {
    const raw = process.env.SITE_URL;
    if (!raw) return "";
    return String(raw).replace(/\/?$/, "/");
  });

  // Warm common writeup languages so first highlight is reliable.
  loadLanguages(["bash", "python", "json", "php", "markup", "c", "javascript"]);

  eleventyConfig.setServerOptions({
    headers: security.httpHeaders,
  });

  eleventyConfig.addWatchTarget("src/css");
  eleventyConfig.on("eleventy.before", () => {
    const cssOut = path.join(__dirname, "_site", "css");
    if (!fs.existsSync(cssOut)) return;
    for (const name of fs.readdirSync(cssOut)) {
      if (name === "style.css") continue;
      fs.rmSync(path.join(cssOut, name), { force: true });
    }
  });
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/favicon");
  // Browsers still request /favicon.ico at the site root by default
  eleventyConfig.addPassthroughCopy({
    "src/favicon/favicon.ico": "favicon.ico",
  });
  eleventyConfig.addPassthroughCopy({
    "src/_data/resume.pdf": "resume.pdf",
  });
  passthroughMediaFolders(eleventyConfig, "blog");
  passthroughMediaFolders(eleventyConfig, "write-ups");

  if (features.hacklas) {
    // Broken nested symlinks under notes (e.g. missing hacktricks targets).
    eleventyConfig.ignores.add(
      "src/hacklas/checklists/external/hacktricks-*.md"
    );
    eleventyConfig.addWatchTarget("src/hacklas");
  } else {
    eleventyConfig.ignores.add("src/hacklas/**");
    eleventyConfig.ignores.add("src/hacklas.njk");
    // Drop previously built pages so the flag fully unpublishes Hacklas.
    fs.rmSync(path.join(__dirname, "_site", "hacklas"), {
      recursive: true,
      force: true,
    });
  }

  eleventyConfig.addFilter("toc", buildToc);
  eleventyConfig.addFilter("stripNoteChrome", stripNoteChrome);
  eleventyConfig.addFilter("urlencode", (value) =>
    encodeURIComponent(String(value == null ? "" : value))
  );
  // Front-matter `link:` supports:
  //   "[label](https://example.com/path)"  (quoted markdown)
  //   { label: "…", url: "https://…" }     (YAML map)
  //   https://example.com                  (plain URL / host)
  function normalizeExternalHref(value) {
    const raw = String(value == null ? "" : value).trim();
    if (!raw) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//")) return raw;
    return `https://${raw}`;
  }

  function labelFromHref(value) {
    const raw = String(value == null ? "" : value).trim();
    if (!raw) return "";
    try {
      const u = new URL(normalizeExternalHref(raw));
      return `${u.host}${u.pathname === "/" ? "" : u.pathname}${u.search}`.replace(
        /\/$/,
        ""
      );
    } catch {
      return raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    }
  }

  function parseFrontMatterLink(value) {
    if (value == null || value === "") {
      return { href: "", label: "" };
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      const href = normalizeExternalHref(value.url || value.href || value.link || "");
      const label = String(value.label || value.text || value.title || "").trim();
      return { href, label: label || labelFromHref(href) };
    }

    // YAML may parse `[label](url)` as a broken flow seq — prefer quoted strings.
    // Also accept accidental arrays like ["label](url"] from partial parses.
    let raw = value;
    if (Array.isArray(value)) {
      raw = value.map(String).join(", ");
    }
    raw = String(raw).trim();

    const md = raw.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (md) {
      return {
        label: md[1].trim(),
        href: normalizeExternalHref(md[2].trim()),
      };
    }

    const href = normalizeExternalHref(raw);
    return { href, label: labelFromHref(raw) };
  }

  eleventyConfig.addFilter("parseLink", parseFrontMatterLink);
  eleventyConfig.addFilter("externalHref", (value) => parseFrontMatterLink(value).href);
  eleventyConfig.addFilter("linkLabel", (value) => parseFrontMatterLink(value).label);
  eleventyConfig.addFilter("cssDecls", cssDecls);
  eleventyConfig.addFilter("xmlEscape", xmlEscape);
  eleventyConfig.addFilter("plainSummary", (html) => plainSummary(html));
  eleventyConfig.addFilter("absoluteUrl", (path) => absoluteHref(path));
  eleventyConfig.addFilter("jsonLdGraph", function (collections) {
    const ctx = this.ctx || {};
    return JSON.stringify(
      buildJsonLd({
        page: ctx.page || this.page,
        title: ctx.title,
        description: ctx.metaDescription || ctx.description,
        date: ctx.date,
        collections: collections || ctx.collections,
      })
    );
  });
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  // Disable raw HTML in markdown. Highlight via Prism with aliases; unknown
  // languages fall back to escaped plaintext (never emit raw HTML in fences).
  // Autolink bare URLs and open all markdown links in a new tab.
  eleventyConfig.amendLibrary("md", configureMarkdown);

  // Apply shared layouts without writing data files into content folders.
  eleventyConfig.addGlobalData("eleventyComputed", {
    metaDescription: (data) => pageDescription(data),
    layout: (data) => {
      const inputPath = data.page?.inputPath;
      if (isContentMarkdown(inputPath, "hacklas")) {
        return data.layout || "note.njk";
      }
      if (
        isContentMarkdown(inputPath, "blog") ||
        isContentMarkdown(inputPath, "write-ups")
      ) {
        return data.layout || "post.njk";
      }
      return data.layout;
    },
    title: (data) => {
      if (data.title) return data.title;
      const inputPath = data.page?.inputPath;
      if (isContentMarkdown(inputPath, "hacklas")) {
        return parseHacklasMeta(inputPath).title || data.page.fileSlug;
      }
      if (
        isContentMarkdown(inputPath, "blog") ||
        isContentMarkdown(inputPath, "write-ups")
      ) {
        return data.page.fileSlug;
      }
      return data.title;
    },
    author: (data) => {
      if (data.author) return data.author;
      const inputPath = data.page?.inputPath;
      if (isContentMarkdown(inputPath, "hacklas")) {
        return parseHacklasMeta(inputPath).author;
      }
    },
    // Path segments (dirs + stem) for fuzzy search; not Eleventy collection tags.
    noteTags: (data) => {
      const inputPath = data.page?.inputPath;
      if (!isContentMarkdown(inputPath, "hacklas")) return;
      return hacklasPathParts(inputPath);
    },
    notePath: (data) => {
      const inputPath = data.page?.inputPath;
      if (!isContentMarkdown(inputPath, "hacklas")) return;
      return hacklasPathParts(inputPath).join("/");
    },
    // Optional banner_path (resolved to a site-absolute URL) or banner.*
    // beside the entry; null means CSS gradient fallback.
    banner: (data) => {
      const inputPath = data.page?.inputPath;
      if (
        !isContentMarkdown(inputPath, "write-ups") &&
        !isContentMarkdown(inputPath, "blog")
      ) {
        return;
      }
      const fromPath = resolveBannerFile(inputPath, data.banner_path);
      if (fromPath) return srcFileToUrl(fromPath);
      const name = findBannerFile(path.dirname(inputPath));
      return name ? `${data.page.url}${name}` : null;
    },
    showBanner: (data) => {
      const inputPath = data.page?.inputPath;
      return (
        isContentMarkdown(inputPath, "write-ups") ||
        isContentMarkdown(inputPath, "blog")
      );
    },
    // Prefer front matter / inline note date; else file created time for posts.
    date: (data) => {
      const inputPath = data.page?.inputPath;
      if (isContentMarkdown(inputPath, "hacklas")) {
        const fromBody = parseHacklasMeta(inputPath).date;
        if (fromBody) return fromBody;
        try {
          return fileCreatedDate(inputPath);
        } catch {
          return data.page.date;
        }
      }
      if (
        !isContentMarkdown(inputPath, "blog") &&
        !isContentMarkdown(inputPath, "write-ups")
      ) {
        return;
      }
      if (frontMatterHasKey(inputPath, "date")) return data.page.date;
      try {
        return fileCreatedDate(inputPath);
      } catch {
        return data.page.date;
      }
    },
  });

  eleventyConfig.addCollection("blog", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("src/blog/**/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("writeUps", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("src/write-ups/**/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("feed", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob(["src/blog/**/*.md", "src/write-ups/**/*.md"])
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("hacklas", (collectionApi) => {
    if (!features.hacklas) return [];
    return collectionApi
      .getFilteredByGlob("src/hacklas/**/*.md")
      .filter((item) => isReadableFile(item.inputPath))
      .sort((a, b) => {
        const ap = a.data.notePath || a.filePathStem || "";
        const bp = b.data.notePath || b.filePathStem || "";
        return ap.localeCompare(bp);
      });
  });

  return {
    pathPrefix,
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    // Do not run Nunjucks inside markdown — keeps {{ }}, {% %} in writeups literal.
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
  };
};

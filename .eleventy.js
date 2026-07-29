const fs = require("node:fs");
const path = require("node:path");
const Prism = require("prismjs");
const loadLanguages = require("prismjs/components/index.js");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

loadLanguages.silent = true;

function isContentMarkdown(inputPath, folder) {
  return (
    typeof inputPath === "string" &&
    inputPath.includes(`${path.sep}${folder}${path.sep}`) &&
    inputPath.endsWith(".md")
  );
}

const BANNER_FILES = ["banner.jpg", "banner.jpeg", "banner.png", "banner.webp"];

function findBannerFile(dir) {
  for (const name of BANNER_FILES) {
    if (fs.existsSync(path.join(dir, name))) return name;
  }
  return null;
}

function frontMatterHasKey(inputPath, key) {
  if (!inputPath || !fs.existsSync(inputPath)) return false;
  const raw = fs.readFileSync(inputPath, "utf8");
  if (!raw.startsWith("---")) return false;
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return false;
  return new RegExp(`^${key}\\s*:`, "m").test(raw.slice(3, end));
}

function fileCreatedDate(inputPath) {
  const stats = fs.statSync(inputPath);
  // birthtime is the file creation time on macOS/Windows; some Linux FS
  // report epoch 0 when unsupported — fall back to mtime in that case.
  if (stats.birthtimeMs && stats.birthtimeMs > 0) return stats.birthtime;
  return stats.mtime;
}

function passthroughMediaFolders(eleventyConfig, folder) {
  // Dotfolders like .media are skipped by default globs; map each entry's
  // .media dir explicitly so relative ![](.media/...) paths resolve.
  // Also copy optional banner.* beside each entry.
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
 */
function demoteBodyHeadings(state) {
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

function configureMarkdown(mdLib) {
  mdLib.set({
    html: false,
    linkify: true,
    highlight: highlightCode,
  });

  mdLib.core.ruler.push("demote_body_headings", demoteBodyHeadings);

  const defaultLinkOpen =
    mdLib.renderer.rules.link_open ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  mdLib.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];

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

  // Warm common writeup languages so first highlight is reliable.
  loadLanguages(["bash", "python", "json", "php", "markup", "c", "javascript"]);

  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/favicon");
  // Browsers still request /favicon.ico at the site root by default
  eleventyConfig.addPassthroughCopy({
    "src/favicon/favicon.ico": "favicon.ico",
  });
  passthroughMediaFolders(eleventyConfig, "blog");
  passthroughMediaFolders(eleventyConfig, "write-ups");

  eleventyConfig.addFilter("toc", buildToc);
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  // Disable raw HTML in markdown. Highlight via Prism with aliases; unknown
  // languages fall back to escaped plaintext (never emit raw HTML in fences).
  // Autolink bare URLs and open all markdown links in a new tab.
  eleventyConfig.amendLibrary("md", configureMarkdown);

  // Apply shared post layout without writing data files into blog/ or write-ups/
  eleventyConfig.addGlobalData("eleventyComputed", {
    layout: (data) => {
      const inputPath = data.page?.inputPath;
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
      if (
        isContentMarkdown(inputPath, "blog") ||
        isContentMarkdown(inputPath, "write-ups")
      ) {
        return data.page.fileSlug;
      }
      return data.title;
    },
    // Optional banner.* beside the entry; null means CSS gradient fallback.
    banner: (data) => {
      const inputPath = data.page?.inputPath;
      if (
        !isContentMarkdown(inputPath, "write-ups") &&
        !isContentMarkdown(inputPath, "blog")
      ) {
        return;
      }
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
    // Prefer front matter date; otherwise use the markdown file's created time.
    date: (data) => {
      const inputPath = data.page?.inputPath;
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

  return {
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

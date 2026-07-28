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

function passthroughMediaFolders(eleventyConfig, folder) {
  // Dotfolders like .media are skipped by default globs; map each entry's
  // .media dir explicitly so relative ![](.media/...) paths resolve.
  // Read-only scan — does not modify anything under src/{folder}.
  const dir = path.join(__dirname, "src", folder);
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const mediaSrc = path.join("src", folder, entry.name, ".media");
    if (fs.existsSync(mediaSrc)) {
      eleventyConfig.addPassthroughCopy({
        [mediaSrc]: path.join(folder, entry.name, ".media"),
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

  const headingPattern = /<h([1-3])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
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

function configureMarkdown(mdLib) {
  mdLib.set({
    html: false,
    linkify: true,
    highlight: highlightCode,
  });

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

  // Add stable ids to h1–h3 for in-page TOC links.
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
  passthroughMediaFolders(eleventyConfig, "posts");
  passthroughMediaFolders(eleventyConfig, "projects");

  eleventyConfig.addFilter("toc", buildToc);

  // Disable raw HTML in markdown. Highlight via Prism with aliases; unknown
  // languages fall back to escaped plaintext (never emit raw HTML in fences).
  // Autolink bare URLs and open all markdown links in a new tab.
  eleventyConfig.amendLibrary("md", configureMarkdown);

  // Apply shared post layout without writing data files into posts/ or projects/
  eleventyConfig.addGlobalData("eleventyComputed", {
    layout: (data) => {
      const inputPath = data.page?.inputPath;
      if (
        isContentMarkdown(inputPath, "posts") ||
        isContentMarkdown(inputPath, "projects")
      ) {
        return data.layout || "post.njk";
      }
      return data.layout;
    },
    title: (data) => {
      if (data.title) return data.title;
      const inputPath = data.page?.inputPath;
      if (
        isContentMarkdown(inputPath, "posts") ||
        isContentMarkdown(inputPath, "projects")
      ) {
        return data.page.fileSlug;
      }
      return data.title;
    },
  });

  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("src/posts/**/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("projects", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("src/projects/**/*.md")
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

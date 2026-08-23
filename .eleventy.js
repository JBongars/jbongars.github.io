const fs = require("node:fs");
const path = require("node:path");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const { eleventyImageTransformPlugin } = require("@11ty/eleventy-img");
const features = require("./src/_data/features.json");
const security = require("./src/_data/security.js");
const { ROOT, pathPrefix, siteUrl, absoluteHref } = require("./_11ty/paths");
const { xmlEscape, plainSummary, formatResumeDate } = require("./_11ty/text");
const {
  isReadableFile,
  stripNoteChrome,
  cssDecls,
  passthroughMediaFolders,
  parseFrontMatterLink,
} = require("./_11ty/content");
const { buildJsonLd } = require("./_11ty/jsonld");
const { buildToc, configureMarkdown, warmPrismLanguages } = require("./_11ty/markdown");
const { computedData } = require("./_11ty/computed");
const { cssRev } = require("./_11ty/css");

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
  eleventyConfig.addGlobalData("siteUrl", siteUrl);
  eleventyConfig.addGlobalData("cssRev", () => cssRev());
  eleventyConfig.addGlobalData("buildDate", () => new Date());

  warmPrismLanguages();

  eleventyConfig.setServerOptions({
    headers: security.httpHeaders,
    middleware: [security.cacheControlMiddleware],
  });

  eleventyConfig.addWatchTarget("src/css");
  eleventyConfig.on("eleventy.before", () => {
    const cssOut = path.join(ROOT, "_site", "css");
    if (!fs.existsSync(cssOut)) return;
    for (const name of fs.readdirSync(cssOut)) {
      if (name === "style.css") continue;
      fs.rmSync(path.join(cssOut, name), { force: true });
    }
  });
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/favicon");
  eleventyConfig.addPassthroughCopy({
    "src/favicon/favicon.ico": "favicon.ico",
  });
  eleventyConfig.addPassthroughCopy({
    "src/_data/resume.pdf": "resume.pdf",
  });
  passthroughMediaFolders(eleventyConfig, "blog");
  passthroughMediaFolders(eleventyConfig, "write-ups");

  if (features.hacklas) {
    eleventyConfig.ignores.add(
      "src/hacklas/checklists/external/hacktricks-*.md"
    );
    eleventyConfig.addWatchTarget("src/hacklas");
  } else {
    eleventyConfig.ignores.add("src/hacklas/**");
    eleventyConfig.ignores.add("src/hacklas.njk");
    fs.rmSync(path.join(ROOT, "_site", "hacklas"), {
      recursive: true,
      force: true,
    });
  }

  eleventyConfig.addFilter("toc", buildToc);
  eleventyConfig.addFilter("stripNoteChrome", stripNoteChrome);
  eleventyConfig.addFilter("urlencode", (value) =>
    encodeURIComponent(String(value == null ? "" : value))
  );
  eleventyConfig.addFilter("parseLink", parseFrontMatterLink);
  eleventyConfig.addFilter("externalHref", (value) => parseFrontMatterLink(value).href);
  eleventyConfig.addFilter("linkLabel", (value) => parseFrontMatterLink(value).label);
  eleventyConfig.addFilter("cssDecls", cssDecls);
  eleventyConfig.addFilter("xmlEscape", xmlEscape);
  eleventyConfig.addFilter("plainSummary", (html) => plainSummary(html));
  eleventyConfig.addFilter("formatResumeDate", formatResumeDate);
  eleventyConfig.addFilter("absoluteUrl", (pathname) => absoluteHref(pathname));
  eleventyConfig.addFilter("jsonLdGraph", function (collections) {
    const ctx = this.ctx || {};
    return JSON.stringify(
      buildJsonLd({
        page: ctx.page || this.page,
        title: ctx.title,
        description: ctx.metaDescription || ctx.description,
        date: ctx.date,
        dateModified: ctx.dateModified,
        collections: collections || ctx.collections,
      })
    );
  });
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  // Disable raw HTML in markdown. Highlight via Prism with aliases; unknown
  // languages fall back to escaped plaintext (never emit raw HTML in fences).
  eleventyConfig.amendLibrary("md", configureMarkdown);

  eleventyConfig.addGlobalData("eleventyComputed", computedData());

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

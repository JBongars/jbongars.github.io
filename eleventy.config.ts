import fs from "node:fs";
import path from "node:path";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import features from "./src/_data/features.json" with { type: "json" };
import security from "./src/_data/security.js";
import { ROOT, pathPrefix, siteUrl, absoluteHref } from "./_11ty/paths.js";
import { xmlEscape, plainSummary, formatResumeDate } from "./_11ty/text.js";
import {
  isReadableFile,
  stripNoteChrome,
  stripWriteupChrome,
  cssDecls as cssDeclarations,
  passthroughMediaFolders,
  parseFrontMatterLink,
} from "./_11ty/content.js";
import { buildJsonLd } from "./_11ty/jsonld.js";
import { buildToc, configureMarkdown, warmPrismLanguages } from "./_11ty/markdown.js";
import { computedData } from "./_11ty/computed.js";
import { cssRev } from "./_11ty/css.js";

function sortByDateDescending(items) {
  return items.toSorted((left, right) => right.date - left.date);
}

function sortByNotePath(items) {
  return items.toSorted((left, right) => {
    const leftPath = left.data.notePath || left.filePathStem || "";
    const rightPath = right.data.notePath || right.filePathStem || "";
    return leftPath.localeCompare(rightPath);
  });
}

function jsonLdGraphFilter(collections) {
  // Eleventy binds the template context to `this` for filters.
  // eslint-disable-next-line unicorn/no-this-outside-of-class -- Eleventy filter context
  const context = this.ctx || {};
  return JSON.stringify(
    buildJsonLd({
      // eslint-disable-next-line unicorn/no-this-outside-of-class -- Eleventy filter context
      page: context.page || this.page,
      title: context.title,
      description: context.metaDescription || context.description,
      date: context.date,
      dateModified: context.dateModified,
      collections: collections || context.collections,
    }),
  );
}

function registerPassthrough(eleventyConfig) {
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
}

function registerFilters(eleventyConfig) {
  eleventyConfig.addFilter("toc", buildToc);
  eleventyConfig.addFilter("stripNoteChrome", stripNoteChrome);
  eleventyConfig.addFilter("stripWriteupChrome", stripWriteupChrome);
  eleventyConfig.addFilter("urlencode", (value) => encodeURIComponent(String(value ?? "")));
  eleventyConfig.addFilter("parseLink", parseFrontMatterLink);
  eleventyConfig.addFilter("externalHref", (value) => parseFrontMatterLink(value).href);
  eleventyConfig.addFilter("linkLabel", (value) => parseFrontMatterLink(value).label);
  eleventyConfig.addFilter("cssDecls", cssDeclarations);
  eleventyConfig.addFilter("xmlEscape", xmlEscape);
  eleventyConfig.addFilter("plainSummary", (html) => plainSummary(html));
  eleventyConfig.addFilter("formatResumeDate", formatResumeDate);
  eleventyConfig.addFilter("absoluteUrl", (pathname) => absoluteHref(pathname));
  eleventyConfig.addFilter("jsonLdGraph", jsonLdGraphFilter);
  eleventyConfig.addShortcode("year", () => String(new Date().getFullYear()));
}

function registerCollections(eleventyConfig) {
  eleventyConfig.addCollection("blog", (collectionApi) =>
    sortByDateDescending(collectionApi.getFilteredByGlob("src/blog/**/*.md")),
  );
  eleventyConfig.addCollection("writeUps", (collectionApi) =>
    sortByDateDescending(collectionApi.getFilteredByGlob("src/write-ups/**/*.md")),
  );
  eleventyConfig.addCollection("feed", (collectionApi) =>
    sortByDateDescending(
      collectionApi.getFilteredByGlob(["src/blog/**/*.md", "src/write-ups/**/*.md"]),
    ),
  );
  eleventyConfig.addCollection("hacklas", (collectionApi) => {
    if (!features.hacklas) {
      return [];
    }
    return sortByNotePath(
      collectionApi
        .getFilteredByGlob("src/hacklas/**/*.md")
        .filter((item) => isReadableFile(item.inputPath)),
    );
  });
}

function configureHacklas(eleventyConfig) {
  if (features.hacklas) {
    eleventyConfig.ignores.add("src/hacklas/checklists/external/hacktricks-*.md");
    eleventyConfig.addWatchTarget("src/hacklas");
    return;
  }
  eleventyConfig.ignores.add("src/hacklas/**");
  eleventyConfig.ignores.add("src/hacklas.njk");
  fs.rmSync(path.join(ROOT, "_site", "hacklas"), {
    recursive: true,
    force: true,
  });
}

export default function configureEleventy(eleventyConfig) {
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
    if (!fs.existsSync(cssOut)) {
      return;
    }
    for (const name of fs.readdirSync(cssOut)) {
      if (name === "style.css") {
        continue;
      }
      fs.rmSync(path.join(cssOut, name), { force: true });
    }
  });

  registerPassthrough(eleventyConfig);
  configureHacklas(eleventyConfig);
  registerFilters(eleventyConfig);
  eleventyConfig.amendLibrary("md", configureMarkdown);
  eleventyConfig.addGlobalData("eleventyComputed", computedData());
  registerCollections(eleventyConfig);

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
}

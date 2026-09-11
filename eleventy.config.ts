import fs from "node:fs";
import path from "node:path";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import features from "./src/_data/features.json" with { type: "json" };
import security, { applyThemeInitFromBundle } from "./_11ty/security.ts";
import { ROOT, pathPrefix, siteUrl, absoluteHref } from "./_11ty/paths.ts";
import { xmlEscape, plainSummary, formatResumeDate, asStringOrEmpty } from "./_11ty/text.ts";
import {
  isReadableFile,
  stripNoteChrome,
  stripWriteupChrome,
  cssDecls as cssDeclarations,
  passthroughMediaFolders,
  parseFrontMatterLink,
} from "./_11ty/content.ts";
import { buildJsonLd } from "./_11ty/jsonld.ts";
import { buildToc, configureMarkdown, warmPrismLanguages } from "./_11ty/markdown.ts";
import { computedData } from "./_11ty/computed.ts";
import { cssRev } from "./_11ty/css.ts";
import {
  bundleClient,
  inlineScriptCode,
  modulePreloadTags,
  type BundleResult,
} from "./_11ty/bundle.ts";
import type {
  CollectionApi,
  CollectionItem,
  EleventyConfig,
  EleventyUserConfigResult,
  PageCollections,
  PageData,
  PageInfo,
} from "./_11ty/types.ts";

interface JsonLdFilterThis {
  ctx?: PageData & { page?: PageInfo };
  page?: PageInfo;
}

function sortByDateDescending(items: CollectionItem[]): CollectionItem[] {
  return items.toSorted((left, right) => Number(right.date) - Number(left.date));
}

function sortByNotePath(items: CollectionItem[]): CollectionItem[] {
  return items.toSorted((left, right) => {
    const leftPath = left.data?.notePath ?? left.filePathStem ?? "";
    const rightPath = right.data?.notePath ?? right.filePathStem ?? "";
    return leftPath.localeCompare(rightPath);
  });
}

function jsonLdGraphFilter(this: JsonLdFilterThis, ...arguments_: unknown[]): string {
  const collections = arguments_[0];
  // Eleventy binds the template context to `this` for filters.
  const context = this.ctx ?? {};
  return JSON.stringify(
    buildJsonLd({
      page: context.page ?? this.page,
      title: context.title,
      description: context.metaDescription ?? context.description,
      date: context.date,
      dateModified: context.dateModified,
      collections: isPageCollections(collections) ? collections : context.collections,
    }),
  );
}

function isPageCollections(value: unknown): value is PageCollections {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function registerPassthrough(eleventyConfig: EleventyConfig): void {
  eleventyConfig.addPassthroughCopy("src/img");
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

function registerClientBundle(eleventyConfig: EleventyConfig): void {
  let bundle: BundleResult | undefined;
  eleventyConfig.addWatchTarget("src/js");
  eleventyConfig.ignores.add("src/js/**");
  eleventyConfig.ignores.add("src/**/*.test.ts");
  eleventyConfig.addShortcode("jsRev", () => bundle?.rev ?? "");
  eleventyConfig.addShortcode("inlineScript", (name: unknown) => inlineScriptCode(bundle, name));
  eleventyConfig.addShortcode("modulePreloads", (entry: unknown) =>
    modulePreloadTags(bundle, entry),
  );
  eleventyConfig.on("eleventy.before", async ({ directories, runMode }) => {
    bundle = await bundleClient({
      entryDir: path.join(ROOT, "src/js/entries"),
      outDir: directories.output,
      minify: runMode === "build",
    });
    applyThemeInitFromBundle(bundle);
  });
}

function registerFilters(eleventyConfig: EleventyConfig): void {
  eleventyConfig.addFilter("toc", buildToc);
  eleventyConfig.addFilter("stripNoteChrome", stripNoteChrome);
  eleventyConfig.addFilter("stripWriteupChrome", stripWriteupChrome);
  eleventyConfig.addFilter("urlencode", (value: unknown) =>
    encodeURIComponent(asStringOrEmpty(value)),
  );
  eleventyConfig.addFilter("parseLink", parseFrontMatterLink);
  eleventyConfig.addFilter("externalHref", (value: unknown) => parseFrontMatterLink(value).href);
  eleventyConfig.addFilter("linkLabel", (value: unknown) => parseFrontMatterLink(value).label);
  eleventyConfig.addFilter("cssDecls", cssDeclarations);
  eleventyConfig.addFilter("xmlEscape", xmlEscape);
  eleventyConfig.addFilter("plainSummary", (html: unknown) => plainSummary(html));
  eleventyConfig.addFilter("formatResumeDate", formatResumeDate);
  eleventyConfig.addFilter("absoluteUrl", (pathname: unknown) => absoluteHref(pathname));
  eleventyConfig.addFilter("jsonLdGraph", jsonLdGraphFilter);
  eleventyConfig.addShortcode("year", () => String(new Date().getFullYear()));
}

function registerCollections(eleventyConfig: EleventyConfig): void {
  eleventyConfig.addCollection("blog", (collectionApi: CollectionApi) =>
    sortByDateDescending(collectionApi.getFilteredByGlob("src/blog/**/*.md")),
  );
  eleventyConfig.addCollection("writeUps", (collectionApi: CollectionApi) =>
    sortByDateDescending(collectionApi.getFilteredByGlob("src/write-ups/**/*.md")),
  );
  eleventyConfig.addCollection("feed", (collectionApi: CollectionApi) =>
    sortByDateDescending(
      collectionApi.getFilteredByGlob(["src/blog/**/*.md", "src/write-ups/**/*.md"]),
    ),
  );
  eleventyConfig.addCollection("hacklas", (collectionApi: CollectionApi) => {
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

function configureHacklas(eleventyConfig: EleventyConfig): void {
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

export default function configureEleventy(
  eleventyConfig: EleventyConfig,
): EleventyUserConfigResult {
  eleventyConfig.addExtension("11ty.ts", { key: "11ty.js" });
  eleventyConfig.addTemplateFormats("11ty.ts");

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
    middleware: [security.developmentServerMiddleware],
  });

  eleventyConfig.addWatchTarget("src/css");
  eleventyConfig.on("eleventy.before", ({ directories }) => {
    const cssOut = path.resolve(directories.output, "css");
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
  registerClientBundle(eleventyConfig);
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

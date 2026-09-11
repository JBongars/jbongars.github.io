import { describe, expect, it } from "@jest/globals";
import eleventyConfig from "../../.eleventy.js";
import { buildToc } from "../../_11ty/markdown.js";
import { pathPrefix, siteUrl } from "../../_11ty/paths.js";

function stubEleventyConfig() {
  const filters = new Map();
  const copies = [];
  const plugins = [];
  const collections = new Map();
  const globalData = new Map();
  const ignorePatterns = new Set();
  const watchTargets = [];
  const events = [];
  let serverOptions;

  return {
    filters,
    copies,
    plugins,
    collections,
    globalData,
    ignorePatterns,
    watchTargets,
    events,
    get serverOptions() {
      return serverOptions;
    },
    addPlugin(plugin, options) {
      plugins.push({ plugin, options });
    },
    addGlobalData(name, value) {
      globalData.set(name, value);
    },
    setServerOptions(options) {
      serverOptions = options;
    },
    addWatchTarget(target) {
      watchTargets.push(target);
    },
    on(name, handler) {
      events.push({ name, handler });
    },
    addPassthroughCopy(copy) {
      copies.push(copy);
    },
    addFilter(name, filter) {
      filters.set(name, filter);
    },
    addShortcode() {},
    amendLibrary() {},
    addCollection(name, builder) {
      collections.set(name, builder);
    },
    ignores: {
      add(pattern) {
        ignorePatterns.add(pattern);
      },
    },
  };
}

describe("eleventy config", () => {
  it("registers directories, filters, and global data", () => {
    const config = stubEleventyConfig();
    const result = eleventyConfig(config);

    expect(result).toEqual({
      pathPrefix,
      dir: {
        input: "src",
        output: "_site",
        includes: "_includes",
        data: "_data",
      },
      markdownTemplateEngine: false,
      htmlTemplateEngine: "njk",
    });
    expect(config.globalData.get("pathPrefix")).toBe(pathPrefix);
    expect(config.globalData.get("siteUrl")).toBe(siteUrl);
    expect(config.filters.get("toc")).toBe(buildToc);
    expect(config.filters.get("xmlEscape")("&")).toBe("&amp;");
    expect(config.filters.get("urlencode")("a b")).toBe("a%20b");
    expect(config.filters.get("parseLink")("example.com")).toEqual({
      href: "https://example.com",
      label: "example.com",
    });
    expect(config.plugins).toHaveLength(2);
    expect(config.copies).toContain("src/js");
    expect(config.serverOptions.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(config.collections.has("blog")).toBe(true);
    expect(config.collections.has("writeUps")).toBe(true);
    expect(config.collections.has("feed")).toBe(true);
    expect(config.collections.has("hacklas")).toBe(true);
  });
});

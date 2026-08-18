const path = require("node:path");
const {
  isContentMarkdown,
  parseHacklasMeta,
  hacklasPathParts,
  resolveBannerFile,
  srcFileToUrl,
  findBannerFile,
  frontMatterHasKey,
  fileCreatedDate,
} = require("./content");
const { pageDescription } = require("./jsonld");

function computedData() {
  return {
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
  };
}

module.exports = { computedData };

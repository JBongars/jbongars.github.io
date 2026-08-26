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
const { gitLastmodDay } = require("./git");

function extraNoteTags(raw) {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string" && raw.trim()
      ? raw.split(/[,]+/)
      : [];
  return list
    .map((t) => String(t || "").trim().toLowerCase())
    .filter(Boolean);
}

function uniqueTags(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const tag = String(item || "").trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

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
    // Path segments only — breadcrumbs. Extra search tags live on noteTags.
    notePathParts: (data) => {
      const inputPath = data.page?.inputPath;
      if (!isContentMarkdown(inputPath, "hacklas")) return;
      return hacklasPathParts(inputPath);
    },
    notePath: (data) => {
      const inputPath = data.page?.inputPath;
      if (!isContentMarkdown(inputPath, "hacklas")) return;
      return hacklasPathParts(inputPath).join("/");
    },
    // Path segments plus optional front-matter `note_tags`. Not Eleventy
    // collection tags (`tags:` would pollute collections).
    noteTags: (data) => {
      const inputPath = data.page?.inputPath;
      if (!isContentMarkdown(inputPath, "hacklas")) return;
      return uniqueTags([
        ...hacklasPathParts(inputPath),
        ...extraNoteTags(data.note_tags),
      ]);
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
    dateModified: (data) => gitLastmodDay(data.page?.inputPath),
  };
}

module.exports = { computedData };

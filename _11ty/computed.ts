import path from "node:path";
import {
  isContentMarkdown,
  parseHacklasMeta,
  hacklasPathParts,
  resolveBannerFile,
  srcFileToUrl as sourceFileToUrl,
  findBannerFile,
  frontMatterHasKey,
  fileCreatedDate,
} from "./content.ts";
import { pageDescription } from "./jsonld.ts";
import { gitLastmodDay } from "./git.ts";
import { asStringOrEmpty } from "./text.ts";
import type { PageData } from "./types.ts";

function extraNoteTags(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string" && raw.trim()
      ? raw.split(/[,]+/)
      : [];
  return list.map((tag) => asStringOrEmpty(tag).trim().toLowerCase()).filter(Boolean);
}

function uniqueTags(list: string[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of list) {
    const tag = item.trim();
    if (!tag) {
      continue;
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

function isPostMarkdown(inputPath: unknown): inputPath is string {
  return isContentMarkdown(inputPath, "blog") || isContentMarkdown(inputPath, "write-ups");
}

function fallbackLayout(current: unknown, fallback: string): string {
  // Eleventy's computed-data proxy sets missing keys to "". Treat that as unset.
  if (typeof current === "string" && current !== "") {
    return current;
  }
  return fallback;
}

function createdOrPageDate(data: PageData): Date | undefined {
  const inputPath = data.page?.inputPath;
  try {
    if (typeof inputPath !== "string") {
      return data.page?.date;
    }
    return fileCreatedDate(inputPath);
  } catch {
    return data.page?.date;
  }
}

interface ComputedFields {
  metaDescription: (data: PageData) => string;
  layout: (data: PageData) => string | undefined;
  title: (data: PageData) => string | undefined;
  author: (data: PageData) => string | undefined;
  notePathParts: (data: PageData) => string[] | undefined;
  notePath: (data: PageData) => string | undefined;
  noteTags: (data: PageData) => string[] | undefined;
  banner: (data: PageData) => string | undefined;
  showBanner: (data: PageData) => boolean;
  date: (data: PageData) => Date | undefined;
  dateModified: (data: PageData) => string | undefined;
}

function computedData(): ComputedFields {
  return {
    metaDescription: (data) => pageDescription(data),
    layout: (data) => {
      const inputPath = data.page?.inputPath;
      if (isContentMarkdown(inputPath, "hacklas")) {
        return fallbackLayout(data.layout, "note.njk");
      }
      if (isPostMarkdown(inputPath)) {
        return fallbackLayout(data.layout, "post.njk");
      }
      return data.layout;
    },
    title: (data) => {
      if (data.title) {
        return data.title;
      }
      const inputPath = data.page?.inputPath;
      if (isContentMarkdown(inputPath, "hacklas")) {
        return parseHacklasMeta(inputPath).title ?? data.page?.fileSlug;
      }
      if (isPostMarkdown(inputPath)) {
        return data.page?.fileSlug;
      }
      return data.title;
    },
    author: (data) => {
      if (data.author) {
        return data.author;
      }
      const inputPath = data.page?.inputPath;
      if (isContentMarkdown(inputPath, "hacklas")) {
        return parseHacklasMeta(inputPath).author;
      }
    },
    // Path segments only — breadcrumbs. Extra search tags live on noteTags.
    notePathParts: (data) => {
      const inputPath = data.page?.inputPath;
      if (!isContentMarkdown(inputPath, "hacklas")) {
        return;
      }
      return hacklasPathParts(inputPath);
    },
    notePath: (data) => {
      const inputPath = data.page?.inputPath;
      if (!isContentMarkdown(inputPath, "hacklas")) {
        return;
      }
      return hacklasPathParts(inputPath).join("/");
    },
    // Path segments plus optional front-matter `note_tags`. Not Eleventy
    // collection tags (`tags:` would pollute collections).
    noteTags: (data) => {
      const inputPath = data.page?.inputPath;
      if (!isContentMarkdown(inputPath, "hacklas")) {
        return;
      }
      return uniqueTags([...hacklasPathParts(inputPath), ...extraNoteTags(data.note_tags)]);
    },
    // Optional banner_path (resolved to a site-absolute URL) or banner.*
    // beside the entry; missing means CSS gradient fallback.
    banner: (data) => {
      const inputPath = data.page?.inputPath;
      if (!isPostMarkdown(inputPath)) {
        return;
      }
      const fromPath = resolveBannerFile(inputPath, data.banner_path);
      if (fromPath) {
        return sourceFileToUrl(fromPath);
      }
      const name = findBannerFile(path.dirname(inputPath));
      return name ? `${data.page?.url ?? ""}${name}` : undefined;
    },
    showBanner: (data) => isPostMarkdown(data.page?.inputPath),
    // Prefer front matter / inline note date; else file created time for posts.
    date: (data) => {
      const inputPath = data.page?.inputPath;
      if (isContentMarkdown(inputPath, "hacklas")) {
        return parseHacklasMeta(inputPath).date ?? createdOrPageDate(data);
      }
      if (!isPostMarkdown(inputPath)) {
        return;
      }
      if (frontMatterHasKey(inputPath, "date")) {
        return data.page?.date;
      }
      return createdOrPageDate(data);
    },
    dateModified: (data) => gitLastmodDay(data.page?.inputPath),
  };
}

export { computedData };

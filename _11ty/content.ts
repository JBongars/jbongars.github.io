import fs from "node:fs";
import path from "node:path";
import { ROOT, SRC_ROOT } from "./paths.ts";
import { asString } from "./text.ts";
import type { FrontMatterLink, PassthroughConfig } from "./types.ts";

function isAbsent(value: unknown): boolean {
  return value === undefined || (typeof value === "object" && !Array.isArray(value) && !value);
}

function isContentMarkdown(inputPath?: unknown, folder?: string): inputPath is string {
  return (
    typeof inputPath === "string" &&
    typeof folder === "string" &&
    inputPath.includes(`${path.sep}${folder}${path.sep}`) &&
    inputPath.endsWith(".md")
  );
}

function isReadableFile(filePath: unknown): boolean {
  if (typeof filePath !== "string") {
    return false;
  }
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Path segments under src/hacklas/… (dirs + filename stem) used as note tags.
 */
function hacklasPathParts(inputPath?: unknown): string[] {
  if (!inputPath) {
    return [];
  }
  const normalized = asString(inputPath).replaceAll("\\", "/");
  const marker = "/hacklas/";
  const index = normalized.lastIndexOf(marker);
  if (index === -1) {
    return [];
  }
  const relativePath = normalized.slice(index + marker.length).replace(/\.md$/i, "");
  return relativePath.split("/").filter(Boolean);
}

function authoredDate(rawDate: string): Date | undefined {
  const day = /(\d{4}-\d{2}-\d{2})/.exec(rawDate);
  const calendarDay = day?.[1];
  if (calendarDay === undefined) {
    return;
  }
  // Noon UTC so toISOString().slice(0, 10) keeps the authored calendar day.
  return new Date(`${calendarDay}T12:00:00.000Z`);
}

interface HacklasMeta {
  title?: string;
  author?: string;
  date?: Date;
}

/**
 * Parse the inline note chrome used in hacklas markdown:
 *   # Title
 *   **Author:** …
 *   **Date:** …
 *   **Path:** …
 *   ---
 */
function parseHacklasMeta(inputPath?: unknown): HacklasMeta {
  if (typeof inputPath !== "string" || !fs.existsSync(inputPath)) {
    return {};
  }
  const raw = fs.readFileSync(inputPath, "utf8");
  const titleMatch = /^#\s+(.+?)\s*$/m.exec(raw);
  const authorMatch = /^\*\*Author:\*\*\s*(.+?)\s*$/im.exec(raw);
  const dateMatch = /^\*\*Date:\*\*\s*(.+?)\s*$/im.exec(raw);
  const title = titleMatch?.[1];
  const author = authorMatch?.[1];
  const dateRaw = dateMatch?.[1];
  return {
    title: title === undefined ? undefined : title.trim(),
    author: author === undefined ? undefined : author.replace(/\\$/, "").trim(),
    date: dateRaw === undefined ? undefined : authoredDate(dateRaw),
  };
}

/**
 * Remove title + Author/Date/Path block (+ following hr) from rendered note HTML.
 * Layout renders Title / Author / Date / Tags instead.
 */
function stripNoteChrome(content?: unknown): unknown {
  if (!content) {
    return content;
  }
  return asString(content)
    .replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, "")
    .replace(/^\s*<p>(?=[\s\S]*?<strong>(?:Author|Date|Path):<\/strong>)[\s\S]*?<\/p>\s*/i, "")
    .replace(/^\s*<hr\s*\/?>\s*/i, "");
}

/**
 * Drop leftover write-up chrome the layout already prints: a demoted
 * `# Box — Writeup` (h2) and the Platform/Target blockquote. New write-ups
 * should not include either (see WRITEUP_SPEC.md).
 */
function stripWriteupChrome(content?: unknown): unknown {
  if (!content) {
    return content;
  }
  return asString(content)
    .replace(/^\s*<h2\b[^>]*>[\s\S]*?<\/h2>\s*/i, "")
    .replace(/^\s*<blockquote\b[^>]*>[\s\S]*?(?:Platform:|Target:)[\s\S]*?<\/blockquote>\s*/i, "");
}

const BANNER_FILES = ["banner.jpg", "banner.jpeg", "banner.png", "banner.webp"];

function findBannerFile(directory: string): string | undefined {
  for (const name of BANNER_FILES) {
    if (fs.existsSync(path.join(directory, name))) {
      return name;
    }
  }
}

function cssString(value: string): string {
  const css = value.trim().replaceAll("</", "");
  if (!css) {
    return "";
  }
  return /;\s*$/.test(css) ? css : `${css};`;
}

function cssFromMap(value: object): string {
  return Object.entries(value)
    .map(([property, raw]) => {
      if (isAbsent(raw) || asString(raw).trim() === "") {
        return "";
      }
      const name = property.trim();
      if (!/^-{0,2}[a-zA-Z][\w-]*$/.test(name)) {
        return "";
      }
      const declaration = asString(raw).trim().replace(/;$/, "").replaceAll("</", "");
      return `${name}: ${declaration};`;
    })
    .filter(Boolean)
    .join(" ");
}

/**
 * YAML map or CSS string → declaration block for banner_style / banner_style_light.
 */
function cssDeclarations(value?: unknown): string {
  if (value === false || value === "" || isAbsent(value)) {
    return "";
  }
  if (typeof value === "string") {
    return cssString(value);
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return cssFromMap(value);
  }
  return "";
}

function readFrontMatter(inputPath: unknown): string | undefined {
  if (typeof inputPath !== "string" || !fs.existsSync(inputPath)) {
    return;
  }
  const raw = fs.readFileSync(inputPath, "utf8");
  if (!raw.startsWith("---")) {
    return;
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) {
    return;
  }
  return raw.slice(3, end);
}

function unquoteYaml(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }
  return value;
}

// Public name is locked by unit tests (frontMatterHasKey).
// eslint-disable-next-line unicorn/consistent-boolean-name -- exported API
function frontMatterHasKey(inputPath: unknown, key: string): boolean {
  const frontMatter = readFrontMatter(inputPath);
  if (frontMatter === undefined) {
    return false;
  }
  return new RegExp(String.raw`^${key}\s*:`, "m").test(frontMatter);
}

function frontMatterValue(inputPath: unknown, key: string): string | undefined {
  const frontMatter = readFrontMatter(inputPath);
  if (frontMatter === undefined) {
    return;
  }
  const match = new RegExp(String.raw`^${key}\s*:\s*(.+?)\s*$`, "m").exec(frontMatter);
  const rawValue = match?.[1];
  if (rawValue === undefined) {
    return;
  }
  return unquoteYaml(rawValue.trim()) || undefined;
}

function resolveUnderSource(inputPath: string, trimmed: string): string {
  const fromDirectory = path.dirname(
    path.isAbsolute(inputPath) ? inputPath : path.resolve(ROOT, inputPath),
  );
  return trimmed.startsWith("/")
    ? path.resolve(SRC_ROOT, trimmed.replace(/^\/+/, ""))
    : path.resolve(fromDirectory, trimmed);
}

/**
 * Resolve a banner_path (relative or site-absolute) to a file under src/.
 */
function resolveBannerFile(inputPath?: unknown, bannerPath?: unknown): string | undefined {
  if (typeof inputPath !== "string" || isAbsent(bannerPath)) {
    return;
  }
  const trimmed = String(bannerPath).trim();
  if (!trimmed) {
    return;
  }
  const absoluteFile = resolveUnderSource(inputPath, trimmed);
  const relativePath = path.relative(SRC_ROOT, absoluteFile);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return;
  }
  if (!isReadableFile(absoluteFile)) {
    return;
  }
  return absoluteFile;
}

function sourceFileToUrl(absoluteFile: string): string {
  return `/${path.relative(SRC_ROOT, absoluteFile).split(path.sep).join("/")}`;
}

function fileCreatedDate(inputPath: string): Date {
  const stats = fs.statSync(inputPath);
  // birthtime is the file creation time on macOS/Windows; some Linux FS
  // report epoch 0 when unsupported — fall back to mtime in that case.
  if (stats.birthtimeMs && stats.birthtimeMs > 0) {
    return stats.birthtime;
  }
  return stats.mtime;
}

function passthroughBannerFile(eleventyConfig: PassthroughConfig, absoluteFile?: string): void {
  if (!absoluteFile) {
    return;
  }
  const destination = path.relative(SRC_ROOT, absoluteFile).split(path.sep).join("/");
  eleventyConfig.addPassthroughCopy({
    [path.relative(ROOT, absoluteFile)]: destination,
  });
}

function copyEntryMedia(
  eleventyConfig: PassthroughConfig,
  folder: string,
  entryName: string,
): void {
  const entryDirectory = path.join("src", folder, entryName);
  const mediaSource = path.join(entryDirectory, ".media");
  if (fs.existsSync(mediaSource)) {
    eleventyConfig.addPassthroughCopy({
      [mediaSource]: path.join(folder, entryName, ".media"),
    });
  }
  const bannerName = findBannerFile(path.join(ROOT, entryDirectory));
  if (bannerName) {
    eleventyConfig.addPassthroughCopy({
      [path.join(entryDirectory, bannerName)]: path.join(folder, entryName, bannerName),
    });
  }
  const markdownPath = path.join(ROOT, entryDirectory, "index.md");
  passthroughBannerFile(
    eleventyConfig,
    resolveBannerFile(markdownPath, frontMatterValue(markdownPath, "banner_path")),
  );
}

function passthroughMediaFolders(eleventyConfig: PassthroughConfig, folder: string): void {
  // Dotfolders like .media are skipped by default globs; map each entry's
  // .media dir explicitly so relative ![](.media/...) paths resolve.
  // Also copy optional banner.* beside each entry, and banner_path targets.
  // Read-only scan — does not modify anything under src/{folder}.
  const directory = path.join(ROOT, "src", folder);
  if (!fs.existsSync(directory)) {
    return;
  }
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) {
      continue;
    }
    copyEntryMedia(eleventyConfig, folder, entry.name);
  }
}

function normalizeExternalHref(value: unknown): string {
  const raw = asString(isAbsent(value) ? "" : value).trim();
  if (!raw) {
    return "";
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//")) {
    return raw;
  }
  return `https://${raw}`;
}

function labelFromHref(value: unknown): string {
  const raw = asString(isAbsent(value) ? "" : value).trim();
  if (!raw) {
    return "";
  }
  try {
    const parsed = new URL(normalizeExternalHref(raw));
    return `${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}${parsed.search}`.replace(
      /\/$/,
      "",
    );
  } catch {
    return raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

function readLinkField(value: object, key: string): unknown {
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}

function firstLinkField(value: object, keys: string[]): unknown {
  for (const key of keys) {
    const field = readLinkField(value, key);
    if (field) {
      return field;
    }
  }
}

function linkFromMap(value: object): FrontMatterLink {
  const href = normalizeExternalHref(firstLinkField(value, ["url", "href", "link"]) ?? "");
  const label = asString(firstLinkField(value, ["label", "text", "title"]) ?? "").trim();
  return { href, label: label || labelFromHref(href) };
}

function linkFromString(value: unknown): FrontMatterLink {
  const raw = asString(
    Array.isArray(value) ? value.map((item) => asString(item)).join(", ") : value,
  ).trim();
  const markdown = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(raw);
  const markdownLabel = markdown?.[1];
  const markdownHref = markdown?.[2];
  if (markdownLabel !== undefined && markdownHref !== undefined) {
    return {
      label: markdownLabel.trim(),
      href: normalizeExternalHref(markdownHref.trim()),
    };
  }
  const href = normalizeExternalHref(raw);
  return { href, label: labelFromHref(raw) };
}

/**
 * Front-matter `link:`: markdown, YAML map, or plain URL.
 */
function parseFrontMatterLink(value?: unknown): FrontMatterLink {
  if (value === "" || isAbsent(value)) {
    return { href: "", label: "" };
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return linkFromMap(value);
  }
  return linkFromString(value);
}

export {
  isContentMarkdown,
  isReadableFile,
  hacklasPathParts,
  parseHacklasMeta,
  stripNoteChrome,
  stripWriteupChrome,
  findBannerFile,
  cssDeclarations as cssDecls,
  frontMatterHasKey,
  resolveBannerFile,
  sourceFileToUrl as srcFileToUrl,
  fileCreatedDate,
  passthroughMediaFolders,
  parseFrontMatterLink,
};

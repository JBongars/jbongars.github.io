const fs = require("node:fs");
const path = require("node:path");
const { ROOT, SRC_ROOT } = require("./paths");

function isContentMarkdown(inputPath, folder) {
  return (
    typeof inputPath === "string" &&
    inputPath.includes(`${path.sep}${folder}${path.sep}`) &&
    inputPath.endsWith(".md")
  );
}

function isReadableFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/** Path segments under src/hacklas/… (dirs + filename stem) used as note tags. */
function hacklasPathParts(inputPath) {
  if (!inputPath) return [];
  const normalized = String(inputPath).replace(/\\/g, "/");
  const marker = "/hacklas/";
  const idx = normalized.lastIndexOf(marker);
  if (idx < 0) return [];
  const rel = normalized
    .slice(idx + marker.length)
    .replace(/\.md$/i, "");
  return rel.split("/").filter(Boolean);
}

/**
 * Parse the inline note chrome used in hacklas markdown:
 *   # Title
 *   **Author:** …
 *   **Date:** …
 *   **Path:** …
 *   ---
 */
function parseHacklasMeta(inputPath) {
  if (!inputPath || !fs.existsSync(inputPath)) return {};
  const raw = fs.readFileSync(inputPath, "utf8");

  const titleMatch = raw.match(/^#\s+(.+?)\s*$/m);
  const authorMatch = raw.match(/^\*\*Author:\*\*\s*(.+?)\s*$/im);
  const dateMatch = raw.match(/^\*\*Date:\*\*\s*(.+?)\s*$/im);

  let date;
  if (dateMatch) {
    const day = dateMatch[1].match(/(\d{4}-\d{2}-\d{2})/);
    if (day) {
      // Noon UTC so toISOString().slice(0, 10) keeps the authored calendar day.
      date = new Date(`${day[1]}T12:00:00.000Z`);
    }
  }

  return {
    title: titleMatch ? titleMatch[1].trim() : undefined,
    author: authorMatch ? authorMatch[1].replace(/\\$/, "").trim() : undefined,
    date,
  };
}

/**
 * Remove title + Author/Date/Path block (+ following hr) from rendered note HTML.
 * Layout renders Title / Author / Date / Tags instead.
 */
function stripNoteChrome(content) {
  if (!content) return content;
  let out = String(content);
  out = out.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, "");
  out = out.replace(
    /^\s*<p>(?=[\s\S]*?<strong>(?:Author|Date|Path):<\/strong>)[\s\S]*?<\/p>\s*/i,
    ""
  );
  out = out.replace(/^\s*<hr\s*\/?>\s*/i, "");
  return out;
}

/**
 * Drop leftover write-up chrome the layout already prints: a demoted
 * `# Box — Writeup` (h2) and the Platform/Target blockquote. New write-ups
 * should not include either (see WRITEUP_SPEC.md).
 */
function stripWriteupChrome(content) {
  if (!content) return content;
  let out = String(content);
  out = out.replace(/^\s*<h2\b[^>]*>[\s\S]*?<\/h2>\s*/i, "");
  out = out.replace(
    /^\s*<blockquote\b[^>]*>[\s\S]*?(?:Platform:|Target:)[\s\S]*?<\/blockquote>\s*/i,
    ""
  );
  return out;
}

const BANNER_FILES = ["banner.jpg", "banner.jpeg", "banner.png", "banner.webp"];

function findBannerFile(dir) {
  for (const name of BANNER_FILES) {
    if (fs.existsSync(path.join(dir, name))) return name;
  }
  return null;
}

/** YAML map or CSS string → declaration block for banner_style / banner_style_light. */
function cssDecls(value) {
  if (value == null || value === false || value === "") return "";
  if (typeof value === "string") {
    const css = value.trim().replace(/<\//g, "");
    if (!css) return "";
    return /;\s*$/.test(css) ? css : `${css};`;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value)
      .map(([prop, raw]) => {
        if (raw == null || String(raw).trim() === "") return "";
        const name = String(prop).trim();
        if (!/^-{0,2}[a-zA-Z][\w-]*$/.test(name)) return "";
        const val = String(raw).trim().replace(/;$/, "").replace(/<\//g, "");
        return `${name}: ${val};`;
      })
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function readFrontMatter(inputPath) {
  if (!inputPath || !fs.existsSync(inputPath)) return null;
  const raw = fs.readFileSync(inputPath, "utf8");
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return null;
  return raw.slice(3, end);
}

function frontMatterHasKey(inputPath, key) {
  const fm = readFrontMatter(inputPath);
  if (fm == null) return false;
  return new RegExp(`^${key}\\s*:`, "m").test(fm);
}

function frontMatterValue(inputPath, key) {
  const fm = readFrontMatter(inputPath);
  if (fm == null) return null;
  const match = fm.match(new RegExp(`^${key}\\s*:\\s*(.+?)\\s*$`, "m"));
  if (!match) return null;
  let value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value || null;
}

/** Resolve a banner_path (relative or site-absolute) to a file under src/. */
function resolveBannerFile(inputPath, bannerPath) {
  if (!inputPath || bannerPath == null) return null;
  const trimmed = String(bannerPath).trim();
  if (!trimmed) return null;

  const fromDir = path.dirname(
    path.isAbsolute(inputPath) ? inputPath : path.resolve(ROOT, inputPath)
  );
  const absFile = trimmed.startsWith("/")
    ? path.resolve(SRC_ROOT, trimmed.replace(/^\/+/, ""))
    : path.resolve(fromDir, trimmed);

  const rel = path.relative(SRC_ROOT, absFile);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  if (!isReadableFile(absFile)) return null;
  return absFile;
}

function srcFileToUrl(absFile) {
  return `/${path.relative(SRC_ROOT, absFile).split(path.sep).join("/")}`;
}

function fileCreatedDate(inputPath) {
  const stats = fs.statSync(inputPath);
  // birthtime is the file creation time on macOS/Windows; some Linux FS
  // report epoch 0 when unsupported — fall back to mtime in that case.
  if (stats.birthtimeMs && stats.birthtimeMs > 0) return stats.birthtime;
  return stats.mtime;
}

function passthroughBannerFile(eleventyConfig, absFile) {
  if (!absFile) return;
  const dest = path.relative(SRC_ROOT, absFile).split(path.sep).join("/");
  eleventyConfig.addPassthroughCopy({
    [path.relative(ROOT, absFile)]: dest,
  });
}

function passthroughMediaFolders(eleventyConfig, folder) {
  // Dotfolders like .media are skipped by default globs; map each entry's
  // .media dir explicitly so relative ![](.media/...) paths resolve.
  // Also copy optional banner.* beside each entry, and banner_path targets.
  // Read-only scan — does not modify anything under src/{folder}.
  const dir = path.join(ROOT, "src", folder);
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
    const bannerName = findBannerFile(path.join(ROOT, entryDir));
    if (bannerName) {
      eleventyConfig.addPassthroughCopy({
        [path.join(entryDir, bannerName)]: path.join(
          folder,
          entry.name,
          bannerName
        ),
      });
    }
    const mdPath = path.join(ROOT, entryDir, "index.md");
    passthroughBannerFile(
      eleventyConfig,
      resolveBannerFile(mdPath, frontMatterValue(mdPath, "banner_path"))
    );
  }
}

function normalizeExternalHref(value) {
  const raw = String(value == null ? "" : value).trim();
  if (!raw) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//")) return raw;
  return `https://${raw}`;
}

function labelFromHref(value) {
  const raw = String(value == null ? "" : value).trim();
  if (!raw) return "";
  try {
    const u = new URL(normalizeExternalHref(raw));
    return `${u.host}${u.pathname === "/" ? "" : u.pathname}${u.search}`.replace(
      /\/$/,
      ""
    );
  } catch {
    return raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

/** Front-matter `link:`: markdown, YAML map, or plain URL. */
function parseFrontMatterLink(value) {
  if (value == null || value === "") {
    return { href: "", label: "" };
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const href = normalizeExternalHref(value.url || value.href || value.link || "");
    const label = String(value.label || value.text || value.title || "").trim();
    return { href, label: label || labelFromHref(href) };
  }

  // YAML may parse `[label](url)` as a broken flow seq — prefer quoted strings.
  let raw = value;
  if (Array.isArray(value)) {
    raw = value.map(String).join(", ");
  }
  raw = String(raw).trim();

  const md = raw.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
  if (md) {
    return {
      label: md[1].trim(),
      href: normalizeExternalHref(md[2].trim()),
    };
  }

  const href = normalizeExternalHref(raw);
  return { href, label: labelFromHref(raw) };
}

module.exports = {
  isContentMarkdown,
  isReadableFile,
  hacklasPathParts,
  parseHacklasMeta,
  stripNoteChrome,
  stripWriteupChrome,
  findBannerFile,
  cssDecls,
  frontMatterHasKey,
  resolveBannerFile,
  srcFileToUrl,
  fileCreatedDate,
  passthroughMediaFolders,
  parseFrontMatterLink,
};

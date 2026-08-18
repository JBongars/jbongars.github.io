/**
 * Site root for GitHub Pages. User site: SITE_URL=https://jbongars.github.io/
 * Project Pages still work via PATH_PREFIX=/repo/ or a SITE_URL pathname.
 */
const path = require("node:path");

function resolvePathPrefix() {
  const fromEnv = process.env.PATH_PREFIX || process.env.ELEVENTY_PATH_PREFIX;
  let raw = fromEnv;
  if (!raw && process.env.SITE_URL) {
    try {
      raw = new URL(process.env.SITE_URL).pathname;
    } catch {
      raw = process.env.SITE_URL;
    }
  }
  if (!raw || raw === "/") return "/";
  let p = String(raw).trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1 && !p.endsWith("/")) p = `${p}/`;
  return p;
}

const pathPrefix = resolvePathPrefix();
const ROOT = path.join(__dirname, "..");
const SRC_ROOT = path.join(ROOT, "src");

function withPathPrefix(href) {
  if (!href || typeof href !== "string" || !href.startsWith("/")) return href;
  if (pathPrefix === "/") return href;
  return pathPrefix.replace(/\/$/, "") + href;
}

function siteOrigin() {
  const raw = process.env.SITE_URL;
  return raw ? String(raw).replace(/\/?$/, "") : "";
}

function siteUrl() {
  const raw = process.env.SITE_URL;
  if (!raw) return "";
  return String(raw).replace(/\/?$/, "/");
}

function absoluteHref(pathname) {
  const href = pathname == null || pathname === "" ? "/" : String(pathname);
  const normalized = href.startsWith("/") ? href : `/${href}`;
  const origin = siteOrigin();
  return origin ? `${origin}${normalized}` : normalized;
}

module.exports = {
  ROOT,
  SRC_ROOT,
  pathPrefix,
  withPathPrefix,
  siteOrigin,
  siteUrl,
  absoluteHref,
};

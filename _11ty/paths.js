/**
 * Site root for GitHub Pages. User site: SITE_URL=https://jbongars.github.io/
 * Project Pages still work via PATH_PREFIX=/repo/ or a SITE_URL pathname.
 */
import path from "node:path";

function pathPrefixFromSiteUrl(siteUrlValue) {
  try {
    return new URL(siteUrlValue).pathname;
  } catch {
    return siteUrlValue;
  }
}

function normalizePathPrefix(raw) {
  if (!raw || raw === "/") {
    return "/";
  }
  let prefix = String(raw).trim();
  if (!prefix.startsWith("/")) {
    prefix = `/${prefix}`;
  }
  if (prefix.length > 1 && !prefix.endsWith("/")) {
    prefix += "/";
  }
  return prefix;
}

function resolvePathPrefix(environment = process.env) {
  const fromEnvironment = environment.PATH_PREFIX || environment.ELEVENTY_PATH_PREFIX;
  const raw =
    fromEnvironment || (environment.SITE_URL && pathPrefixFromSiteUrl(environment.SITE_URL));
  return normalizePathPrefix(raw);
}

const pathPrefix = resolvePathPrefix();
const ROOT = path.join(import.meta.dirname, "..");
const SRC_ROOT = path.join(ROOT, "src");

function withPathPrefix(href) {
  if (!href || typeof href !== "string" || !href.startsWith("/")) {
    return href;
  }
  if (pathPrefix === "/") {
    return href;
  }
  return pathPrefix.replace(/\/$/, "") + href;
}

function siteOrigin(environment = process.env) {
  const raw = environment.SITE_URL;
  return raw ? String(raw).replace(/\/?$/, "") : "";
}

function siteUrl(environment = process.env) {
  const raw = environment.SITE_URL;
  if (!raw) {
    return "";
  }
  return String(raw).replace(/\/?$/, "/");
}

function absoluteHref(pathname, environment = process.env) {
  const href = String(pathname ?? "") || "/";
  const normalized = href.startsWith("/") ? href : `/${href}`;
  const origin = siteOrigin(environment);
  return origin ? `${origin}${normalized}` : normalized;
}

export {
  ROOT,
  SRC_ROOT,
  pathPrefix,
  withPathPrefix,
  siteOrigin,
  siteUrl,
  absoluteHref,
  resolvePathPrefix,
};

/**
 * Site root for GitHub Pages. User site: SITE_URL=https://jbongars.github.io/
 * Project Pages still work via PATH_PREFIX=/repo/ or a SITE_URL pathname.
 */
import path from "node:path";
import type { Environment } from "./types.ts";
import { asString, asStringOrEmpty } from "./text.ts";

function pathPrefixFromSiteUrl(siteUrlValue: string): string {
  try {
    return new URL(siteUrlValue).pathname;
  } catch {
    return siteUrlValue;
  }
}

function normalizePathPrefix(raw: unknown): string {
  if (!raw || raw === "/") {
    return "/";
  }
  let prefix = asString(raw).trim();
  if (!prefix.startsWith("/")) {
    prefix = `/${prefix}`;
  }
  if (prefix.length > 1 && !prefix.endsWith("/")) {
    prefix += "/";
  }
  return prefix;
}

function resolvePathPrefix(environment: Environment = process.env): string {
  const pathPrefixValue = environment["PATH_PREFIX"];
  const fromEnvironment = pathPrefixValue ?? environment["ELEVENTY_PATH_PREFIX"];
  const siteUrlValue = environment["SITE_URL"];
  const raw = fromEnvironment ?? (siteUrlValue && pathPrefixFromSiteUrl(siteUrlValue));
  return normalizePathPrefix(raw);
}

const pathPrefix = resolvePathPrefix();
const ROOT = path.join(import.meta.dirname, "..");
const SRC_ROOT = path.join(ROOT, "src");

function withPathPrefix(href: unknown): unknown {
  if (!href || typeof href !== "string" || !href.startsWith("/")) {
    return href;
  }
  if (pathPrefix === "/") {
    return href;
  }
  return pathPrefix.replace(/\/$/, "") + href;
}

function siteOrigin(environment: Environment = process.env): string {
  const raw = environment["SITE_URL"];
  return raw ? raw.replace(/\/?$/, "") : "";
}

function siteUrl(environment: Environment = process.env): string {
  const raw = environment["SITE_URL"];
  if (!raw) {
    return "";
  }
  return raw.replace(/\/?$/, "/");
}

function absoluteHref(pathname?: unknown, environment: Environment = process.env): string {
  const href = asStringOrEmpty(pathname) || "/";
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

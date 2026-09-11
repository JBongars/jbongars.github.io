/**
 * Security headers for the site.
 *
 * GitHub Pages cannot set arbitrary HTTP response headers, so CSP and
 * Referrer-Policy are also emitted as <meta> tags in base.njk (those two
 * are honored from HTML). Cache-Control is not honored from HTML; Pages
 * uses its own ~10 minute CDN cache. The Eleventy dev server applies the
 * full header set (including 24h asset cache) via middleware that reads
 * httpHeaders on each request. Static setServerOptions headers are copied
 * at config load, before theme-init is bundled.
 *
 * Giscus comments load https://giscus.app/client.js, which iframes
 * https://giscus.app/en/widget — both origins must stay in the policy.
 * theme-init is inlined after the checkbox; its sha256 must stay in
 * script-src (CSP3 ignores 'unsafe-inline' once a hash is present).
 */
import crypto from "node:crypto";
import type { BundleResult } from "./bundle.ts";

interface RequestLike {
  url?: string;
}

interface ResponseLike {
  setHeader(name: string, value: string): void;
}

const referrerPolicy = "strict-origin-when-cross-origin";

const ASSET_RE = /\.(?:css|js|mjs|avif|webp|png|jpe?g|gif|svg|ico|woff2?|pdf|webmanifest)$/i;
const CACHE_ASSETS = "public, max-age=86400";
const CACHE_HTML = "no-cache";

function sha256Base64(value: string): string {
  return crypto.createHash("sha256").update(value).digest("base64");
}

function buildContentSecurityPolicy(themeInitHash: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "worker-src 'none'",
    `script-src 'self' 'sha256-${themeInitHash}' https://giscus.app`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self' https://giscus.app",
    "frame-src https://giscus.app/en/widget",
    "upgrade-insecure-requests",
  ].join("; ");
}

function cacheControlMiddleware(
  request: RequestLike,
  response: ResponseLike,
  next: () => void,
): void {
  const url = (request.url ?? "").split("?", 1)[0] ?? "";
  if (url.startsWith("/.11ty/")) {
    response.setHeader("Cache-Control", "no-store");
  } else if (ASSET_RE.test(url)) {
    response.setHeader("Cache-Control", CACHE_ASSETS);
  } else {
    response.setHeader("Cache-Control", CACHE_HTML);
  }
  next();
}

function applyHttpHeaders(response: ResponseLike): void {
  for (const [name, value] of Object.entries(security.httpHeaders)) {
    response.setHeader(name, value);
  }
}

function developmentServerMiddleware(
  request: RequestLike,
  response: ResponseLike,
  next: () => void,
): void {
  applyHttpHeaders(response);
  cacheControlMiddleware(request, response, next);
}

const emptyThemeHash = sha256Base64("");
const initialCsp = buildContentSecurityPolicy(emptyThemeHash);

const security = {
  contentSecurityPolicy: initialCsp,
  referrerPolicy,
  themeInitScript: "",
  httpHeaders: {
    "Content-Security-Policy": `${initialCsp}; frame-ancestors 'none'`,
    "Referrer-Policy": referrerPolicy,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  },
  cacheControlMiddleware,
  developmentServerMiddleware,
};

function refreshPolicies(themeInitHash: string): void {
  security.contentSecurityPolicy = buildContentSecurityPolicy(themeInitHash);
  security.httpHeaders["Content-Security-Policy"] =
    `${security.contentSecurityPolicy}; frame-ancestors 'none'`;
}

function applyThemeInit(code: string): void {
  security.themeInitScript = code;
  refreshPolicies(sha256Base64(code));
}

function applyThemeInitFromBundle(bundle: BundleResult): void {
  const theme = bundle.inline["theme-init"];
  if (!theme) {
    throw new Error("Client bundle did not produce a theme-init inline entry.");
  }
  applyThemeInit(theme.code);
}

export { applyThemeInit, applyThemeInitFromBundle };
export default security;

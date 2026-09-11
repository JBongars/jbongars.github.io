/**
 * Security headers for the site.
 *
 * GitHub Pages cannot set arbitrary HTTP response headers, so CSP and
 * Referrer-Policy are also emitted as <meta> tags in base.njk (those two
 * are honored from HTML). Cache-Control is not honored from HTML; Pages
 * uses its own ~10 minute CDN cache. The Eleventy dev server applies the
 * full header set (including 24h asset cache) via setServerOptions.
 *
 * Giscus comments load https://giscus.app/client.js, which iframes
 * https://giscus.app/en/widget — both origins must stay in the policy.
 * theme-init.js is inlined after the checkbox; its sha256 must stay in
 * script-src (CSP3 ignores 'unsafe-inline' once a hash is present).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const themeInitScript = fs.readFileSync(
  path.join(import.meta.dirname, "../js/theme-init.js"),
  "utf8",
);
const themeInitHash = crypto.createHash("sha256").update(themeInitScript).digest("base64");

const contentSecurityPolicy = [
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

const referrerPolicy = "strict-origin-when-cross-origin";

const ASSET_RE = /\.(?:css|js|mjs|avif|webp|png|jpe?g|gif|svg|ico|woff2?|pdf|webmanifest)$/i;
const CACHE_ASSETS = "public, max-age=86400";
const CACHE_HTML = "no-cache";

function cacheControlMiddleware(request, response, next) {
  const url = String(request.url || "").split("?", 1)[0];
  if (url.startsWith("/.11ty/")) {
    response.setHeader("Cache-Control", "no-store");
  } else if (ASSET_RE.test(url)) {
    response.setHeader("Cache-Control", CACHE_ASSETS);
  } else {
    response.setHeader("Cache-Control", CACHE_HTML);
  }
  next();
}

export default {
  contentSecurityPolicy,
  referrerPolicy,
  themeInitScript,
  httpHeaders: {
    "Content-Security-Policy": `${contentSecurityPolicy}; frame-ancestors 'none'`,
    "Referrer-Policy": referrerPolicy,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  },
  cacheControlMiddleware,
};

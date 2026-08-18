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
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const themeInitScript = fs.readFileSync(
  path.join(__dirname, "../js/theme-init.js"),
  "utf8"
);
const themeInitHash = crypto
  .createHash("sha256")
  .update(themeInitScript)
  .digest("base64");

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

const ASSET_RE =
  /\.(?:css|js|mjs|avif|webp|png|jpe?g|gif|svg|ico|woff2?|pdf|webmanifest)$/i;
const CACHE_ASSETS = "public, max-age=86400";
const CACHE_HTML = "no-cache";

function cacheControlMiddleware(req, res, next) {
  const url = String(req.url || "").split("?")[0];
  if (url.startsWith("/.11ty/")) {
    res.setHeader("Cache-Control", "no-store");
  } else if (ASSET_RE.test(url)) {
    res.setHeader("Cache-Control", CACHE_ASSETS);
  } else {
    res.setHeader("Cache-Control", CACHE_HTML);
  }
  next();
}

module.exports = {
  contentSecurityPolicy,
  referrerPolicy,
  themeInitScript,
  httpHeaders: {
    "Content-Security-Policy": `${contentSecurityPolicy}; frame-ancestors 'none'`,
    "Referrer-Policy": referrerPolicy,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  },
  cacheControlMiddleware,
};

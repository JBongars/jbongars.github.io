/**
 * Security headers for the site.
 *
 * GitHub Pages cannot set arbitrary HTTP response headers, so CSP and
 * Referrer-Policy are also emitted as <meta> tags in base.njk (those two
 * are honored from HTML). The Eleventy dev server applies the full HTTP
 * set via setServerOptions.
 *
 * Giscus comments load https://giscus.app/client.js, which iframes
 * https://giscus.app/en/widget — both origins must stay in the policy.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "worker-src 'none'",
  "script-src 'self' https://giscus.app",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self' https://giscus.app",
  "frame-src https://giscus.app/en/widget",
  "upgrade-insecure-requests",
].join("; ");

const referrerPolicy = "strict-origin-when-cross-origin";

module.exports = {
  contentSecurityPolicy,
  referrerPolicy,
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
};

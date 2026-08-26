---
note_tags:
  - xss
  - javascript
  - cookie
  - foothold
  - cross-site-scripting
  - stored
---
# XSS (Cross-Site Scripting)

**Author:** Julien Bongars\
**Date:** 2025-10-13 00:03:48
**Path:** infiltration/web/xss-cross-site-scripting/main.md

---

Payloads, recon, CSP, and semgrep live on [XSS enumeration](../../../enumeration/web/xss-cross-site-scripting/enumeration.md). This file was a duplicate from the headers check downward.

## Reconnaissance & Testing

### Security Headers Reference

| Header                      | Description                                                      | Secure Value                                                              | Insecure/Missing                                               |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `Content-Security-Policy`   | Controls which resources can be loaded (scripts, styles, images) | `default-src 'self'; script-src 'self' 'nonce-RANDOM'; object-src 'none'` | Missing or contains `'unsafe-inline'`, `'unsafe-eval'`, or `*` |
| `X-Content-Type-Options`    | Prevents MIME type sniffing                                      | `nosniff`                                                                 | Missing                                                        |
| `X-Frame-Options`           | Prevents clickjacking attacks                                    | `DENY` or `SAMEORIGIN`                                                    | Missing or `ALLOW-FROM`                                        |
| `X-XSS-Protection`          | Legacy browser XSS filter (deprecated but defense-in-depth)      | `1; mode=block`                                                           | `0` or missing                                                 |
| `Strict-Transport-Security` | Forces HTTPS connections                                         | `max-age=31536000; includeSubDomains; preload`                            | Missing or low `max-age`                                       |
| `Referrer-Policy`           | Controls referrer information leakage                            | `no-referrer` or `strict-origin-when-cross-origin`                        | Missing or `unsafe-url`                                        |
| `Permissions-Policy`        | Controls browser features (camera, microphone, geolocation)      | `camera=(), microphone=(), geolocation=()`                                | Missing                                                        |

**Check headers:**

```bash
curl -I https://target.com
```

**Online tools:**

- https://securityheaders.com
- https://observatory.mozilla.org

## Resources

- [XSS enumeration](../../../enumeration/web/xss-cross-site-scripting/enumeration.md) — payloads, CSP, semgrep
- [securityheaders.com](https://securityheaders.com) — live header grade
- [Mozilla Observatory](https://observatory.mozilla.org) — live header grade

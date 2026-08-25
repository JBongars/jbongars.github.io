# semgrep

**Author:** Julien Bongars\
**Date:** 2026-08-26
**Path:**

---

> **EDITOR NOTE**
>
> This page was created 100% with AI as a disclosure.

Static pattern matching over source you dumped from a target (JS bundles, PHP, Python, Java). Faster than reading minified files by eye.

## Install

```bash
python3 -m pip install semgrep
# or
brew install semgrep
```

## XSS / sink rulesets

```bash
# Generic XSS
semgrep --config=p/xss .

# Language packs
semgrep --config=p/javascript .
semgrep --config=p/php .
semgrep --config=p/java .
semgrep --config=p/flask .
semgrep --config=p/django .

# Kitchen sink (noisier)
semgrep --config=auto .
```

## Other useful packs

```bash
semgrep --config=p/security-audit .
semgrep --config=p/owasp-top-ten .
semgrep --config=p/secrets .
```

Point it at a dumped `src/`, a `wget -r` tree, or a single minified `app.js`.

## Resources

- [semgrep](https://github.com/semgrep/semgrep) — CLI source
- [semgrep registry](https://semgrep.dev/r) — `p/xss` and other packs
- [XSS enumeration](./web/xss-cross-site-scripting/enumeration.md) — payloads and DOM checks

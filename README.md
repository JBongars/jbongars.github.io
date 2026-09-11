# Personal website

Static site for [Julien Bongars](https://jbongars.github.io/) — Eleventy 3 +
Nunjucks. Dark-first UI, progressive enhancement. Pages work without
JavaScript.

## Quick start

```bash
yarn install
yarn serve   # local preview (unminified JS) → http://localhost:8080
yarn build   # production build (minified JS) → _site/
yarn run check   # format:check, lint, typecheck, test:ci (`yarn check` is Yarn's integrity command)
yarn test        # Jest integration tests
yarn audit   # yarn audit --level high (also runs in CI)
yarn lighthouse  # headless report → lighthouse.html (needs serve running)
```

Push to `main` deploys `_site/` to user GitHub Pages
(`https://jbongars.github.io/`) via `.github/workflows/deploy.yml`.

### Site URL and path prefix

Asset and nav URLs use Eleventy’s `pathPrefix`, from:

| Env var       | Example                       | Use                                            |
| ------------- | ----------------------------- | ---------------------------------------------- |
| `SITE_URL`    | `https://jbongars.github.io/` | Canonical origin (pathname becomes the prefix) |
| `PATH_PREFIX` | `/`                           | Path only (overrides `SITE_URL` if both set)   |

Local `serve` / `build` default to `/`. Deploy sets `SITE_URL` so canonical
tags, Open Graph, `robots.txt`, `sitemap.xml`, `llms.txt`, `feed.xml`, and
`/resume.json` are absolute. Templates use the `| url` filter; client JS uses
`window.siteUrl()` from `site-url.js`.

```bash
SITE_URL=https://jbongars.github.io/ yarn build
```

## Layout

```
.eleventy.js      # plugins, copies, collections
_11ty/            # markdown, JSON-LD, banners, computed data
src/
  _data/          # resume.json + resume.pdf, features, comments, security, skills
  _includes/      # base, post, note, comments, hacklas-disclaimer, skill-tag
  blog/           # listing + one folder per post
  write-ups/      # listing + one folder per write-up
  hacklas.njk     # notes index (built only if the flag is on)
  404.njk
  js/             # deferred progressive enhancement
  css/            # modules bundled to /css/style.css
  llms.njk, feed.njk, sitemap.njk, robots.njk, resume-json.11ty.js
```

**Content**

| Section          | Input                                           | Layout     | Notes                                      |
| ---------------- | ----------------------------------------------- | ---------- | ------------------------------------------ |
| Home / Resume    | `index.njk`, `resume.njk` + `_data/resume.json` | `base.njk` | Data-driven; PDF at `/resume.pdf`          |
| Blog / Write-ups | `src/{blog,write-ups}/**/*.md`                  | `post.njk` | Front matter, banners, TOC, listing search |
| Hacklas          | `src/hacklas/**/*.md`                           | `note.njk` | On (`features.json`)                       |

**Machine-readable**

| URL            | What                                         |
| -------------- | -------------------------------------------- |
| `/llms.txt`    | Agent map (resume vs blog vs write-ups)      |
| `/feed.xml`    | RSS of blog + write-ups                      |
| `/resume.json` | JSON Resume (generated; do not edit by hand) |
| `/sitemap.xml` | HTML + PDF + catalogs                        |
| `/robots.txt`  | Allow all, Sitemap, llms.txt note            |

**Markdown pipeline** (`_11ty/markdown.js`): Prism at build time, heading IDs +
TOC, task lists, demote headings on posts, rewrite relative `*.md` links,
Hacklas chrome stripping.

**Client JS** (progressive enhancement; site works without it)

Rollup bundles client scripts during `eleventy.before`. `_site/js` is build
output, not a copy of `src/js`.

- `theme-init` — Rollup IIFE inlined after the theme checkbox (CSP hashes the
  **built** string)
- `/js/site.js` — ES module of every page-enhancement script so soft navigation
  still has handlers
- `/js/hacklas-disclaimer-init.js` — classic blocking IIFE file (`'self'`)

Source files remain classic IIFEs under `src/js/` until the module-contract
stop. Conversion order: `docs/BUILD_TEST_REFACTOR.md`.

## Feature flags

`src/_data/features.json`:

```json
{ "hacklas": true, "hacklas_show_beta": true }
```

`hacklas: false` hides the nav item, skips Hacklas pages, and removes `_site/hacklas`.
`hacklas_show_beta` draws a small “beta” badge next to Hacklas in the nav and
on Hacklas pages.

## Conventions

- Progressive enhancement first; no hard JS dependency for reading content.
- Blog/write-up entries: one folder per post with `index.md` and optional
  `banner.*` / `banner_path` / `.media/`.
- Optional `description` in front matter (quote it in YAML if it contains `:`).
- Hacklas notes: symlink `src/hacklas` → your notes tree when enabling the flag.
- Write-up body format: `docs/WRITEUP_SPEC.md`.
- Hacklas note format: `docs/HACKLAS_SPEC.md`.
- Product constraints: `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`.
- TypeScript / Rollup / lint / Jest refactor (in progress, one stop at a
  time): `docs/BUILD_TEST_REFACTOR.md`.
- Historical scaffold notes (complete): `docs/BUILD_ORDER.md`.

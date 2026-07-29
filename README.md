# Personal website

Static site built with [Eleventy](https://www.11ty.dev/) (v3) + Nunjucks. Dark-first UI, progressive enhancement — pages work without JavaScript.

## Quick start

```bash
npm install
npm run serve   # http://localhost:8080
npm run build   # output → _site/
```

Push to `main` deploys `_site/` to GitHub Pages via `.github/workflows/deploy.yml`.

## Architecture

```
src/
  _data/          # resume, features, skill dictionary
  _includes/      # base, post, note layouts
  blog/           # markdown posts (+ optional banner.*)
  write-ups/      # markdown write-ups (+ optional banner.*)
  hacklas/        # notes tree (symlink to external notes when enabled)
  hacklas.njk     # Hacklas fuzzy-find index
  js/             # deferred progressive enhancement
  css/            # design tokens + layouts
.eleventy.js      # collections, markdown pipeline, filters
```

**Content**

| Section | Input | Layout | Notes |
|---|---|---|---|
| Home / Resume | `index.njk`, `resume.njk` + `_data/resume.json` | `base.njk` | Data-driven |
| Blog / Write-ups | `src/{blog,write-ups}/**/*.md` | `post.njk` | Front matter meta, banners, TOC, listing sort/tag search |
| Hacklas | `src/hacklas/**/*.md` | `note.njk` | Path segments → tags; fuzzy finder; optional feature flag |

**Markdown pipeline** (`.eleventy.js`): Prism highlighting, heading IDs + TOC, GitHub-style task lists, demote headings for posts (title lives in layout), rewrite relative `*.md` links for pretty URLs, strip Hacklas inline Author/Date/Path chrome into the note header.

**Client JS** (deferred; site works without it)

- `site.js` — theme persistence + same-origin soft navigation
- `booru-search.js` — blog/write-up listing sort + tag/title search
- `fuzzy-find.js` — Hacklas Spotlight-style finder (`?q=` in URL)
- `hacklas-disclaimer.js` — one-time disclaimer gate (`localStorage`)
- `back-button.js` — history back for notes/posts

## Feature flags

`src/_data/features.json`:

```json
{ "hacklas": true }
```

Set `"hacklas": false` to hide the nav item, skip building Hacklas pages, and remove `_site/hacklas`.

## Conventions

- Progressive enhancement first; no hard JS dependency for reading content.
- Blog/write-up entries: one folder per post with `index.md` and optional `banner.*`.
- Hacklas notes: symlink `src/hacklas` → your notes tree; tags come from directory path.

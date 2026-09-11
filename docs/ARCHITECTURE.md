# ARCHITECTURE.md

## Stack

- Static site generator: Eleventy (11ty) v3.x, Nunjucks templates
- Styling: hand-written CSS modules under `src/css/`, concatenated at build
  into `/css/style.css` (`src/css/bundle.11ty.ts`). No preprocessor, no
  framework. Writing standard: [CSS_ARCHITECTURE.md](CSS_ARCHITECTURE.md)
  (BEM + SMACSS + custom properties only — not CSS-in-JS or Tailwind).
- Client JS is progressive enhancement (site works without it). Rollup
  bundles `src/js/entries/` into `/js/` during the Eleventy build (`site`
  module, inlined `theme-init` IIFE, classic `hacklas-disclaimer-init`
  file). Feature modules live in `src/js/<name>/` (Hacklas under
  `src/js/hacklas/`). CSP hashes the **built** theme-init string. Rollup is
  the only allowed bundler; it touches client JS only. See the README.
- Hosting: user GitHub Pages at `https://jbongars.github.io/`, deployed via
  GitHub Actions on push to `main` (Node 24 to build, from `.nvmrc`;
  checkout/setup-node/Pages actions on the runner runtime).
- Security: CSP + Referrer-Policy as `<meta>` (Pages cannot set custom HTTP
  headers, including Cache-Control). The Eleventy dev server sends the full
  header set from `src/_data/security.js`, and caches CSS/JS/images for 24h.
  Giscus is allowed at `https://giscus.app` / `https://giscus.app/en/widget`.
  `style-src` includes `'unsafe-inline'` because post banners emit a small
  `<style>` block.
- CI: a `check` job on pull requests and `main` runs `yarn install
--frozen-lockfile`, `yarn audit --level high`, `yarn format:check`,
  `yarn lint`, `yarn typecheck`, and `yarn test:ci`. `build` needs `check`. Deploy to Pages
  runs only on push to `main`.

## File structure

    /
    ├── eleventy.config.ts        # orchestrator: plugins, copies, filters, collections
    ├── _11ty/                    # build helpers (not site content)
    │   ├── paths.ts              # SITE_URL / pathPrefix / absoluteHref
    │   ├── text.ts               # XML/HTML escape, RSS summaries
    │   ├── content.ts            # banners, Hacklas notes, media passthrough
    │   ├── markdown.ts           # Prism, TOC, markdown-it rules
    │   ├── jsonld.ts             # Schema.org graphs + meta descriptions
    │   ├── computed.ts           # eleventyComputed (layout, date, banner, …)
    │   └── bundle.ts             # Rollup wrapper
    ├── package.json
    ├── src/
    │   ├── _includes/
    │   │   ├── base.njk          # shell: head, nav, footer, JSON-LD, skip link
    │   │   ├── post.njk          # blog / write-up layout
    │   │   ├── note.njk          # Hacklas note layout
    │   │   ├── comments.njk      # Giscus mount (noscript fallback)
    │   │   ├── hacklas-disclaimer.njk
    │   │   ├── hacklas-beta-badge.njk
    │   │   └── skill-tag.njk
    │   ├── _data/
    │   │   ├── resume.json       # experience — single source of truth
    │   │   ├── resume.pdf        # copied to /resume.pdf
    │   │   ├── features.json     # { "hacklas": true, "hacklas_show_beta": true }
    │   │   ├── comments.json     # Giscus repo / ids / themes
    │   │   ├── security.js       # re-export of _11ty/security.ts
    │   │   └── skillDictionary.json
    │   ├── css/                  # style.css is the @import manifest; bundle.11ty.ts
    │   │                         # concatenates it to /css/style.css
    │   ├── js/                   # deferred enhancement (see README)
    │   │   ├── entries/          # Rollup inputs: site.js, theme-init.js, …
    │   │   ├── platform/         # storage, fetch, clipboard, matchMedia
    │   │   ├── <feature>/        # index.ts, types.ts, index.test.ts
    │   │   └── hacklas/          # Hacklas-only modules
    │   ├── blog/                 # listing + one folder per post
    │   ├── write-ups/            # listing + one folder per write-up
    │   ├── hacklas.njk           # fuzzy-find index (ignored when flag is off)
    │   ├── 404.njk
    │   ├── robots.njk            # → /robots.txt
    │   ├── sitemap.njk           # → /sitemap.xml
    │   ├── llms.njk              # → /llms.txt
    │   ├── feed.njk              # → /feed.xml
    │   ├── resume-json.11ty.ts   # → /resume.json (JSON Resume)
    │   ├── index.njk
    │   └── resume.njk
    ├── tests/
    │   ├── unit/                 # Node tests for _11ty and .11ty.ts
    │   ├── integration/enhance/  # built HTML + real init
    │   └── setup/
    └── .github/workflows/
        └── deploy.yml

`_11ty/` is the Eleventy helper folder. `tests/` is allowed for Jest (see
[SPEC_TEST_TS.md](SPEC_TEST_TS.md)). Do not add a `components/`
directory or other app-style trees. Client feature modules each get a
folder under `src/js/` (`index.ts`, `types.ts`, colocated `index.test.ts`);
Hacklas modules live under `src/js/hacklas/`. A `scripts/` directory
is reserved for Playwright later and is not part of this program.

## Build, test, and TypeScript

The conversion to TypeScript, Rollup (client JS only), ESLint/Prettier, and
Jest is **done** ([BUILD_TEST_REFACTOR.md](BUILD_TEST_REFACTOR.md)). How:
[SPEC_BUILD_TS.md](SPEC_BUILD_TS.md), [SPEC_LINTING.md](SPEC_LINTING.md),
[SPEC_TEST_TS.md](SPEC_TEST_TS.md). Coverage floors are live: 90% global,
80% per collected file. `eleventy.config.ts` and `src/js/entries/` stay
out of coverage.

`theme-init` and `hacklas-disclaimer-init` remain classic IIFEs. Do not
introduce another bundler, a JS/CSS framework, or Playwright unless asked.

## Content model

Blog post front matter:

    ---
    title: string
    date: YYYY-MM
    author: string                    # optional
    description: "…"                  # optional; used in meta, RSS, llms.txt
    tags: [blog, ...]
    banner_path: ../backgrounds/example.jpg
    banner_style:                     # optional CSS map (dark)
      filter: saturate(0.5) brightness(0.6);
    banner_style_light:               # optional CSS map (light toggle)
      filter: saturate(0.5) brightness(1.5);
    disable_tree: true                # optional; hides the heading TOC
    link: "[label](https://example.com)"
    ---

Write-up front matter: same shape, plus platform tags. Formatting rules for
the body live in [WRITEUP_SPEC.md](WRITEUP_SPEC.md).

Hacklas notes keep Author/Date/Path chrome in the markdown body (see
[HACKLAS_SPEC.md](HACKLAS_SPEC.md)). Optional YAML `note_tags` (not `tags:`)
are merged with path segments for booru search; breadcrumbs stay on the path.

Resume data (`_data/resume.json`): `name`, `title`, `location`, `linkedin`,
`github`, `skills`, `education`, `certificates`, `experience` (company, title,
`start` / `end`, bullets, tools, optional agency, location, links,
remote/hybrid/onsite). Optional `biography`. Do not replace this file with
the JSON Resume schema — `/resume.json` is generated from it.

## Collections

- `blog` — `src/blog/**/*.md`, newest first
- `writeUps` — `src/write-ups/**/*.md`, newest first
- `feed` — blog + write-ups, newest first (`/feed.xml`)
- `hacklas` — empty unless `features.hacklas` is true

## Blog / write-up folders

Each entry is a directory so images live next to markdown:

    src/blog/
    └── some-post/
        ├── index.md
        └── .media/
            └── screenshot.png

Relative images: `![](.media/screenshot.png)`. Eleventy passthrough-copies
each `.media/` folder and optional `banner.*` / `banner_path` targets
(`_11ty/content.ts`). Size is markdown-native:

- `> ![alt](src)` — smaller screenshot (~22rem)
- `![alt](src)` — default; blog posts cap height at 40vh
- `!![alt](src)` — full content-column width

## Markdown pipeline

Implemented in `_11ty/markdown.ts` (wired from `eleventy.config.ts`):

- Prism highlighting at **build** time (`@11ty/eleventy-plugin-syntaxhighlight`
  - a custom fence highlighter with language aliases)
- Heading IDs + TOC (`toc` filter); posts demote `#` so the layout title is
  the only h1
- GitHub-style task lists
- `!![alt](src)` images marked full-width (`.prose-img--full`)
- Relative `*.md` links rewritten for pretty URLs
- Hacklas: strip Author/Date/Path chrome; long `####` lines become bold
  paragraphs

Do not use a client-side highlighter.

## Images

`@11ty/eleventy-img` transform plugin: AVIF/WebP, widths 400/800/1200,
`transformOnRequest: false` so `--serve` uses the same hashed files as
production. `eleventy:ignore` on icons and the footer signature.

## CSS modules

Hand-written CSS under `src/css/` is the only styling layer. Follow
[CSS_ARCHITECTURE.md](CSS_ARCHITECTURE.md) for naming, organization, and
custom properties. That document's CSS-in-JS, Tailwind / utility-first, and
preprocessor examples do **not** apply (see SPEC.md non-goals). Visual
tokens, motion, and banned looks still come from [DESIGN.md](DESIGN.md).

`src/css/style.css` lists `@import`s; `bundle.11ty.ts` inlines them in that
order into `/css/style.css`. `base.njk` loads it as `/css/style.css?v=<hash>`
so a flag flip (Hacklas on/off) or sheet edit is not stuck behind the 24h
asset cache.

Methodology in this repo:

- **BEM** for component class names: `.block`, `.block__element`,
  `.block--modifier` (e.g. `.post__title`, `.post--with-toc`,
  `.site-header__inner`). Match existing names; do not invent a second
  convention.
- **SMACSS** for file roles. Put new rules in an existing sheet; do not add
  a sheet without asking. Register any new file in `style.css`.
  - Base: `tokens.css`, `base.css`
  - Layout / chrome: `shell.css`
  - Modules: `cards.css`, `home.css`, `listings.css`, `post.css`,
    `lightbox.css`, `code.css`, `resume.css`, `hacklas.css`
  - State: prefer `:has()`, ARIA, or existing checkbox-hack patterns
    (theme toggle, nav toggle) over stacked `is-*` classes
  - Theme: token overrides in `tokens.css` (`:root` dark;
    `html:has(#theme-toggle:checked)` light)
  - Motion: `motion.css`, gated per DESIGN.md
- **CSS custom properties** for color, type, space, radius, and motion.
  New visual values go in `tokens.css` first; components consume `var(--…)`.
  Spacing in components is those tokens only — no 1px/2px one-offs.
- **Progressive layout.** Trust normal flow. Images keep their aspect
  ratio (`height: auto`). Do not stretch or CSS-crop photos. If a layout
  is wrong, remove CSS until it is a normal document, then add the
  smallest tweak (DESIGN.md, Layout).
- Keep specificity low (single class selectors). No IDs for styling. No
  `!important`.

Current sheets: tokens, base, shell, cards, motion, home, listings, post,
lightbox, code, resume, hacklas.

## Agent / SEO wiring

- `base.njk`: canonical, per-page `metaDescription`, Open Graph / Twitter,
  `rel="describedby"` → `/llms.txt`, RSS alternate, JSON-LD via `jsonLdGraph`
- Home / resume: `ProfilePage`; listings: `CollectionPage` + `ItemList`;
  blog posts: `BlogPosting`; write-ups: `TechArticle`
- GitHub and LinkedIn: `rel="me"`
- `SITE_URL=https://jbongars.github.io/` in deploy so those URLs are absolute
  at the origin root (not the old `/julienbongars.com/` project path)

## Build & deploy

- Local: `yarn serve` → http://localhost:8080 (unminified JS)
- Production: `yarn build` → `_site/` (minified JS)
- Audit: `yarn audit` (`--level high`), also run in CI before build
- Deploy: Actions on `main` publishes `_site/` to Pages. No gh-pages branch.

## Comments

Giscus is **on** (`src/_data/comments.json` `"enabled": true`). The mount
lives on blog posts, write-ups, and Hacklas notes. The comments module injects the
widget; the heading and noscript note remain with JS disabled. CSP must keep
the giscus.app exceptions or the widget breaks.

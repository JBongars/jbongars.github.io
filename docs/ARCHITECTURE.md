# ARCHITECTURE.md

## Stack

- Static site generator: Eleventy (11ty) v3.x, Nunjucks templates
- Styling: hand-written CSS modules under `src/css/`, concatenated at build
  into `/css/style.css` (`src/css/bundle.11ty.js`). No preprocessor, no
  framework.
- Client JS is progressive enhancement (site works without it). `theme-init.js`
  is inlined after the theme checkbox (CSP sha256). Other scripts are deferred
  and only included on pages that need them. See the README.
- Hosting: user GitHub Pages at `https://jbongars.github.io/`, deployed via
  GitHub Actions on push to `main` (Node 20 to build; checkout/setup-node/
  Pages actions on the Node 24 runner runtime).
- Security: CSP + Referrer-Policy as `<meta>` (Pages cannot set custom HTTP
  headers, including Cache-Control). The Eleventy dev server sends the full
  header set from `src/_data/security.js`, and caches CSS/JS/images for 24h.
  Giscus is allowed at `https://giscus.app` / `https://giscus.app/en/widget`.
  `style-src` includes `'unsafe-inline'` because post banners emit a small
  `<style>` block.
- CI: `npm ci`, `npm audit --audit-level=high`, then `npm run build`.

## File structure

    /
    ├── .eleventy.js              # orchestrator: plugins, copies, filters, collections
    ├── _11ty/                    # build helpers (not site content)
    │   ├── paths.js              # SITE_URL / pathPrefix / absoluteHref
    │   ├── text.js               # XML/HTML escape, RSS summaries
    │   ├── content.js            # banners, Hacklas notes, media passthrough
    │   ├── markdown.js           # Prism, TOC, markdown-it rules
    │   ├── jsonld.js             # Schema.org graphs + meta descriptions
    │   └── computed.js           # eleventyComputed (layout, date, banner, …)
    ├── package.json
    ├── src/
    │   ├── _includes/
    │   │   ├── base.njk          # shell: head, nav, footer, JSON-LD, skip link
    │   │   ├── post.njk          # blog / write-up layout
    │   │   ├── note.njk          # Hacklas note layout
    │   │   ├── comments.njk      # Giscus mount (noscript fallback)
    │   │   ├── hacklas-disclaimer.njk
    │   │   └── skill-tag.njk
    │   ├── _data/
    │   │   ├── resume.json       # experience — single source of truth
    │   │   ├── resume.pdf        # copied to /resume.pdf
    │   │   ├── features.json     # { "hacklas": false }
    │   │   ├── comments.json     # Giscus repo / ids / themes
    │   │   ├── security.js       # CSP + HTTP headers
    │   │   └── skillDictionary.json
    │   ├── css/                  # style.css is the @import manifest; bundle.11ty.js
    │   │                         # concatenates it to /css/style.css
    │   ├── js/                   # deferred enhancement (see README)
    │   ├── blog/                 # listing + one folder per post
    │   ├── write-ups/            # listing + one folder per write-up
    │   ├── hacklas.njk           # fuzzy-find index (ignored when flag is off)
    │   ├── 404.njk
    │   ├── robots.njk            # → /robots.txt
    │   ├── sitemap.njk           # → /sitemap.xml
    │   ├── llms.njk              # → /llms.txt
    │   ├── feed.njk              # → /feed.xml
    │   ├── resume-json.11ty.js   # → /resume.json (JSON Resume)
    │   ├── index.njk
    │   └── resume.njk
    └── .github/workflows/
        └── deploy.yml

`_11ty/` is the only extra top-level folder besides docs and GitHub config.
Do not add a `components/` directory or other app-style trees — keep `src/`
flat.

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
(`_11ty/content.js`).

## Markdown pipeline

Implemented in `_11ty/markdown.js` (wired from `.eleventy.js`):

- Prism highlighting at **build** time (`@11ty/eleventy-plugin-syntaxhighlight`
  + a custom fence highlighter with language aliases)
- Heading IDs + TOC (`toc` filter); posts demote `#` so the layout title is
  the only h1
- GitHub-style task lists
- Relative `*.md` links rewritten for pretty URLs
- Hacklas: strip Author/Date/Path chrome; long `####` lines become bold
  paragraphs

Do not use a client-side highlighter.

## Images

`@11ty/eleventy-img` transform plugin: AVIF/WebP, widths 400/800/1200,
`transformOnRequest: false` so `--serve` uses the same hashed files as
production. `eleventy:ignore` on icons and the footer signature.

## CSS modules

`src/css/style.css` lists `@import`s; `bundle.11ty.js` inlines them in that
order into `/css/style.css`. Current sheets: tokens, base, shell, cards,
motion, home, listings, post, lightbox, code, resume, hacklas.

## Agent / SEO wiring

- `base.njk`: canonical, per-page `metaDescription`, Open Graph / Twitter,
  `rel="describedby"` → `/llms.txt`, RSS alternate, JSON-LD via `jsonLdGraph`
- Home / resume: `ProfilePage`; listings: `CollectionPage` + `ItemList`;
  blog posts: `BlogPosting`; write-ups: `TechArticle`
- GitHub and LinkedIn: `rel="me"`
- `SITE_URL=https://jbongars.github.io/` in deploy so those URLs are absolute
  at the origin root (not the old `/julienbongars.com/` project path)

## Build & deploy

- Local: `npm run serve` → http://localhost:8080
- Build: `npm run build` → `_site/`
- Audit: `npm run audit` (`--audit-level=high`), also run in CI before build
- Deploy: Actions on `main` publishes `_site/` to Pages. No gh-pages branch.

## Comments

Giscus is **on** (`src/_data/comments.json` `"enabled": true`). The mount
lives on blog posts, write-ups, and Hacklas notes. `comments.js` injects the
widget; the heading and noscript note remain with JS disabled. CSP must keep
the giscus.app exceptions or the widget breaks.

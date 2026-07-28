# ARCHITECTURE.md

## Stack

- Static site generator: Eleventy (11ty), latest v3.x
- Templating: Nunjucks (.njk)
- Styling: one hand-written CSS file, no preprocessor, no framework
- No client-side JS in the critical path. Any JS added later must be
  progressive enhancement only (site works fully without it).
- Hosting: GitHub Pages, deployed via GitHub Actions on push to `main`.

## File structure

    /
    ├── .eleventy.js
    ├── package.json
    ├── src/
    │   ├── _includes/
    │   │   ├── base.njk         # shared shell: <head>, nav, footer
    │   │   └── post.njk         # blog/project post layout
    │   ├── _data/
    │   │   └── resume.json      # experience data — single source of truth
    │   ├── css/
    │   │   └── style.css
    │   ├── blog/                 # listing + one folder per blog post
    │   ├── write-ups/            # listing + one folder per write-up
    │   ├── index.njk
    │   └── resume.njk
    └── .github/workflows/
        └── deploy.yml

Do not introduce additional top-level folders or a `components/` directory —
this project is small enough that flat structure is a feature, not a
limitation.

## Content model

Blog post front matter:

    ---
    title: string
    date: YYYY-MM-DD
    tags: [blog, ...]        # additional tags optional, e.g. platform/category
    ---

Write-up front matter:

    ---
    title: string
    date: YYYY-MM-DD
    tags: [write-ups, ...]
    image: /img/writeup-slug/cover.jpg   # optional
    ---

Resume data (`_data/resume.json`): array of role objects — company, title,
dates, bullets (array of strings), tools (array of strings) — plus a
top-level `linkedin` field for the profile URL.

## Blog post structure (revised)

Each post is a directory, not a single file, so images live next to their
markdown instead of in a shared media folder:

    src/blog/
    └── linkvortex/
        ├── index.md
        └── images/
            ├── ghost-admin.png
            └── source-diff.png

Front matter for HTB-style writeups:

    ---
    title: "LinkVortex"
    date: 2026-02-04
    machine: "LinkVortex"
    machine_url: "https://app.hackthebox.com/machines/LinkVortex"
    difficulty: easy
    os: linux
    track: oscp
    tags: [blog, htb, symlinks, ghost-cms, toctou]
    ---

Reference post-local images with relative paths: `![](images/ghost-admin.png)`.
Eleventy passthrough-copies each post's images/ folder alongside its
generated HTML automatically if configured with a glob passthrough on
`src/blog/**/images/` (and the same pattern under `src/write-ups/`).

## Code syntax highlighting

Use `@11ty/eleventy-plugin-syntaxhighlight` (PrismJS under the hood, running
at BUILD time, not in the browser). Output is static HTML with span classes
and a small CSS file for token colors — zero client JS, fully consistent
with the no-JS-required requirement. Do not use a client-side highlighter
(highlight.js loaded in-browser, etc).

## Build & deploy

- Local dev: `npx @11ty/eleventy --serve`
- Production build: `npx @11ty/eleventy` → outputs to `_site/`
- Deploy: GitHub Actions builds on every push to `main` and publishes `_site/`
  to GitHub Pages (see deploy.yml). No manual deploy step, no gh-pages branch.

## Images

Use the `@11ty/eleventy-img` plugin at build time to generate responsive
AVIF/WebP variants. Never hand-export multiple image sizes manually.

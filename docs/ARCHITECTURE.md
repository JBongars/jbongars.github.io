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
    │   │   └── post.njk         # blog / write-up layout
    │   ├── _data/
    │   │   └── resume.json      # experience data — single source of truth
    │   ├── css/
    │   │   └── style.css
    │   ├── blog/                 # listing + one folder per blog post
    │   ├── write-ups/            # listing + one folder per write-up
    │   ├── 404.njk
    │   ├── robots.njk            # → /robots.txt (includes Sitemap)
    │   ├── sitemap.njk           # → /sitemap.xml
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
    date: YYYY-MM
    tags: [blog, ...]
    banner_path: ../backgrounds/example.jpg   # optional, relative or site-absolute
    banner_style:                             # optional CSS map (dark)
      filter: saturate(0.5) brightness(0.6);
    banner_style_light:                       # optional CSS map (light toggle)
      filter: saturate(0.5) brightness(1.5);
    disable_tree: true                        # optional; hides the heading TOC
    ---

Write-up front matter:

    ---
    title: string
    date: YYYY-MM
    tags: [write-ups, ...]
    banner_path: ../hackthebox.png            # optional shared or per-post image
    link: "[label](https://example.com)"      # optional external machine link
    ---

Resume data (`_data/resume.json`): identity fields (`name`, `title`, `location`,
`linkedin`, `github`) plus `skills`, `education`, `certificates`, and
`experience` (company, title, dates, bullets, tools).

## Blog post structure (revised)

Each post is a directory, not a single file, so images live next to their
markdown instead of in a shared media folder:

    src/blog/
    └── some-post/
        ├── index.md
        └── .media/
            └── screenshot.png

Reference post-local images with relative paths: `![](.media/screenshot.png)`.
Eleventy passthrough-copies each entry's `.media/` folder (dotfolders are
mapped explicitly in `.eleventy.js`).

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
  to GitHub Pages (see deploy.yml). `SITE_URL` is set in the workflow so
  canonical tags, Open Graph URLs, `robots.txt`, and `sitemap.xml` are absolute.
  No manual deploy step, no gh-pages branch.

## Images

Use the `@11ty/eleventy-img` plugin at build time to generate responsive
AVIF/WebP variants. Never hand-export multiple image sizes manually.

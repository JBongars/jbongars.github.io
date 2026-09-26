# TOOLS_SPEC.md

Instructions for adding a self-hosted tool to the site as an embedded
(iframe) page. CyberChef (`/tools/cyberchef/`) is the reference
implementation. Read this whole file before adding another tool.

**Conflict rule:** the user-facing rules in [SPEC.md](SPEC.md),
[DESIGN.md](DESIGN.md), and [CSS_ARCHITECTURE.md](CSS_ARCHITECTURE.md)
always apply. This file only adds the tool-embed specifics on top.

---

## What a tool is

A **tool** is a web app the author runs elsewhere on their own GitHub
Pages and embeds on the site under `/tools/<name>/`. The site page is a
thin frame around the app: the tool is the page.

- CyberChef: `https://jbongars.github.io/cyberchef/` → embedded at
  `/tools/cyberchef/`.
- Hacklas is different: it is content (markdown notes), not an embed. It
  shares the full-bleed page treatment but not the iframe rules.

## Tool target requirements (check before embedding)

The embedded app **MUST**:

- be a deployment the author controls (their own repo on GitHub Pages),
  never a third-party origin;
- send no `X-Frame-Options` and no CSP `frame-ancestors` that blocks
  framing — verify with `curl -sI` on the exact embed URL before wiring
  anything (GitHub Pages sets neither by default);
- be reachable at a canonical URL **with a trailing slash**
  (`.../cyberchef/`, not `.../cyberchef`). Pages 301-redirects the bare
  path; pointing the iframe at the canonical URL avoids the redirect hop
  and keeps the CSP path match exact.

---

## 1. The tool page

One Nunjucks file per tool under `src/tools/`:

```
src/tools/cyberchef.njk
```

Front matter is exactly:

```yaml
---
layout: base.njk
title: CyberChef
permalink: /tools/cyberchef/
description: "CyberChef — the Cyber Swiss Army Knife: encode, decode, and analyze data without leaving the site."
---
```

- `permalink:` MUST be `/tools/<name>/` (trailing slash) so canonical,
  Open Graph, nav highlighting (`"/tools/" in page.url`), and sitemap
  all line up.
- `description:` is required — it feeds the meta description and the
  JSON-LD; the page has no visible text of its own.

Body — the whole template:

```njk
<h1 class="visually-hidden">CyberChef</h1>
<iframe
  class="tool-embed"
  src="https://jbongars.github.io/cyberchef/"
  title="CyberChef"
  loading="lazy"
></iframe>
```

Rules:

- **No visible title or lede.** The tool is the page. Keep ONE h1,
  visually hidden (`visually-hidden` is an existing base utility), so
  the "exactly one h1 per page" invariant holds for screen readers,
  agents, and the future site-wide tests. Do not add a second heading.
- The iframe MUST have a `title` attribute (the frame's accessible
  name). It MUST carry `loading="lazy"` (the frame is the only content;
  lazy matches every other card/media image on the site).
- The iframe `src` is the absolute canonical URL from §Tool target.
  Do not make it relative and do not route it through `| url` — the app
  is a separate deployment, not a site path.
- No `sandbox` attribute: the app is first-party and breaks under a
  sandbox (scripts, workers, storage). CSP governs the frame instead.
- No visible fallback copy, no inline styles, no `target="_blank"`
  link to the app inside the page (the Tools card and the iframe
  itself cover navigation).
- The page MUST work with JavaScript disabled — a plain iframe does.
  Do not add a client module for a static embed.

## 2. Full-bleed layout (CSS)

The tool-embed page sheds the article chrome with a `:has()` state
(the same pattern `shell.css` uses for `.not-found`). Current rules:

`src/css/listings.css`:

```css
body:has(.tool-embed) main {
  flex: 0 0 auto;
  max-width: none;
  gap: 0;
  padding-block: 0;
  padding-inline: 0;
}

.tool-embed {
  display: block;
  width: 100%;
  flex: 1 1 auto;
  height: calc(100dvh - var(--site-header-height));
  max-height: calc(100dvh - var(--site-header-height));
  border: 0;
  border-radius: 0;
  background: var(--surface);
}
```

- `.tool-embed` is the shared class for full-bleed iframe tools. Reuse
  it for the next iframe tool; do not invent a per-tool class.
- Spacing, radius, and borders come from `tokens.css` only. No new
  sheet — put rules in an existing sheet (module role: `listings.css`).
- Hacklas is the one exception with a small margin:

  ```css
  body:has(.hacklas-page) main {
    max-width: none;
    padding-inline: var(--space-4);
  }
  ```

  A future tool does not get this margin automatically. If a tool
  genuinely needs one, add its own `body:has(...)` state in an existing
  sheet — do not loosen `.tool-embed` for everyone.

## 3. Tools listing card

`src/tools/index.njk` is the listing. Every tool gets a card there,
inside the `<ul class="card-grid post-list" data-sortable-list>`.

```njk
<li data-title="CyberChef" data-tags="{{ cyberchefTags | join(',') }}">
  <a class="card card--with-media" href="{{ '/tools/cyberchef/' | url }}">
    <div class="card__media">
      <img src="{{ '/img/cake_background.jpg' | url }}" alt="" width="1920" height="1183" loading="lazy" decoding="async" sizes="(max-width: 48rem) 100vw, 22rem">
    </div>
    <h2 class="card__title">CyberChef</h2>
    <dl class="card__facts card__facts--stack">
      <div class="card__fact">
        <dt>About</dt>
        <dd>The Cyber Swiss Army Knife — encoding, decoding, and data analysis</dd>
      </div>
      <div class="card__fact card__fact--tags">
        <dt>Tags</dt>
        <dd>…<span class="tag">…</span>…</dd>
      </div>
    </dl>
  </a>
</li>
```

- `data-title` and `data-tags` on the `<li>` are the booru-search
  contract — required for sorting/filtering on the listing.
- Card images live in `src/img/` (passthrough-copied). Give the `<img>`
  the file's real intrinsic `width`/`height`; `eleventy-img` transforms
  and hashes it at build time like every other card image.
- No image asset? Use the empty fallback
  (`<div class="card__media card__media--fallback"></div>`). Do not
  invent a placeholder asset or fetch one from the web.
- Tags are plain text in one muted style — no colors, no emoji.

## 4. Machine-readable surfaces

Adding a tool page is a real page: wire all three surfaces.

1. **Sitemap** (`src/sitemap.njk`):

   ```njk
   <url><loc>{{ "/tools/<name>/" | absoluteUrl }}</loc><lastmod>{{ buildDate.toISOString().slice(0, 10) }}</lastmod></url>
   ```

2. **llms.txt** (`src/llms.njk`, `## Tools` section) — one row, plain
   description, linking the site page (not the app URL).

3. **JSON-LD** (`_11ty/jsonld.ts`, `toolsIndexItems()`) — add the tool
   item so the `/tools/` `CollectionPage` `ItemList` matches what the
   listing shows:

   ```ts
   { url: "/tools/cyberchef/", data: { title: "CyberChef" }, fileSlug: "cyberchef" }
   ```

   Keep the ItemList order identical to the card order on the page.

## 5. CSP

`_11ty/security.ts` `buildContentSecurityPolicy()` — every embed origin
MUST appear in `frame-src`, or the browser blocks the frame (CSP
violations surface as console errors, which the smoke suite treats as
failures):

```ts
"frame-src https://giscus.app/en/widget https://jbongars.github.io/cyberchef/",
```

- Path matching in CSP is prefix-based and requires a trailing slash in
  the source — keep the source and the iframe `src` consistent
  (`…/cyberchef/` both places).
- Only `frame-src` changes. The frame's own scripts, workers, and fetch
  requests are governed by the embedded page's policy, not ours — no
  `connect-src`/`script-src` edits for the tool.

## 6. Tests

`yarn run check` must pass (format:check, lint, typecheck, test:ci).

- **CSP:** pin the frame source in `tests/unit/security.test.js`
  (assert the full `frame-src` list).
- **JSON-LD:** update the `toolsIndexItems` expectations in
  `tests/unit/jsonld.test.js` (the tools ItemList lists every tool).
- No new client module → no new client tests. The enhance project builds
  the whole site, so the page template must compile and build cleanly.
- Visual snapshots are deferred (`BUILD_TEST_REFACTOR.md`); confirm by
  eye on `yarn serve` in both themes.

## Anti-patterns

- **Embedding a third-party tool** (gitea.com/gchq/CyberChef online, any
  public SaaS). Own deployments only.
- **Visible page chrome** on a tool page — h1, ledes, breadcrumb text.
  The hidden h1 is the only heading.
- **A per-tool CSS sheet or one-off values.** Shared `.tool-embed` class
  plus token spacing; margins are per-tool `:has()` states.
- **`sandbox` on the iframe.** Breaks a first-party app; CSP is the
  control.
- **Bare-path embed URLs** (`…/cyberchef` without `/`). Redirect hops
  and a CSP source that no longer matches.
- **Client JS for the embed.** No module, no data-* hooks, no
  `window`/`globalThis` access. If a tool later needs enhancement, it
  follows `SPEC_BUILD_TS.md` §5.2 (feature folder, `init`/teardown,
  hooks, tests) like any other module.
- **Forgetting a surface.** A tool page missing from the sitemap,
  llms.txt, or the JSON-LD ItemList is an incomplete change — the
  surfaces are the contract for agents.

## Definition of done

A new tool is complete when:

- `/tools/<name>/` builds, has exactly one h1, the iframe with `title`,
  and the canonical URL with trailing slash;
- the app origin is in `frame-src` (with a pinned test) and the embed
  actually loads (no blocking headers on the target);
- the tools card (image + facts + tags) is on `/tools/` and the booru
  sort/filter see it via `data-title`/`data-tags`;
- sitemap, llms.txt, and the JSON-LD ItemList all list the page;
- the page is fully usable with JavaScript disabled, in both themes;
- `yarn run check` passes with coverage floors intact.

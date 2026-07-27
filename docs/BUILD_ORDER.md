# BUILD_ORDER.md

Work through these phases one at a time. Start a new Cursor session (or at
least a fresh Plan) per phase — don't try to do all of this in one prompt.

1. Scaffold Eleventy project, base.njk shell (nav, footer, dark theme applied
   globally), empty homepage.
2. Build out style.css: color variables, typography, layout grid, card
   component, per DESIGN.md.
3. Wire up posts/ collection, blog listing page, single post layout.
4. Wire up projects/ collection, listing page, single project layout.
5. Wire up resume.json + resume.njk rendering.
6. Add CSS-only animation pass (fade-ins, hover states, link underline).
7. Add eleventy-img for responsive images.
8. Add GitHub Actions deploy workflow, verify live deploy.
9. Full pass: Lighthouse audit + JS-disabled manual test on every page.

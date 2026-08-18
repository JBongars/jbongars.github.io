# BUILD_ORDER.md

Original scaffold sequence. **This work is done.** Do not start a new site
from these steps. Current product rules: `SPEC.md`, `ARCHITECTURE.md`,
`DESIGN.md`.

| Phase | Original plan | What shipped |
|---|---|---|
| 1 | Eleventy scaffold, `base.njk`, dark theme, empty home | Done |
| 2 | `style.css` tokens, type, layout, cards | Done — CSS is split modules bundled to `/css/style.css` |
| 3 | Blog collection, listing, post layout | Done (`src/blog/`) |
| 4 | `projects/` collection | **Not built.** Write-ups (`src/write-ups/`) took this slot |
| 5 | `resume.json` + resume page | Done, plus PDF download and `/resume.json` |
| 6 | CSS-only motion | Done (`motion.css`, `prefers-reduced-motion`) |
| 7 | `eleventy-img` | Done (`transformOnRequest: false`) |
| 8 | GitHub Actions → Pages | Done; origin is `https://jbongars.github.io/` |
| 9 | Lighthouse + no-JS pass | Ongoing each change; no-JS is a hard rule |

Later, not in the original list: theme persistence, Giscus, Hacklas (flagged
off), CSP, `llms.txt` / RSS / JSON-LD, `_11ty/` config split.

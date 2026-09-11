# Build, test, and TypeScript refactor

This is the ordered playbook for converting the site’s JavaScript to TypeScript, bundling client modules with Rollup, adding Prettier/ESLint/`tsc`, and adding Jest unit and site/enhancement tests.

It is a **testing and refactor program only**. Pages, CSS, content, and user-visible behavior stay the same. Client JavaScript remains progressive enhancement: every page must stay readable and navigable with JavaScript disabled.

## Source of truth

| Document                             | Owns                                                         |
| ------------------------------------ | ------------------------------------------------------------ |
| This file                            | Order, scope, stop-and-check cadence, and allowed deviations |
| [SPEC_BUILD_TS.md](SPEC_BUILD_TS.md) | How TypeScript and Rollup work                               |
| [SPEC_LINTING.md](SPEC_LINTING.md)   | How Prettier, ESLint, and `tsc` work                         |
| [SPEC_TEST_TS.md](SPEC_TEST_TS.md)   | How Jest tests work                                          |

If this playbook and a spec disagree on **order or scope**, follow this playbook and keep the deviation listed below. If they disagree on **rules** (lint, types, module contract, coverage floor at the end of the program), follow the spec. Do not loosen spec rules to make a stop pass.

[SPEC_TEST_SNAPSHOT.md](SPEC_TEST_SNAPSHOT.md) (Playwright visual and smoke tests) is **out of this program**.

Package manager is **Yarn classic** (`yarn.lock`). Use it for every install and script (`yarn install`, `yarn build`, not npm).

## Stop and check

The goal is **less tech debt**, not a green coverage number. Tests exist to lock current behavior so refactors cannot silently break the site. If a test would need a hack to pass, stop and ask.

Stay on **JavaScript** until the JS is lint-clean and the integration suite is green. TypeScript comes after that and should be types on working JS, not a rewrite.

Do **one stop**, then pause for a human to review. Do not start the next stop unless asked. Do not commit unless asked.

After every stop the site must still build and work with JavaScript disabled. Prefer the smallest change that preserves behavior. If anything is unclear, stop and ask.

## Ground rules

- Characterization tests before converting a file. Refactor commits do not edit assertions.
- Additive markup only (`data-theme-toggle`, `data-code-block`, `data-lightbox`, and similar). Do not rename BEM classes or remove `#theme-toggle`.
- Replace `innerHTML` / `insertAdjacentHTML` / `outerHTML` with the DOM API or `DOMParser`. Soft navigation already uses `DOMParser` for page swaps. No behavior change.
- No `eslint-disable` comments, `@ts-ignore`, `@ts-expect-error` (except as the lint spec allows in tests), `@ts-nocheck`, `any`, or type assertions to silence errors.
- Do not loosen, disable, or remove spec rules. Deviations are order and scope only, listed in this file.
- Prefer the smallest change that preserves behavior.

## What this program changes

In scope: build JS (`_11ty/`, Eleventy config, `.11ty.js` templates), client JS (`src/js/`), tooling (Node pin, Prettier, ESLint, tsconfigs, Jest), CI check job, and docs/rules needed to permit the work.

Also touched without changing how pages look:

- `package.json`, lockfile, `.nvmrc`, ESLint/Prettier/Jest/tsconfig files, `AGENTS.md`
- Existing deploy workflow (Node version, `check` job, `pull_request`)
- Templates: script tags and extra `data-*` attributes next to existing ids/classes
- Prettier may reformat JSON, CSS, YAML, and `docs/**/*.md` in a format-only commit

Not in scope: new UI, CSS design, content markdown, extra bundlers, client npm libraries, Playwright, creating CI from scratch.

## Conflicts with the generic lint prompt

A pasted linting prompt asked for `eslint-plugin-sonarjs`, `eslint.config.mjs`, and a generic `check` / `lint:fix` setup. This repo follows [SPEC_LINTING.md](SPEC_LINTING.md) instead:

- No `eslint-plugin-sonarjs`
- Config file is `eslint.config.js`, not `eslint.config.mjs`
- End-state `check` is `format:check` + `lint` + `typecheck` + `test:ci`
- Extra baseline is `eslint-plugin-unicorn` `recommended`, not Airbnb. Official Airbnb configs do not support ESLint 10. Extra Unicorn rules can be turned on individually.

## Allowed deviations (order and scope)

These are intentional. Do not “fix” them by implementing Playwright or turning on coverage at 0%.

1. **Playwright is deferred.** No Docker baselines, no `scripts/` directory, no visual CI job in this program. Phase 8 confirms the site still builds and works with JS disabled instead of “zero visual snapshot diffs.”
2. **Coverage 90% waits until the JS is lint-clean and typed.** Phase 5 `test:ci` has no threshold.
3. **`check` grows.** Phase 4: format + lint + typecheck. Phase 5: add `test:ci` without coverage. Coverage and git hooks come after TypeScript.
4. **JavaScript first.** Integration tests, then unit tests and ESLint on the current `.js`. Rename to `.ts` only after that JS already obeys the lint rules.
5. **Client scripts stay IIFEs in phase 5.** Integration tests execute the real file in a JSDOM window (no production seam). Hacklas client files are out of this stop. Document-injection `init(document)` waits until a module is converted.
6. **Two client entries, not four.** `entries/theme-init.ts` (inline IIFE) and `entries/site.ts` (every module that today loads on every page so soft navigation still works). No `hacklas.ts` or `post.ts` in this program: splitting them would change what ships on home vs posts.
7. **`hacklas-disclaimer-init` stays a classic IIFE file** written to `/js/`, loaded as a blocking `'self'` script, not a second CSP-hashed inline.
8. **`src/_data/security.js` stays a one-line re-export** of `_11ty/security.ts` when that file exists. Eleventy 3.1 does not load `.ts` data files.
9. **`@types/node` is installed** because the root tsconfig sets `"types": ["node"]`.
10. **Yarn classic, not npm.** `yarn.lock` is the lockfile. Translate spec `npm i` / `npm ci` / `npm run` to `yarn add -D` / `yarn install --frozen-lockfile` / `yarn`.
11. **`checkJs` is off** until files are lint-clean JS and then typed. `allowJs` stays on while `.js` and `.ts` mix.
12. **TypeScript is 5.9.x**, not 7. `typescript-eslint` 8 requires `typescript@>=4.8.4 <6.1.0`.
13. **`typecheck` omits `tests/tsconfig.json` while tests are JavaScript.** An empty `include` is `TS18003`.
14. **`yarn run check`, not `yarn check`.** Yarn classic’s `yarn check` verifies the lockfile. The package script is `check`; invoke it with `yarn run check`. CI runs `format:check` / `lint` / `typecheck` / `test:ci` as separate steps.
15. **Jest runs as native ESM while tests are JavaScript.** The package is `"type": "module"`, and jsdom 30’s dependency tree is ESM. Scripts pass `--experimental-vm-modules` and `transform` is empty. `@swc/jest` stays installed for later TypeScript tests.

## Baseline (before phase 1)

- npm, Eleventy 3.1.x, no ESLint, no tsconfig, no tests
- Node **20** in CI; CommonJS (`require` / `module.exports`)
- `src/js` passthrough-copied into `_site/js`
- Client scripts communicate through `window.*` and are loaded as deferred classic scripts
- `theme-init.js` is inlined; CSP hashes the **source** file

## Phases

### Phase 0 — Docs (this stop)

Playbook, spec cross-refs, and permission to add Rollup and `tests/`. No code conversion.

**Done when:** this file exists; specs, `ARCHITECTURE.md`, README, and `.cursor/rules/project.mdc` permit the program; the site is unchanged.

### Phase 1 — Node 24

Pin `"engines": { "node": ">=24" }`, add `.nvmrc` (`24`), point every `setup-node` step at the nvmrc file. Required for native type stripping. No site change.

**Done when:** CI and `package.json` agree on Node >= 24; `yarn build` still works.

### Phase 2 — Prettier

Add Prettier, `.prettierrc.json`, `.prettierignore`, and `.editorconfig` exactly as [SPEC_LINTING.md](SPEC_LINTING.md). One format-only commit; put that commit hash in `.git-blame-ignore-revs`. Do not format `src/**/*.md` or Nunjucks.

**Done when:** `yarn format:check` passes; the only diffs are formatting.

### Phase 3 — CommonJS to ESM

Mechanical `require` → `import`, `module.exports` → `export`, `"type": "module"`. Needed because `"type": "module"` would otherwise break every current `.js` file. No types, no bundler.

**Done when:** `yarn build` and `yarn serve` work as ESM; behavior unchanged.

### Phase 4 — ESLint and tsconfigs

Add `eslint.config.js` from [SPEC_LINTING.md](SPEC_LINTING.md) (Jest/Playwright/Testing Library plugins included even before those files exist). Three tsconfigs with `allowJs`. `checkJs` stays off until conversion (see deviations). Temporary `globalIgnores` labelled `// TODO(ts-migration)` for not-yet-converted `.js`. Create `AGENTS.md` with the spec’s Code quality block.

Scripts: `format`, `format:check`, `lint`, `lint:fix`, `typecheck`. `check` is format + lint + typecheck only.

Add a `check` job on `pull_request` and on `main` in `.github/workflows/deploy.yml`. Do not add a visual job. Do not create a second workflow.

**Done when:** `yarn lint` and `yarn typecheck` pass with the migration ignores in place.

### Phase 5 — Jest + client JS integration

Install Jest (Yarn). Tests are **JavaScript**. Do not walk built HTML, markdown, or CSS, and do not test Hacklas notes or `hacklas-*.js`.

For each remaining client module, load the real classic script into a small JSDOM fixture (not a page from `_site/`). Snapshot the mutated document, then click / type / press keys the way a user would and snapshot again (or assert the side effect when the DOM does not change). Execute the file in the jsdom window; do not rewrite IIFEs.

Do not enable coverage. Pause so a human can click through the real site.

**Done when:** `yarn test:ci` is green; `yarn build` is unchanged; no production JS was rewritten.

### Phase 6 — JS unit tests and ESLint (this stop)

One file (or small cluster) per stop. Write characterization tests through the public API. For client modules, mock `document` (or pass it in with a **minimal** seam) and snapshot the mutated shape. Then make that file obey ESLint by changing the real code, not by disabling rules. Re-run integration tests after each file.

Stay on `.js`. TypeScript is not this phase.

**Done when:** `_11ty/` and `src/js/` are linted without the `TODO(ts-migration)` ignore list; integration tests still pass.

### Phase 7 — TypeScript as types

Rename `.js` → `.ts`, add types, keep behavior. No new features. `.ts` import extensions in build code.

**Done when:** `yarn typecheck` and `yarn test:ci` pass on the typed tree; `yarn build` behavior is unchanged.

### Phase 8 — Rollup, still on current entries

Bundle client JS as today (`site` + inline `theme-init` + classic `hacklas-disclaimer-init`). CSP hash from the **built** theme string. Drop `src/js` passthrough.

**Done when:** `_site/js` comes from Rollup; pages work with JS off.

### Phase 9 — Client module contract

`init` / teardown, `platform` for browser capabilities, no `window.*` assignments, no HTML string sinks. Enhancement tests load built HTML and call real `init`. One module per stop.

**Done when:** no `window.*` assignments remain; enhancement tests pass.

### Phase 10 — Tighten

Remove `allowJs`. Enable 90% coverage. `check` includes `test:ci`. Git hooks. Lighthouse before/after in notes, not a visual redesign.

**Done when:** `yarn run check` is green; coverage threshold holds.

## After this program

Playwright visual and smoke tests ([SPEC_TEST_SNAPSHOT.md](SPEC_TEST_SNAPSHOT.md)) are a separate program. They need `scripts/`, Docker-pinned baselines, and a `visual` CI job. Do not start them from this playbook.

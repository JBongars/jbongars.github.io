# Build, test, and TypeScript refactor

This was the ordered playbook for converting the site’s JavaScript to TypeScript, bundling client modules with Rollup, adding Prettier/ESLint/`tsc`, and adding Jest unit and enhancement tests.

**Status: complete**, except leftover classic IIFE files (`theme-init`, `hacklas-disclaimer-init` and their `entries/` wrappers) and Playwright (a separate program). Coverage floors in [SPEC_TEST_TS.md](SPEC_TEST_TS.md) §4 are live. Do not reopen this program or start Playwright unless asked.

It was a **testing and refactor program only**. Pages, CSS, content, and user-visible behavior stay the same. Client JavaScript remains progressive enhancement: every page must stay readable and navigable with JavaScript disabled.

## Source of truth

| Document                             | Owns                                              |
| ------------------------------------ | ------------------------------------------------- |
| This file                            | Historical order, scope, and remaining deviations |
| [SPEC_BUILD_TS.md](SPEC_BUILD_TS.md) | How TypeScript and Rollup work                    |
| [SPEC_LINTING.md](SPEC_LINTING.md)   | How Prettier, ESLint, and `tsc` work              |
| [SPEC_TEST_TS.md](SPEC_TEST_TS.md)   | How Jest tests work                               |

If this playbook and a spec disagree on **rules** (lint, types, module contract, coverage floors), follow the spec. Do not loosen spec rules to make a change pass.

[SPEC_TEST_SNAPSHOT.md](SPEC_TEST_SNAPSHOT.md) (Playwright visual and smoke tests) is **out of this program**.

Package manager is **Yarn classic** (`yarn.lock`). Use it for every install and script (`yarn install`, `yarn build`, not npm).

## What landed

- Node 24, ESM, Prettier, ESLint (including Unicorn), three tsconfigs, `yarn run check`
- Client modules are TypeScript with `init` / teardown, one folder per feature (`src/js/<name>/index.ts`, `types.ts`, `index.test.ts`; Hacklas under `src/js/hacklas/`)
- Rollup from `_11ty/bundle.ts`: `site` module, inlined `theme-init` IIFE, classic `hacklas-disclaimer-init` file
- Jest projects `node`, `client`, and `enhance`. `yarn test:ci` enforces **90% global** and **80% per collected file**
- Characterization tests through the public API; no `jest.mock` of in-repo modules. Unreachable branches are deleted rather than covered with hacks

## Remaining deviations

These are intentional. Do not “finish” them from this playbook.

1. **Playwright is deferred.** No Docker baselines, no `scripts/` directory, no visual CI job. Confirm the site still builds and works with JS disabled instead of “zero visual snapshot diffs.”
2. **`theme-init` and `hacklas-disclaimer-init` stay classic IIFEs.** Source lives next to the feature (`src/js/theme-init.js`, `src/js/hacklas/hacklas-disclaimer-init.js`); `src/js/entries/` only re-exports them. They are loaded as blocking `'self'` / inline scripts, not extra CSP-hashed module entries.
3. **`src/_data/security.js` stays a one-line re-export** of `_11ty/security.ts`. Eleventy 3.1 does not load `.ts` data files.
4. **`allowJs` stays on** while those leftover `.js` files exist. `checkJs` stays off.
5. **Yarn classic, not npm.** Translate spec `npm i` / `npm ci` / `npm run` to `yarn add -D` / `yarn install --frozen-lockfile` / `yarn`.
6. **TypeScript is 5.9.x**, not 7. `typescript-eslint` 8 requires `typescript@>=4.8.4 <6.1.0`.
7. **`yarn run check`, not `yarn check`.** Yarn classic’s `yarn check` verifies the lockfile. CI runs `format:check` / `lint` / `typecheck` / `test:ci` as separate steps.
8. **Git hooks** (`simple-git-hooks` / lint-staged in [SPEC_LINTING.md](SPEC_LINTING.md) §6) are not installed. CI is the gate.
9. **Two client entries, not four.** No `hacklas.ts` or `post.ts` page-group entries.
10. **Build unit tests remain JavaScript** in `tests/unit/*.test.js`. Client tests are TypeScript.

## Ground rules that still apply

- Additive markup only (`data-theme-toggle`, `data-code-block`, `data-lightbox`, and similar). Do not rename BEM classes or remove `#theme-toggle`.
- No `eslint-disable` comments, `@ts-ignore`, `@ts-expect-error` (except as the lint spec allows in tests), `@ts-nocheck`, `any`, or type assertions to silence errors.
- Do not loosen, disable, or remove spec rules.
- Prefer the smallest change that preserves behavior. After any change the site must still build and work with JavaScript disabled.
- If a test would need a hack to pass, stop and ask — or delete the unused branch.

## Completed phases (historical)

0. Docs and permission to add Rollup and `tests/`
1. Node 24 (`.nvmrc`, `engines`)
2. Prettier
3. CommonJS to ESM
4. ESLint and tsconfigs
5. Jest (JavaScript, no coverage)
6. Unit tests and lint-clean JS
7. TypeScript as types
8. Rollup on current entries
9. Client `init` / teardown / `platform`
10. Coverage floors (`yarn test:ci`)

Baseline before phase 1 was npm, Eleventy 3.1.x, Node 20, no ESLint, passthrough `src/js`, `window.*` classic scripts, CSP hashing the theme-init **source** file.

This repo follows [SPEC_LINTING.md](SPEC_LINTING.md): no `eslint-plugin-sonarjs`, config file is `eslint.config.js`, extra baseline is Unicorn `recommended` (not Airbnb).

## After this program

Playwright visual and smoke tests ([SPEC_TEST_SNAPSHOT.md](SPEC_TEST_SNAPSHOT.md)) are a separate program. They need `scripts/`, Docker-pinned baselines, and a `visual` CI job. Do not start them from this playbook.

# Agent instructions

## Code quality

Prettier owns formatting. ESLint owns correctness and architecture. `tsc` owns types. Do not mix those jobs.

Until tests land more coverage, `yarn run check` is `yarn format:check && yarn lint && yarn typecheck && yarn test:ci`. Yarn classic already has a built-in `yarn check` (lockfile integrity); use `yarn run check` for this script.

- Do not add `eslint-disable` comments without a specific rule name and a description after `--`.
- Do not add `@ts-ignore`, `@ts-nocheck`, or `any`. `@ts-expect-error` is allowed only in tests, with a description.
- Do not use type assertions to silence errors.
- Do not loosen, disable, or remove rules from `docs/SPEC_LINTING.md`.
- Do not add `globalIgnores` or `.prettierignore` entries for handwritten source without reviewer approval. The `TODO(ts-migration)` list in `eslint.config.js` is temporary; remove each path in the same change that converts that file.
- Stay on JavaScript until it is lint-clean. TypeScript should be types on working JS, not a rewrite.
- Client code currently uses classic IIFEs. Do not add `window` / `globalThis` assignments or HTML string sinks when touching it. A `document` injection seam is allowed later if it is the smallest way to test mutations.
- Follow `docs/BUILD_TEST_REFACTOR.md`: one stop per session, then pause for review. If a test would need a hack, stop and ask.

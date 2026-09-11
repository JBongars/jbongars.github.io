# Agent instructions

## Code quality

Prettier owns formatting. ESLint owns correctness and architecture. `tsc` owns types. Do not mix those jobs.

`yarn run check` is `yarn format:check && yarn lint && yarn typecheck && yarn test:ci`. `test:ci` enforces the coverage floors in `docs/SPEC_TEST_TS.md` §4 (90% global, 80% per collected file). Yarn classic already has a built-in `yarn check` (lockfile integrity); use `yarn run check` for this script.

- Do not add `eslint-disable` comments without a specific rule name and a description after `--`.
- Do not add `@ts-ignore`, `@ts-nocheck`, or `any`. `@ts-expect-error` is allowed only in tests, with a description.
- Do not use type assertions to silence errors.
- Do not loosen, disable, or remove rules from `docs/SPEC_LINTING.md`.
- Do not add `globalIgnores` or `.prettierignore` entries for handwritten source without reviewer approval.
- Client feature modules are TypeScript with `init` / teardown. Do not add `window` / `globalThis` assignments or HTML string sinks. Browser capabilities go through `src/js/platform` and injected `deps`.
- `theme-init` and `hacklas-disclaimer-init` stay classic IIFEs. Do not convert them unless asked.
- Do not `jest.mock` in-repo modules. Characterization tests go through the public API. Delete unreachable branches instead of covering them with hacks. If a test would need a hack, stop and ask.
- The TypeScript / Rollup / Jest program in `docs/BUILD_TEST_REFACTOR.md` is complete. Do not reopen it or start Playwright unless asked.

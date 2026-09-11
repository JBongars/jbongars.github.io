# SPEC: Linting & Formatting (ESLint + Prettier)

This spec defines static checks for the TypeScript codebase described in `SPEC_BUILD_TS.md`. Three tools each own one job, and their responsibilities do not overlap.

| Tool                            | Owns                                                                                 | Does not do                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Prettier                        | Formatting: whitespace, line breaks, quotes, semicolons, trailing commas             | Any correctness or style-of-code decisions                                  |
| ESLint (with typescript-eslint) | Correctness, unsafe patterns, security rules, architectural boundaries, test hygiene | Formatting (all formatting rules are disabled via `eslint-config-prettier`) |
| `tsc`                           | Type checking for all three tsconfigs                                                | Linting or formatting                                                       |

Everything marked **MUST** is enforced in CI and pre-commit. **SHOULD** means deviations need a stated reason in the PR.

---

## 1. Dependencies

```bash
npm i -D eslint @eslint/js typescript-eslint globals eslint-config-prettier \
  eslint-plugin-unicorn \
  eslint-plugin-jest eslint-plugin-testing-library eslint-plugin-playwright \
  @eslint-community/eslint-plugin-eslint-comments \
  prettier lint-staged simple-git-hooks
```

---

## 2. Prettier

### 2.1 `.prettierrc.json`

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "overrides": [{ "files": "*.md", "options": { "proseWrap": "preserve" } }]
}
```

These values match the existing code style (double quotes, semicolons, two-space indent). The settings are fixed; formatting preferences are not revisited in PR review. If Prettier's output looks wrong, the fix is to restructure the code, not to add `// prettier-ignore`. A `prettier-ignore` comment is permitted only for data laid out deliberately (aligned tables, matrices) and **MUST** be accompanied by a reason.

### 2.2 `.prettierignore`

```
_site/
coverage/
node_modules/
.cache/
playwright-report/
test-results/
package-lock.json
yarn.lock

# Authored content: formatting changes create noise in content diffs
src/**/*.md

# Nunjucks is not supported by Prettier; see .editorconfig
src/**/*.njk

# Generated or binary artifacts
tests/visual/__snapshots__/
src/_data/resume.pdf
```

Content markdown (blog posts, write-ups, Hacklas notes) is excluded because it follows its own specs (`WRITEUP_SPEC.md`, `HACKLAS_SPEC.md`) and Hacklas notes may come from an external notes tree. Documentation in `docs/` is formatted.

### 2.3 `.editorconfig`

Files Prettier cannot format still get consistent whitespace from every editor:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

---

## 3. ESLint

### 3.1 `eslint.config.js`

ESLint uses the flat config format and type-aware linting. `projectService` locates the nearest tsconfig for each file, so client files are linted against `src/js/tsconfig.json`, tests against `tests/tsconfig.json`, and build code against the root `tsconfig.json`. Every `.ts` file in the repo **MUST** be included by exactly one of these tsconfigs (including `playwright.config.ts`, which belongs in the root config's `include`).

```js
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import jest from "eslint-plugin-jest";
import playwright from "eslint-plugin-playwright";
import testingLibrary from "eslint-plugin-testing-library";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const CLIENT_BOUNDARY_MESSAGE =
  "Access browser capabilities through src/js/platform.ts and inject them via deps (SPEC_BUILD_TS.md §5.2).";

export default defineConfig([
  globalIgnores([
    "_site/**",
    "coverage/**",
    "node_modules/**",
    ".cache/**",
    "playwright-report/**",
    "test-results/**",
    "_11ty/__fixtures__/**",
  ]),

  // ---------- Base: all TypeScript ----------
  {
    files: ["**/*.ts"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      comments.recommended,
      unicorn.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      // Correctness
      eqeqeq: ["error", "always"],
      "no-console": "error",
      "no-param-reassign": "error",
      "prefer-const": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          fixStyle: "separate-type-imports",
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",

      // Security
      "no-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",

      // Keep functions small enough to test every branch
      complexity: ["error", 10],
      "max-depth": ["error", 3],
      "max-params": ["error", 3],

      // Node type stripping only supports erasable syntax (SPEC_BUILD_TS.md §2)
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message: "Use an `as const` object and a union type instead of enum.",
        },
        {
          selector: "TSModuleDeclaration[kind!='global']",
          message: "Namespaces are not erasable; use ES modules.",
        },
        {
          selector: "TSParameterProperty",
          message: "Parameter properties are not erasable; declare fields explicitly.",
        },
      ],

      // Every disable comment must say why
      "@eslint-community/eslint-comments/require-description": [
        "error",
        {
          ignore: [],
        },
      ],
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
    },
  },

  // ---------- Build code (Node) ----------
  {
    files: ["eleventy.config.ts", "_11ty/**/*.ts", "src/**/*.11ty.ts", "playwright.config.ts"],
    languageOptions: { globals: globals.node },
  },

  // ---------- Client code (browser), excluding tests ----------
  {
    files: ["src/js/**/*.ts"],
    ignores: ["**/*.test.ts"],
    languageOptions: { globals: globals.browser },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*"],
              message: "Client code cannot import Node built-ins.",
            },
          ],
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "document",
          property: "write",
          message: "Never use document.write.",
        },
        {
          object: "document",
          property: "writeln",
          message: "Never use document.writeln.",
        },
        {
          object: "navigator",
          property: "clipboard",
          message: CLIENT_BOUNDARY_MESSAGE,
        },
        {
          object: "window",
          property: "localStorage",
          message: CLIENT_BOUNDARY_MESSAGE,
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "localStorage", message: CLIENT_BOUNDARY_MESSAGE },
        { name: "sessionStorage", message: CLIENT_BOUNDARY_MESSAGE },
        { name: "fetch", message: CLIENT_BOUNDARY_MESSAGE },
        { name: "matchMedia", message: CLIENT_BOUNDARY_MESSAGE },
        { name: "IntersectionObserver", message: CLIENT_BOUNDARY_MESSAGE },
        { name: "ResizeObserver", message: CLIENT_BOUNDARY_MESSAGE },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message: "Use an `as const` object and a union type instead of enum.",
        },
        {
          selector: "TSModuleDeclaration[kind!='global']",
          message: "Namespaces are not erasable; use ES modules.",
        },
        {
          selector: "TSParameterProperty",
          message: "Parameter properties are not erasable; declare fields explicitly.",
        },
        {
          selector:
            "AssignmentExpression > MemberExpression.left[property.name=/^(innerHTML|outerHTML)$/]",
          message:
            "Build nodes with the DOM API or parse with DOMParser and adopt nodes. No HTML string sinks.",
        },
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: "No HTML string sinks. Use insertAdjacentElement or the DOM API.",
        },
        {
          selector:
            "AssignmentExpression > MemberExpression.left[object.name=/^(window|globalThis|self)$/]",
          message: "No globals. Export functions and import them (SPEC_BUILD_TS.md §5.3).",
        },
      ],
    },
  },

  // platform.ts is the single place allowed to touch browser capability globals
  {
    files: ["src/js/platform.ts"],
    rules: {
      "no-restricted-globals": "off",
      "no-restricted-properties": "off",
    },
  },

  // ---------- Unit and integration tests (Jest) ----------
  {
    files: ["**/*.test.ts"],
    extends: [jest.configs["flat/recommended"], jest.configs["flat/style"]],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      "jest/no-focused-tests": "error",
      "jest/no-disabled-tests": "error",
      "jest/expect-expect": "error",
      "jest/no-conditional-expect": "error",
      "jest/no-conditional-in-test": "error",
      "jest/valid-title": "error",
      "jest/prefer-each": "error",
      "jest/no-restricted-jest-methods": [
        "error",
        {
          mock: "Do not mock in-repo modules. Inject boundaries instead (SPEC_TEST_TS.md §6.3).",
        },
      ],
      "@typescript-eslint/unbound-method": "off",
      "jest/unbound-method": "error",
      "@typescript-eslint/no-non-null-assertion": "off",
      "max-params": "off",
    },
  },
  {
    files: ["src/js/**/*.test.ts", "tests/integration/enhance/**/*.test.ts"],
    extends: [testingLibrary.configs["flat/dom"]],
    rules: {
      "testing-library/prefer-screen-queries": "error",
      "testing-library/prefer-user-event": "error",
      "testing-library/no-node-access": [
        "error",
        {
          allowContainerFirstChild: false,
        },
      ],
    },
  },

  // ---------- Visual tests (Playwright) ----------
  {
    files: ["tests/visual/**/*.ts"],
    extends: [playwright.configs["flat/recommended"]],
    languageOptions: { globals: globals.node },
    rules: {
      "playwright/no-focused-test": "error",
      "playwright/no-skipped-test": "error",
      "playwright/no-wait-for-timeout": "error",
      "playwright/no-networkidle": "error",
      "playwright/prefer-web-first-assertions": "error",
    },
  },

  // ---------- Plain JS config files ----------
  {
    files: ["**/*.js"],
    extends: [
      js.configs.recommended,
      tseslint.configs.disableTypeChecked,
      unicorn.configs.recommended,
    ],
    languageOptions: { globals: globals.node },
  },

  // Must be last: turns off every rule that conflicts with Prettier
  prettier,
]);
```

Flat config applies the last matching `rules` entry for a given rule, so the client block repeats the erasable-syntax selectors alongside its own `no-restricted-syntax` entries rather than losing them.

### 3.2 Rule rationale

The rule set exists to protect the guarantees in the other specs, and every rule traces back to one of them.

The **type-aware strict presets** catch unhandled promises (`no-floating-promises`, `no-misused-promises`), unsafe `any` flow, unnecessary conditions that hide dead branches, and non-exhaustive `switch` statements. Dead branches matter here specifically because they are uncoverable and drag branch coverage below 90%.

**eslint-plugin-unicorn `recommended`** is the extra baseline for modern JavaScript and TypeScript idioms (ESM, current APIs, no leftover CommonJS patterns). It is a first-class ESLint 10 flat-config preset. Official `eslint-config-airbnb` / `airbnb-base` are not used: they do not support ESLint 10, and community shims are out of scope. Extra Unicorn rules can be turned on individually when a concrete antipattern shows up.

The **complexity limits** (cyclomatic complexity 10, nesting depth 3, three parameters) keep functions small enough that every branch can be tested directly. A function that exceeds them is split, or its options are grouped into an object parameter.

The **security rules** match the site's CSP and threat model. The CSP forbids inline scripts other than the hashed theme script, so `eval`, `new Function`, `javascript:` URLs, and HTML string sinks (`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`) are banned in client code. Soft navigation parses fetched HTML with `DOMParser` and adopts the resulting nodes, which does not execute scripts and does not need a string sink.

The **boundary rules** enforce the dependency injection pattern from `SPEC_BUILD_TS.md` §5.2: storage, `fetch`, clipboard, `matchMedia`, and observers are reached only through `src/js/platform.ts` and passed in via `deps`. This is what allows unit tests to control every nondeterministic input without `jest.mock`.

The **architectural rules** block `window` globals and Node built-ins in client code, and block non-erasable TypeScript syntax everywhere, because Node's type stripping cannot run it.

The **test rules** prevent committed focus or skip markers, assertion-free tests, conditional assertions (which silently pass when the condition is false), `jest.mock` of in-repo modules, arbitrary waits in Playwright, and DOM-structure queries in Testing Library tests.

### 3.3 Disable comments

Inline disables are allowed only for a specific rule, and they **MUST** include a description after `--`:

```ts
// eslint-disable-next-line complexity -- mirrors the markdown-it token state machine; split would obscure it
```

Block-level `/* eslint-disable */` without a rule name is an error. Unused disable directives are errors, so stale disables are removed automatically as code changes. File-wide disables and new entries in `globalIgnores` require reviewer approval.

---

## 4. Type checking

`tsc` is the source of truth for types; ESLint's type-aware rules depend on it but do not replace it.

```json
{
  "scripts": {
    "typecheck": "tsc -p tsconfig.json && tsc -p src/js/tsconfig.json --noEmit && tsc -p tests/tsconfig.json"
  }
}
```

`// @ts-ignore` is prohibited. `// @ts-expect-error` is permitted only with a description (enforced by `@typescript-eslint/ban-ts-comment`, included in the strict preset) and only in tests that deliberately pass invalid input to verify runtime guards.

---

## 5. Scripts

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint . --max-warnings=0 --cache --cache-location .cache/eslint/",
    "lint:fix": "eslint . --fix --cache --cache-location .cache/eslint/",
    "typecheck": "tsc -p tsconfig.json && tsc -p src/js/tsconfig.json --noEmit && tsc -p tests/tsconfig.json",
    "check": "yarn format:check && yarn lint && yarn typecheck && yarn test:ci",
    "prepare": "simple-git-hooks"
  }
}
```

`--max-warnings=0` means warnings fail the run. No rule is configured as `"warn"`; a rule is either an error or off.

`.cache/` is gitignored.

---

## 6. Pre-commit hooks

Staged files are formatted and linted before every commit. Type checking and tests are too slow for a pre-commit hook and run in CI instead.

```json
{
  "simple-git-hooks": {
    "pre-commit": "npx lint-staged"
  },
  "lint-staged": {
    "*.ts": ["prettier --write", "eslint --fix --max-warnings=0 --no-warn-ignored"],
    "*.js": ["prettier --write", "eslint --fix --max-warnings=0 --no-warn-ignored"],
    "*.{json,css,yml,yaml}": "prettier --write",
    "docs/**/*.md": "prettier --write"
  }
}
```

Prettier runs before ESLint so ESLint sees final formatting. `--no-warn-ignored` prevents ESLint from warning (and failing under `--max-warnings=0`) when lint-staged passes a file that matches `globalIgnores`. Prettier silently skips files in `.prettierignore` even when passed explicitly.

Hooks are a convenience, not a gate. `git commit --no-verify` bypasses them, so CI runs the same checks and is the actual enforcement.

---

## 7. CI

Static checks run as the first job. Tests, the build, visual tests, and deployment depend on it, so nothing is deployed unless every check passes. Pull requests run the same workflow without the deploy job.

```yaml
check:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v5
    - uses: actions/setup-node@v5
      with:
        node-version-file: .nvmrc
        cache: yarn
    - run: yarn install --frozen-lockfile
    - run: yarn audit --level high
    - run: yarn format:check
    - run: yarn lint
    - run: yarn typecheck
    - run: yarn test:ci
    - if: always()
      uses: actions/upload-artifact@v4
      with:
        name: coverage
        path: coverage/
        retention-days: 14
```

The existing `build` job gains `needs: [check, visual]`, where `visual` is the job defined in `SPEC_TEST_SNAPSHOT.md`.

---

## 8. Adopting on the existing codebase

Introduce the tooling in this order so the first PRs are reviewable. First, add Prettier and run `yarn format` in a single commit containing only formatting changes. Add that commit's hash to `.git-blame-ignore-revs` so `git blame` skips it. Next, add ESLint with the full config. During the JavaScript-to-TypeScript migration (`SPEC_BUILD_TS.md` §8), not-yet-converted `.js` files in `_11ty/` and `src/js/` are listed in a temporary `globalIgnores` block labelled `// TODO(ts-migration)`, and each file is removed from that list in the same PR that converts it. The migration is finished when that block is empty and deleted.

Do not bulk-disable rules to get a green run. If a rule produces many violations in legacy code, the violations are fixed as each file is converted.

---

## 9. Definition of done

A change is complete when `yarn format:check`, `yarn lint`, and `yarn typecheck` pass with zero warnings. No new disable comments exist without a rule name and description, no `@ts-ignore` is present, and no entries were added to `globalIgnores` or `.prettierignore` without reviewer approval. Client code reaches browser capabilities only through `platform.ts` and uses no HTML string sinks or `window` globals.

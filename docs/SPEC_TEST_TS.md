# SPEC: TypeScript Unit & Integration Testing (Jest)

This spec defines how unit and integration tests are written, organized, and enforced. The goal is a suite that makes large refactors safe: if the tests pass, the built site and its enhancements behave the same way they did before. Visual regression is covered in `SPEC_TEST_SNAPSHOT.md`. Code structure (module contract, tsconfigs, Rollup) is defined in `SPEC_BUILD_TS.md`, and this spec relies on it.

Everything marked **MUST** is enforced in review and CI. **SHOULD** means deviations need a stated reason in the PR.

---

## 1. Core principle: test behavior, not implementation

A test protects a refactor only if it survives the refactor. Tests **MUST** interact with code only through its public interface and assert on observable outcomes.

For each kind of code, the public interface is as follows. For build helpers in `_11ty/`, it is exported functions and their return values. For Eleventy filters, shortcodes, and `.11ty.ts` templates, it is output for a given input. For client modules, it is the DOM after `init()` and user interaction, plus effects at boundaries (storage writes, `fetch` calls, `history` changes, messages posted to iframes). For the site as a whole, it is the files in the build output.

The litmus test for every test: _if this module's internals were rewritten from scratch with identical behavior, would the test still pass?_ If not, rewrite the test.

---

## 2. Test layers

| Layer                     | Subject                                                                                  | Environment | Location                                      | Jest project |
| ------------------------- | ---------------------------------------------------------------------------------------- | ----------- | --------------------------------------------- | ------------ |
| Unit (build)              | `_11ty/**` helpers, filters, shortcodes, `.11ty.ts` render functions, the Rollup wrapper | Node        | `tests/unit/*.test.js`                        | `node`       |
| Unit (client)             | `src/js/**` feature modules and helpers                                                  | jsdom       | Colocated `index.test.ts`                     | `client`     |
| Integration (IIFE)        | Leftover classic IIFE files (`theme-init`, `hacklas-disclaimer-init`) executed in JSDOM  | Node        | `tests/integration/js/`                       | `node`       |
| Integration (enhancement) | Built HTML + real client `init` together                                                 | jsdom       | `tests/integration/enhance/`                  | `enhance`    |
| Visual / structural       | Rendered pages in a real browser                                                         | Playwright  | `tests/visual/` (see `SPEC_TEST_SNAPSHOT.md`) | (deferred)   |

Unit tests give fast, precise feedback on logic and every branch. Enhancement integration tests prove the contract between template markup and client code: the `data-*` hooks the templates emit are the ones the modules expect, and the enhancement works on real built HTML. Site-wide HTML invariant tests (§7.1) are specified but not a current Jest project — do not add `tests/integration/site/` unless asked.

---

## 3. Tooling and configuration

### 3.1 Dependencies

```bash
yarn add -D jest @jest/globals @swc/core @swc/jest jest-environment-jsdom jsdom @types/jsdom \
  @testing-library/dom @testing-library/user-event @testing-library/jest-dom
```

Client and enhancement tests are TypeScript. Build-helper tests in `tests/unit/` are still JavaScript. `@swc/jest` strips types and emits native ESM for Jest (`module.type: "es6"` plus `extensionsToTreatAsEsm: [".ts"]`); it does not type-check. Scripts pass `--experimental-vm-modules` because the package is `"type": "module"`. Type checking of `*.ts` tests happens in `yarn typecheck`, which runs in CI alongside tests.

Test files import Jest APIs explicitly instead of relying on ambient globals:

```ts
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
```

### 3.2 `jest.config.js`

Match `jest.config.js` in the repo. Jest runs as native ESM: `@swc/jest` emits `es6` modules, `extensionsToTreatAsEsm` includes `.ts`, and every test script prefixes `node --experimental-vm-modules`.

```js
const shared = {
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: false },
          target: "es2022",
          experimental: { keepImportAttributes: true },
        },
        module: { type: "es6" },
      },
    ],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  restoreMocks: true,
};

const config = {
  watchman: false,
  collectCoverageFrom: [
    "_11ty/**/*.ts",
    "src/**/*.11ty.ts",
    "src/js/**/*.ts",
    "!src/js/entries/**",
    "!**/*.test.ts",
    "!**/*.d.ts",
    "!**/types.ts",
  ],
  coverageReporters: ["text", "text-summary", "lcov", "html"],
  coverageThreshold: {
    global: { branches: 90, functions: 90, lines: 90, statements: 90 },
    "./src/js/**/*.ts": { branches: 80, functions: 80, lines: 80, statements: 80 },
    "./_11ty/*.ts": { branches: 80, functions: 80, lines: 80, statements: 80 },
    "./src/*.11ty.ts": { branches: 80, functions: 80, lines: 80, statements: 80 },
    "./src/css/*.11ty.ts": { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  projects: [
    {
      ...shared,
      displayName: "node",
      testEnvironment: "node",
      testMatch: [
        "<rootDir>/tests/unit/**/*.test.js",
        "<rootDir>/tests/integration/js/**/*.test.js",
      ],
    },
    {
      ...shared,
      displayName: "client",
      testEnvironment: "jsdom",
      testEnvironmentOptions: { url: "http://localhost:8080/" },
      testMatch: ["<rootDir>/src/js/**/*.test.ts"],
      setupFilesAfterEnv: ["<rootDir>/tests/setup/dom.ts"],
    },
    {
      ...shared,
      displayName: "enhance",
      testEnvironment: "jsdom",
      testEnvironmentOptions: { url: "http://localhost:8080/" },
      testMatch: ["<rootDir>/tests/integration/enhance/**/*.test.ts"],
      globalSetup: "<rootDir>/tests/setup/build-site.ts",
      setupFilesAfterEnv: ["<rootDir>/tests/setup/dom.ts"],
    },
  ],
};

export default config;
```

`collectCoverageFrom` and `coverageThreshold` are global options and stay at the top level; `testEnvironment`, `restoreMocks`, and `transform` are per-project. `eleventy.config.ts` is excluded by omission: it **MUST** stay wiring only (see `SPEC_BUILD_TS.md` §4.1). `**/types.ts` holds interfaces only and is excluded the same way.

If a build helper imports an ESM-only npm package that Jest cannot load, allow it through `transformIgnorePatterns` rather than mocking the package away.

### 3.3 Setup files

`tests/setup/dom.ts`:

```ts
import "@testing-library/jest-dom/jest-globals";
```

`tests/setup/build-site.ts` runs one full Eleventy build per enhance run into a temporary directory. A build failure fails the whole enhance project, which is itself a test: the site must always build.

```ts
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "../..");
const SITE_URL = "http://localhost:8080/";

export default function buildSite(): void {
  const out = mkdtempSync(path.join(tmpdir(), "site-default-"));
  execFileSync(
    path.join(ROOT, "node_modules/.bin/eleventy"),
    ["--config=eleventy.config.ts", `--output=${out}`, "--quiet"],
    {
      cwd: ROOT,
      env: { ...process.env, SITE_URL },
      stdio: "inherit",
    },
  );
  process.env["TEST_SITE_DEFAULT"] = out;
}
```

Environment variables set in `globalSetup` are visible to test files, which read the output path from `process.env`.

### 3.4 Scripts

```json
{
  "scripts": {
    "test": "node --experimental-vm-modules ./node_modules/jest/bin/jest.js",
    "test:coverage": "node --experimental-vm-modules ./node_modules/jest/bin/jest.js --coverage",
    "test:ci": "node --experimental-vm-modules ./node_modules/jest/bin/jest.js --coverage --ci"
  }
}
```

Select a project with `yarn test --selectProjects client node`. `yarn test:ci` is what CI and `yarn run check` run; it enforces the coverage floors in §4.

---

## 4. Coverage requirements

The combined `yarn test --coverage` run **MUST** meet **at least 90% globally** for branches, functions, lines, and statements, **and at least 80% of each of those metrics on every collected file**. Jest fails the run below either floor, and CI treats that as a failed build. Thresholds are never lowered to make a PR pass. Do not add `eleventy.config.ts` or `src/js/entries/` to `collectCoverageFrom`.

Coverage comes from the `node`, `client`, and `enhance` projects. The enhance project's Eleventy build runs in a child process, so it contributes no coverage of `_11ty/`; those files are covered by `tests/unit`. This is why `eleventy.config.ts` is excluded and **MUST** contain wiring only (see `SPEC_BUILD_TS.md` §4.1). Any logic found in the config file is moved to `_11ty/` and tested. Entry files in `src/js/entries/` are excluded for the same reason and **MUST** contain only imports and `init` registration. `**/types.ts` is types-only and is excluded.

Branch coverage matters most. Every `if`/`else`, ternary, `&&`/`||`/`??`, optional chain, default parameter, `switch` case, and `try`/`catch` counts.

When a branch is hard to hit, **delete it if it is unused** rather than writing a hacky test. Characterization tests pin current observable behavior through the public `init` / exported-helper surface; they do not freeze internals. Production code **SHOULD** be refactored to drop dead paths and to take injected `deps` so remaining branches are reachable without `jest.mock`. A test that would need a hack to pass is the wrong test — stop and ask, or simplify the code.

New or changed files **MUST** individually meet the 80% per-file floor. They **SHOULD** meet 90% so an untested new module cannot hide behind well-tested old ones. `/* istanbul ignore next */` is permitted only for genuinely unreachable code, and **MUST** carry a reason:

```ts
default: {
  /* istanbul ignore next -- exhaustive switch over Theme; unreachable */
  const never: never = theme;
  throw new Error(`Unhandled theme: ${String(never)}`);
}
```

Coverage is a floor, not proof. A test that executes a branch without asserting its outcome protects nothing. For modules about to be refactored, run mutation testing to find branches that execute but are not actually verified:

```bash
npm i -D @stryker-mutator/core @stryker-mutator/jest-runner @stryker-mutator/typescript-checker
npx stryker run --mutate "_11ty/markdown.ts"
```

Target an 80% or higher mutation score on modules being refactored, and kill surviving mutants with new tests before the refactor starts.

---

## 5. Unit tests: build code

### 5.1 Pure helpers and filters

Most of `_11ty/` is string and data transformation: escaping, summaries, date formatting, path prefixing, link parsing, JSON-LD construction, markdown rules. These are tested as input/output tables that cover every branch, including empty, `null`/`undefined`, and hostile input.

```ts
import { describe, expect, it } from "@jest/globals";
import { plainSummary } from "./text.ts";

describe("plainSummary", () => {
  it.each([
    {
      name: "strips tags",
      html: "<p>Hello <b>world</b></p>",
      expected: "Hello world",
    },
    {
      name: "drops script contents",
      html: "<p>a</p><script>x()</script>",
      expected: "a",
    },
    { name: "collapses whitespace", html: "a \n\n  b", expected: "a b" },
    { name: "treats null as empty", html: null, expected: "" },
  ])("$name", ({ html, expected }) => {
    expect(plainSummary(html)).toBe(expected);
  });

  it("truncates on a word boundary and appends an ellipsis", () => {
    const result = plainSummary("alpha beta gamma delta", 12);
    expect(result).toBe("alpha beta…");
  });
});
```

Escaping and sanitization helpers **MUST** have explicit tests for every character they handle and for injection-shaped input (`<script>`, `"><img onerror=…>`, `javascript:` URLs), because they sit on the output boundary of the site.

### 5.2 Markdown pipeline

Markdown configuration is tested by applying it to a real `markdown-it` instance and asserting on rendered HTML fragments. Each rule gets focused tests: heading IDs and TOC generation, heading demotion, relative `.md` link rewriting, task lists, fenced code highlighting with known and unknown languages, and raw HTML being disabled. Assert on the specific structure that matters (with `toContain` or by parsing the fragment), not on whole-document string equality, so unrelated rules do not make unrelated tests fail.

### 5.3 Templates, shortcodes, and data

`.11ty.ts` render functions receive a fixture data object and are asserted on their output. For generated machine-readable files, parse the output and assert on structure, not on a formatted string.

### 5.4 I/O at the edges

Filesystem, `git`, the clock, and environment variables are injected (see `SPEC_BUILD_TS.md` §4.4). Unit tests pass fakes:

```ts
it("returns undefined when git has no history for the file", () => {
  const run = () => {
    throw new Error("fatal: no such path");
  };
  expect(gitLastmodDay("src/new-post/index.md", { run })).toBeUndefined();
});
```

Tests that genuinely need files use a per-test temporary directory (`mkdtempSync`) and never read or write the real `src/` or output directories.

### 5.5 The bundler wrapper

`_11ty/bundle.ts` is tested by running real Rollup against a small fixture entry directory under `_11ty/__fixtures__/` and asserting on the result: module entries are written to `js/<name>.js`, a shared import becomes a hashed chunk, inline entries are returned as IIFE strings with a correct `sha256`, `rev` changes when any chunk changes and stays stable when nothing changes, and `preloadTags` lists exactly an entry's static chunk imports.

---

## 6. Unit tests: client code

### 6.1 The standard module tests

Every client module that follows the `init`/teardown contract in `SPEC_BUILD_TS.md` §5.2 **MUST** have these tests, in addition to its feature-specific behavior tests. They are what make soft navigation and refactoring safe.

The module does nothing when its hook is absent. Calling `init` twice does not double-bind, which is verified by performing an interaction and asserting the effect happens once. After teardown, interactions have no effect and any added DOM (buttons, dialogs, wrappers) is removed. Finally, `init` scoped to a subtree only enhances hooks inside that subtree.

```ts
/** src/js/code-blocks/index.test.ts */
import { describe, expect, it, jest } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { init } from "./index";

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

const FENCE = `<pre data-code-block><code>echo hi</code></pre>`;

describe("code-blocks", () => {
  it("adds a copy button that copies the block's text", async () => {
    const user = userEvent.setup();
    const writeText = jest.fn(async (_: string) => {});
    init(mount(FENCE), { clipboard: { writeText } });

    await user.click(screen.getByRole("button", { name: /copy/i }));

    expect(writeText).toHaveBeenCalledWith("echo hi");
  });

  it("is idempotent", () => {
    const root = mount(FENCE);
    init(root);
    init(root);
    expect(screen.getAllByRole("button", { name: /copy/i })).toHaveLength(1);
  });

  it("removes its controls on teardown", () => {
    const teardown = init(mount(FENCE));
    teardown();
    expect(screen.queryByRole("button", { name: /copy/i })).not.toBeInTheDocument();
  });

  it("does nothing when there are no code blocks", () => {
    expect(() => init(mount("<p>no code</p>"))()).not.toThrow();
  });
});
```

`document.body.innerHTML` is acceptable in test fixtures; the lint rule banning `innerHTML` applies to source code only.

### 6.2 Querying and interacting

Tests query the DOM the way a user perceives it, using Testing Library in this priority: `getByRole` with `name`, `getByLabelText`, `getByText`. Hooks may be selected by their `data-*` attribute when setting up fixtures, because that attribute is the documented contract with templates. Tests **MUST NOT** select by BEM class names or DOM position, since CSS refactors change those.

Interactions use `userEvent`, not `dispatchEvent` or `fireEvent`, except for events `userEvent` cannot produce: `popstate`, `message`, `storage`, `wheel`, and pointer events (pinch / `setPointerCapture`). For pointer sequences, subclass `MouseEvent` as `TestPointerEvent` — jsdom has no native `PointerEvent`.

Keyboard behavior (shortcuts, dialog focus trapping, `Escape` to close, focus restoration) is tested with `user.keyboard()` and `expect(element).toHaveFocus()`. Accessibility state is asserted directly: `aria-expanded`, `aria-hidden`, `aria-pressed`, `hidden`, focus location after open and close.

### 6.3 Boundaries and fakes

Only browser boundaries are replaced, and only through `deps` injection. In-repo modules are always real. `jest.mock()` of in-repo modules is prohibited because it breaks when files are renamed or split, which is exactly what refactors do.

| Boundary                                        | How to control it                                                                                                                                                                                                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `localStorage`                                  | Inject a `Map`-backed fake; inject one whose methods throw to test blocked storage                                                                                                                                                                                    |
| `fetch` (soft navigation)                       | Inject a fake returning `FetchResponse` (`{ ok, status, text() }` from `src/js/platform`). jsdom has no `Response`. Cover non-OK status, network error, and abort. `@ts-expect-error` with a description is allowed in tests if a double is intentionally incomplete. |
| Clipboard                                       | Inject `{ writeText }`; cover rejection                                                                                                                                                                                                                               |
| `matchMedia` (reduced motion, hover capability) | Inject a function returning `{ matches }`; test both states for every animated behavior                                                                                                                                                                               |
| `IntersectionObserver`, `ResizeObserver`        | Inject a fake that exposes a method to trigger entries                                                                                                                                                                                                                |
| Timers and delays                               | `jest.useFakeTimers()` and `jest.advanceTimersByTime()`. Pair with `userEvent.setup({ advanceTimers: jest.advanceTimersByTime })`. Restore `jest.useRealTimers()` in `afterEach`. Never real waits.                                                                   |
| URL and history                                 | Pass a `location`-like object through `deps`. Do **not** stub `location.assign` — it is read-only in jsdom. Assert injected `assign` / `href` and dispatch `popstate`.                                                                                                |
| `Image` / `HTMLImageElement.complete`           | Stub on `globalThis` / the prototype only when prefetch tests need it, and restore both in `afterEach`.                                                                                                                                                               |
| Pointer events                                  | `class TestPointerEvent extends MouseEvent` plus a `setPointerCapture` stub. Do not assume `PointerEvent` exists.                                                                                                                                                     |
| Third-party embeds (Giscus)                     | Assert the injected `<script>` element's `src` and attributes and the `postMessage` payload and target origin; nothing is loaded                                                                                                                                      |

Asserting that a fake was called is correct only when the call is the observable behavior at a boundary: "stores the theme," "posts the new theme to the Giscus origin," "pushes a history entry." Never assert that an internal helper was called.

### 6.4 Pure helpers

Parsing and ranking logic (URL state such as `?q=` and `?t=`, fuzzy matching and scoring, tag filtering and sorting) is extracted into pure functions and tested with `it.each` tables. This is where most branches live; keep them out of DOM-bound code so they can be tested exhaustively and cheaply.

---

## 7. Integration tests

Enhancement tests (§7.2) are the integration layer that exists today. They load built HTML from `TEST_SITE_DEFAULT` and call real `init`.

### 7.1 Site-wide invariants

These invariants are the contract for a future `tests/integration/site/` project. They are **not implemented**. Do not add that folder unless asked. When they exist, they load every file in the build output and assert properties that must hold for all of them, discovering pages from the output directory so new content is covered automatically.

```ts
// tests/integration/site/helpers.ts
import { JSDOM } from "jsdom";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export function siteDir(variant: "DEFAULT" | "FLAGS_OFF" = "DEFAULT"): string {
  const dir = process.env[`TEST_SITE_${variant}`];
  if (!dir) throw new Error("build-site globalSetup did not run");
  return dir;
}

export function htmlPages(dir = siteDir()): { file: string; doc: Document }[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".html"))
    .map((f) => ({
      file: f,
      doc: new JSDOM(readFileSync(path.join(dir, f), "utf8")).window.document,
    }));
}
```

```ts
// tests/integration/site/pages.test.ts
import { describe, expect, it } from "@jest/globals";
import { htmlPages } from "./helpers";

const pages = htmlPages();

describe.each(pages)("$file", ({ doc }) => {
  it("has a non-empty title, description, and lang", () => {
    expect(doc.title.trim()).not.toBe("");
    expect(
      doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim(),
    ).toBeTruthy();
    expect(doc.documentElement.lang).toBeTruthy();
  });

  it("has exactly one h1 and a main landmark reachable by the skip link", () => {
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    const target = doc.querySelector('a[href^="#"]')?.getAttribute("href");
    expect(target && doc.querySelector(target)?.tagName).toBe("MAIN");
  });
});
```

The required invariants, all checked across every page: every page has a title, meta description, `lang`, canonical URL under `SITE_URL`, one `h1`, and a `main` landmark. Every `<img>` has an `alt` attribute (empty is allowed for decorative images). There are no inline event handler attributes (`onclick` etc.) and no `javascript:` URLs. Every inline `<script>` has its `sha256` in the page's CSP meta tag, and the CSP contains no `'unsafe-inline'` in `script-src`. Every `<script type="module">` and `modulepreload` points to a file that exists. External links opened in a new tab carry `rel="noopener"`. Every JSON-LD block parses as JSON with an `@context`.

Links are checked as a single test over the whole output: every internal `href` and `src` resolves to a file in the output directory, and every fragment link (`#id`) resolves to an element on the target page. Failures report the page and the broken reference.

Machine-readable outputs are parsed and validated structurally. The feed and sitemap parse as XML. The feed's items are sorted newest first and every item link resolves. The sitemap lists every HTML page except the 404 page and nothing that does not exist. `robots.txt` references the sitemap. The generated resume JSON parses and matches the expected shape, validated with a type guard shared with the generator.

Feature flags are verified against both build variants: with a flag off, none of its pages, assets, sitemap entries, feed items, or navigation links appear in the output.

The JavaScript budget (`SPEC_BUILD_TS.md` §7) is enforced here: for each page, the gzip size of its module entries, their transitive chunks, and inline scripts is at most the budget.

### 7.2 Enhancement integration

These tests prove templates and client modules agree. For each client module, find built pages that contain its hook, load one into jsdom, run the real `init`, and exercise the enhancement. Pages are selected by hook presence, not by URL.

```ts
/** @jest-environment jsdom */
// tests/integration/enhance/theme.test.ts
import { describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { init } from "../../../src/js/theme";
import { firstPageWith, loadIntoDocument } from "./helpers";

describe("theme toggle on built pages", () => {
  it("persists the chosen theme", async () => {
    loadIntoDocument(firstPageWith("[data-theme-toggle]"));
    const storage = new Map<string, string>();
    init(document, {
      storage: {
        getItem: (k) => storage.get(k) ?? null,
        setItem: (k, v) => void storage.set(k, v),
      },
    });

    await userEvent.setup().click(screen.getByRole("checkbox", { name: /light and dark/i }));

    expect(storage.get("theme")).toBe("light");
  });
});
```

The helpers live in `tests/integration/enhance/helpers.ts` and build on the site helpers. `firstPageWith(selector)` scans the built pages and returns the first whose document matches the selector, failing with a clear message if none does. `loadIntoDocument(page)` replaces the jsdom document's contents with that page's HTML and sets `location` to the page's URL. HTML string assignment is fine here because the lint ban on string sinks applies to source code only.

Every hook attribute emitted by any template **MUST** be consumed by some client module, and every hook a module queries **MUST** appear in at least one built page. A contract test collects all `data-*` hook names from built HTML and from module exports (each module exports its hook selectors as constants) and asserts both directions, so a renamed attribute on either side fails immediately.

Soft navigation gets an end-to-end integration test on built pages: load one built page, inject a fetch fake that serves other built pages from the output directory, click an internal link, and assert that `<main>` now matches the target page's `<main>`, the title and URL updated, focus moved to the new content, modules on the old content were torn down, and modules on the new content were initialized.

---

## 8. Refactoring workflow

Before refactoring, confirm the affected modules meet the coverage floors (`yarn test --coverage --selectProjects client node --collectCoverageFrom='src/js/fuzzy-find/index.ts'`). For code without tests, first write characterization tests that pin current behavior through the public interface, including behavior that looks wrong; fix bugs in separate commits so the refactor stays behavior-preserving.

During the refactor, run `yarn test --selectProjects client node --watch`. Prefer deleting unreachable branches and injecting `deps` over adding tests that only exist to tick a branch. Refactor commits **SHOULD NOT** modify existing assertions. When a test fails, decide which case applies. Either the refactor changed behavior, in which case fix the code, or the test was coupled to implementation, in which case rewrite it to assert behavior in a separate commit and confirm it passes against the pre-refactor code first. Never edit an assertion only to match new output.

After the refactor, `yarn test --coverage` holds both floors, enhancement tests still pass, and pages remain usable with JavaScript disabled. Visual snapshots are out of this program (`SPEC_TEST_SNAPSHOT.md`).

---

## 9. Reliability rules

A flaky test is a failing test. Fix it or quarantine it with a linked issue the same day; never retry it into passing. Common causes are real timers or dates (use fake timers or an injected clock), unawaited promises (lint-enforced by `@typescript-eslint/no-floating-promises`), DOM or storage state leaking between tests (reset `document.body` and fakes in `beforeEach`), and order dependence (run `jest --randomize` periodically).

`it.only`, `describe.only`, and unexplained `it.skip` are lint errors (see `SPEC_LINTING.md`).

---

## 10. Anti-patterns

| Anti-pattern                                     | Why it hurts                                         | Do instead                                          |
| ------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------- |
| `jest.mock` on in-repo modules                   | Breaks on renames and splits; hides integration bugs | Real modules; inject browser and I/O boundaries     |
| Asserting an internal helper was called          | Freezes the call graph                               | Assert DOM, return values, or boundary effects      |
| Selecting elements by BEM class or position      | Breaks on CSS refactors                              | Role, label, or text; `data-*` hooks for setup      |
| Testing a named page or post                     | Breaks when content changes                          | Site-wide invariants; select pages by hook presence |
| Whole-document string equality on generated HTML | Any unrelated change fails it                        | Parse and assert the relevant structure             |
| Logic in `eleventy.config.ts` or entry files     | Uncovered and untestable                             | Move it to `_11ty/` or a feature module             |
| Real waits (`setTimeout` in tests)               | Slow and flaky                                       | Fake timers, `findBy*`, `waitFor`                   |
| Covering a dead branch with a hacky test         | Locks unused code and fights jsdom                   | Delete the branch, or add a `deps` seam             |

---

## 11. Definition of done

A change is complete when new and changed behavior has unit tests covering every reachable branch, including failure paths at browser and I/O boundaries, or the unreachable branch was deleted. Every client module has the standard idempotency, teardown, absent-hook, and scoping tests. Enhancement tests still find their hooks on built pages. `yarn test:ci` passes with coverage at or above **90% global** and **80% per collected file** for branches, functions, lines, and statements. No new coverage exclusions, ignore comments, or in-repo mocks exist without justification, and no existing assertions were changed in refactor-only commits.

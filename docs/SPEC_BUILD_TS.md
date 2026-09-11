# SPEC: TypeScript & Client Bundling (Rollup)

This spec defines how the site's JavaScript is written in TypeScript and how client code is bundled. It is the foundation for `SPEC_TEST_TS.md` (tests), `SPEC_LINTING.md` (lint and formatting), and `SPEC_TEST_SNAPSHOT.md` (visual regression). The ordered migration is `BUILD_TEST_REFACTOR.md`.

Everything marked **MUST** is enforced in review and CI. **SHOULD** means deviations need a stated reason in the PR.

---

## 1. Scope and constraints

Two kinds of code exist in this repo, and they are built differently.

| Kind        | Location                                                  | Runs in            | Built by                                    |
| ----------- | --------------------------------------------------------- | ------------------ | ------------------------------------------- |
| Build code  | `eleventy.config.ts`, `_11ty/**/*.ts`, `src/**/*.11ty.ts` | Node at build time | Nothing. Node strips types natively.        |
| Client code | `src/js/**/*.ts`                                          | Browser            | Rollup, into `/js/` in the output directory |

The existing project constraints still apply. Pages **MUST** remain fully readable and navigable with JavaScript disabled; client code is progressive enhancement only. No UI framework, CSS framework, or additional bundler is introduced. Rollup is the only bundler, and it touches client code only. Any new client-side runtime dependency still requires approval under `ARCHITECTURE.md`.

Expected payoff, stated plainly: minification and shared chunks reduce transferred bytes somewhat (helpers such as URL tag parsing are currently duplicated across scripts), and `modulepreload` removes a request waterfall. The larger gain is structural. Real imports replace `window.*` globals, types catch contract breaks between modules, and modules become unit-testable. Performance is guarded by an explicit byte budget (§7), not assumed.

---

## 2. Runtime and module system

Node **MUST** be the current LTS (24.x). Pin it in `package.json` (`"engines": { "node": ">=24" }`), `.nvmrc`, and every `setup-node` step in CI. Node 20 reached end of life in April 2026 and lacks native type stripping.

`package.json` **MUST** declare `"type": "module"`. All code uses ES module syntax. `require`, `module.exports`, and `__dirname` are not used; use `import.meta.dirname` in build code.

Build code runs through Node's native type stripping, so there is no compile step and no `tsx`/`ts-node`. Type stripping imposes two rules. First, only erasable TypeScript syntax is allowed: no `enum`, no `namespace`, no constructor parameter properties, and no `import x = require()`. Use `as const` objects and union types instead of enums. Second, relative imports in build code **MUST** include the `.ts` extension (`import { xmlEscape } from "./text.ts"`), because Node resolves files literally. Both rules are enforced by `tsc` via `erasableSyntaxOnly` and `nodenext` resolution.

Client code imports are extensionless (`import { parseTags } from "./url-state"`), since Rollup resolves them. The client tsconfig rejects `.ts` extensions, so the two conventions cannot be mixed up.

---

## 3. TypeScript configuration

Three tsconfig files give each environment the correct globals. Build code cannot reference `document`; client code cannot reference `process` or `node:fs`.

`tsconfig.json` (build code, repo root):

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": [
    "eleventy.config.ts",
    "playwright.config.ts",
    "_11ty/**/*.ts",
    "src/**/*.11ty.ts",
    "src/_data/**/*"
  ],
  "exclude": ["src/js/**", "tests/**", "_site/**", "node_modules/**"]
}
```

`src/js/tsconfig.json` (client code, including its colocated unit tests):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": [],
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["./**/*.ts"]
}
```

`tests/tsconfig.json` (integration and visual tests, which need both Node and DOM types):

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": { "lib": ["ES2023", "DOM", "DOM.Iterable"] },
  "include": ["./**/*.ts"],
  "exclude": []
}
```

The client config intentionally omits `noEmit` because the Rollup TypeScript plugin emits through it. Type checking for all three runs via `npm run typecheck` (see `SPEC_LINTING.md`), passing `--noEmit` on the command line.

`any` is not permitted in source (lint-enforced). Untyped external data (JSON files, front matter, `fetch` responses, `postMessage` payloads) enters as `unknown` and is narrowed by a type guard or parser function, which is unit-tested.

---

## 4. Build code

### 4.1 Eleventy configuration

`.eleventy.js` becomes `eleventy.config.ts`. Scripts pass it explicitly: `eleventy --config=eleventy.config.ts`. The config file **MUST** stay a thin orchestrator: it registers plugins, filters, shortcodes, collections, passthrough copies, and event hooks, but contains no logic beyond wiring. Anything with a branch or a transformation lives in `_11ty/` where it is unit-tested. This is required because the config file is excluded from coverage (see `SPEC_TEST_TS.md`).

```ts
import type { UserConfig } from "@11ty/eleventy";
import { registerFilters } from "./_11ty/filters.ts";
import { bundleClient, type BundleResult } from "./_11ty/bundle.ts";

export default function (eleventyConfig: UserConfig) {
  let bundle: BundleResult | undefined;

  eleventyConfig.on("eleventy.before", async ({ directories, runMode }) => {
    bundle = await bundleClient({
      entryDir: "src/js/entries",
      outDir: directories.output,
      minify: runMode === "build",
    });
  });

  eleventyConfig.addShortcode("jsRev", () => bundle?.rev ?? "");
  eleventyConfig.addShortcode("inlineScript", (name: string) => bundle?.inline[name]?.code ?? "");
  eleventyConfig.addShortcode(
    "modulePreloads",
    (entry: string) => bundle?.preloadTags(entry) ?? "",
  );
  eleventyConfig.addWatchTarget("src/js");
  eleventyConfig.ignores.add("src/**/*.test.ts");

  registerFilters(eleventyConfig);
  // ...
}
```

Build helpers **MUST** use the directories Eleventy provides (`directories.output`, `directories.input`) rather than hard-coded `_site` or `src` paths, so tests can build to a temporary directory.

### 4.2 Data files and TypeScript templates

Global data files in `src/_data/` stay as `.json`, or as one-line `.js` re-exports of a typed module in `_11ty/` (`export { default } from "../../_11ty/security.ts";`). All logic lives in `_11ty/`.

JavaScript templates become `.11ty.ts`, registered as documented by Eleventy:

```ts
eleventyConfig.addExtension("11ty.ts", { key: "11ty.js" });
eleventyConfig.addTemplateFormats("11ty.ts");
```

Their `render` function is a pure function of the data cascade and is unit-tested with fixture data.

### 4.3 Feature flags

Feature flags are read through `_11ty/features.ts`, which loads `src/_data/features.json` and applies an optional `SITE_FEATURES` environment override (a JSON object merged over the file). This lets tests build the site in each flag state without editing tracked files.

### 4.4 Side effects

Build helpers export functions and perform no I/O at import time. The build date comes from `SOURCE_DATE_EPOCH` when it is set (the reproducible-builds convention), falling back to the current time, so test and fixture builds are byte-for-byte repeatable. Filesystem access, `git` invocations, the current date, and environment variables are accessed through parameters or small injectable wrappers so they can be replaced in unit tests. For example, `gitLastmodDay(inputPath, { run = execGit } = {})`.

---

## 5. Client code

### 5.1 Layout

```
src/js/
  tsconfig.json
  entries/                 # Rollup inputs; one per script tag
    site.ts                # every module that can appear after a <main> swap
    theme-init.ts          # built as a classic IIFE and inlined
  platform.ts              # the only file touching storage, fetch, clipboard, matchMedia, observers
  lifecycle.ts             # registerModules(): init on load, teardown/re-init on soft navigation
  theme.ts                 # feature modules: exports only, no side effects
  theme.test.ts
  soft-nav.ts
  soft-nav.test.ts
  url-state.ts             # shared helpers
  url-state.test.ts
  dom.ts
  ...
```

`src/js/` stays flat apart from `entries/`. There are two entries so soft navigation keeps working without changing which code ships on which page: `theme-init` (inline IIFE) and `site` (all feature modules that today load on every page). `hacklas-disclaimer-init` is a classic IIFE **file** (blocking, `'self'`), not a third module entry and not a second CSP-hashed inline. Page-group entries (`hacklas.ts`, `post.ts`) are out of this program; adding them would change what home vs posts download.

### 5.2 Module contract

Every feature module follows the same contract. This is what makes the modules testable, safe under soft navigation, and refactorable.

A feature module **MUST NOT** have side effects at import time: no DOM queries, no event listeners, no storage access, no timers. It exports pure helpers plus one `init` function.

`init(root, deps?)` enhances every matching hook inside `root` and returns a teardown function that removes everything it added. It **MUST** be idempotent: calling it twice on the same root does not double-bind. Hooks are located by `data-*` attributes (the markup contract with the templates), never by BEM class names, so CSS refactors cannot break behavior.

Dependencies on browser capabilities that may be missing, blocked, or nondeterministic (storage, `fetch`, clipboard, `matchMedia`, `IntersectionObserver`, timers, the current URL) are passed in through `deps` with production defaults. Storage access is always wrapped, because `localStorage` throws when blocked. Production defaults for these dependencies live in `src/js/platform.ts` (for example `safeLocalStorage()`), which is the only client file permitted to touch those globals directly. This is lint-enforced (`SPEC_LINTING.md` §3).

```ts
import { safeLocalStorage } from "./platform";

export interface ThemeDeps {
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
}

export type Theme = "light" | "dark";
export const THEME_KEY = "theme";

export function parseTheme(value: unknown): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function init(root: ParentNode = document, deps: ThemeDeps = {}): () => void {
  const storage = deps.storage === undefined ? safeLocalStorage() : deps.storage;
  const toggle = root.querySelector<HTMLInputElement>("[data-theme-toggle]");
  if (!toggle || toggle.dataset["enhanced"] === "theme") return () => {};

  const controller = new AbortController();
  toggle.dataset["enhanced"] = "theme";
  if (parseTheme(storage?.getItem(THEME_KEY)) === "light") toggle.checked = true;

  toggle.addEventListener(
    "change",
    () => {
      try {
        storage?.setItem(THEME_KEY, toggle.checked ? "light" : "dark");
      } catch {
        /* storage full or blocked: theme still applies for this page */
      }
    },
    { signal: controller.signal },
  );

  return () => {
    controller.abort();
    delete toggle.dataset["enhanced"];
  };
}
```

Registering listeners with an `AbortController` signal makes teardown a single `abort()` call and is the required pattern.

### 5.3 No globals

Modules communicate only through imports and DOM events. Assigning to `window` or `globalThis` is prohibited (lint-enforced). Existing globals such as `window.siteUrl()` and `window.syncSoftNavPath()` are replaced by exported functions. The soft-navigation controller calls the teardown of each active module before swapping `<main>`, then calls `init` on the new content, and dispatches a `site:navigated` `CustomEvent` on `document` for anything that must react to navigation.

### 5.4 Entries

Entry files contain only imports and `init` calls. They are the only client files allowed to have top-level side effects, and they are excluded from unit-test coverage because they have no logic.

```ts
// src/js/entries/site.ts
import { registerModules } from "../lifecycle";
import * as theme from "../theme";
import * as codeBlocks from "../code-blocks";
import * as lightbox from "../image-lightbox";
import * as comments from "../comments";
import * as search from "../booru-search";
// ...every other module that currently loads on every page for soft-nav

registerModules([theme, codeBlocks, lightbox, comments, search /* ... */]);
```

---

## 6. Rollup

### 6.1 Dependencies

```bash
npm i -D rollup @rollup/plugin-typescript @rollup/plugin-terser typescript tslib @types/node
```

`@rollup/plugin-node-resolve` is added only if an approved client-side npm dependency is introduced.

### 6.2 Bundler module

Rollup runs from `_11ty/bundle.ts` via its JavaScript API, called from `eleventy.before`. There is no separate `rollup.config.*` file and no second watch process: `npm run build` and `npm run serve` stay single commands. The Rollup cache is kept between rebuilds in serve mode.

```ts
import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import path from "node:path";
import { rollup, type OutputChunk, type RollupCache } from "rollup";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

const INLINE_ENTRIES = new Set(["theme-init"]);
const CLASSIC_FILE_ENTRIES = new Set(["hacklas-disclaimer-init"]);
let cache: RollupCache | undefined;

export interface BundleOptions {
  entryDir: string;
  outDir: string;
  minify: boolean;
}

export async function bundleClient({
  entryDir,
  outDir,
  minify,
}: BundleOptions): Promise<BundleResult> {
  const entries = listEntries(entryDir);
  const plugins = [typescript({ tsconfig: "src/js/tsconfig.json" }), minify && terser()];

  // Module entries: ES modules with shared chunks, written to /js/
  const bundle = await rollup({
    input: entries.modules,
    cache,
    plugins,
    treeshake: { moduleSideEffects: (id) => id.includes("/entries/") },
  });
  cache = bundle.cache;
  const { output } = await bundle.write({
    dir: path.join(outDir, "js"),
    format: "es",
    entryFileNames: "[name].js",
    chunkFileNames: "chunks/[name]-[hash].js",
    sourcemap: true,
  });
  await bundle.close();

  // Inline entries: classic IIFE, returned as a string for the template to inline
  const inline = await buildInline(entries.inline, plugins);

  return createResult(
    output.filter((o): o is OutputChunk => o.type === "chunk"),
    inline,
  );
}
```

`listEntries`, `buildInline`, and `createResult` live in the same module and are unit-tested against a fixture entry directory (see `SPEC_TEST_TS.md`). `CLASSIC_FILE_ENTRIES` are built as IIFE files to `/js/` (blocking `'self'` scripts). `hacklas-disclaimer-init` is in that set so it can hide the disclaimer before first paint without a second CSP hash.

### 6.3 Output contract

Module entries are emitted as ES modules at stable paths (`/js/<entry>.js`) and loaded with `<script type="module">`, which is deferred by default and needs no `defer` attribute. Cache busting uses a content hash query string, mirroring the existing `cssRev`: `?v={% jsRev %}`, where `rev` is a hash of all emitted chunk contents. Shared chunks have content-hashed filenames and never need query strings.

`BundleResult.preloadTags(entry)` returns `<link rel="modulepreload">` tags for an entry's static chunk imports, taken from Rollup's chunk metadata. Templates **SHOULD** emit them in `<head>` alongside the entry so chunks download in parallel with the entry instead of after it.

```njk
{% modulePreloads "site" | safe %}
<script type="module" src="{{ '/js/site.js' | url }}?v={% jsRev %}"></script>
```

Source maps are published next to each chunk. The site is open source, so there is nothing to hide, and they make production errors debuggable.

### 6.4 Inline script and CSP

`theme-init` must run before first paint, so it stays a classic inline script. Rollup builds it as an IIFE; the template inlines `{% inlineScript "theme-init" %}`. The CSP `sha256` hash **MUST** be computed from the exact built string that is inlined, never from the source file, because minification changes the bytes. `_11ty/security.ts` receives the hash from `BundleResult` instead of hashing `src/js/theme-init.*` itself. An integration test verifies that every inline script in every built page has a matching hash in that page's CSP (see `SPEC_TEST_TS.md`).

### 6.5 Browser targets

Client output targets ES2020, which covers every browser that supports `<script type="module">`. Browsers without module support receive no enhancement, which is acceptable because the site works without JavaScript.

---

## 7. Performance budget

Each built page's JavaScript cost is the gzip size of its module entries plus all transitively imported chunks, plus inline scripts. The budget is **20 KB gzipped per page**, enforced by an integration test that reads Rollup's chunk metadata and the built HTML. Raising the budget requires a PR that states what was added and why it cannot be deferred or dropped.

The Lighthouse script remains the check for real-world impact. Run it before and after the migration and record both results in the migration PR.

---

## 8. Migration order

The destination is this spec. The path, stop-and-check cadence, and allowed deviations are [BUILD_TEST_REFACTOR.md](BUILD_TEST_REFACTOR.md). Follow that playbook for order; do not invent a parallel sequence.

Migrate in small, independently shippable stops, each keeping the site deployable. Tests are written against the current behavior before each file is converted, so every conversion is a behavior-preserving refactor under `SPEC_TEST_TS.md` §8.

`ARCHITECTURE.md`, the README's client JS section, and `.cursor/rules/project.mdc` **MUST** be updated in the first step to permit Rollup and the `tests/` directory, since both are currently disallowed there.

---

## 9. Definition of done

A change touching build or client code is complete when `npm run typecheck` passes for all three tsconfigs, and no `enum`, `namespace`, `any`, or `window` assignment has been introduced. Every client module follows the import-free-of-side-effects and idempotent `init`/teardown contract, with hooks located by `data-*` attributes. `eleventy.config.ts` contains wiring only. The CSP hash is derived from built output. The per-page JavaScript budget test passes, and the site remains fully usable with JavaScript disabled.


# SPEC: Snapshot Testing (Visual & Structural)

This spec defines how rendered output is protected against regressions. Unit and integration tests (`SPEC_TEST_TS.md`) prove the build and the client modules behave correctly; snapshot tests prove pages still *contain* the right things and still *look* right in a real browser. A behavior-preserving refactor must produce zero test failures and zero snapshot diffs.

Everything marked **MUST** is enforced in review and CI. **SHOULD** means deviations need a stated reason in the PR.

---

## 1. What gets snapshotted, and against what

| Suite | Runs against | Method | Catches |
|---|---|---|---|
| Visual | A **fixture site**: the real templates, CSS, and JS, built with fixed fixture content | ARIA snapshots + screenshots, compared to committed baselines | Any structural or visual change caused by templates, CSS, build helpers, or client code |
| Smoke | The **real site**: the real templates built with the real content | Assertions only, no baselines | Breakage on real content: console and CSP errors, broken images, horizontal overflow, non-functional no-JS pages |

Snapshots are never taken of real content. If they were, writing or editing a blog post, write-up, or Hacklas note would fail the suite and force a baseline update, and reviewers would learn to approve baseline changes without looking. Pinning the content isolates the one thing snapshots are for: changes in how the site renders. Real content is still checked, but only with assertions that hold regardless of what the content says.

ARIA snapshots describe what a user or screen reader perceives: headings, landmarks, links, buttons, form controls, and their accessible names. They survive markup and CSS refactors. Screenshots catch everything styling-related that ARIA snapshots cannot see. Raw HTML snapshots are not used, because incidental markup changes make them fail for reasons that do not affect anyone.

Snapshot tests run under Playwright Test, separately from Jest. They do not count toward the Jest coverage threshold.

---

## 2. The fixture site

### 2.1 Fixture content

`tests/fixtures/visual-content/` mirrors the structure of the real content directories and contains content chosen to exercise every template and markdown feature, not to be realistic. At minimum it contains:

A kitchen-sink blog post using every supported markdown construct: all heading levels (to exercise the TOC and heading demotion), paragraphs with inline code, links, and emphasis, ordered, unordered, nested, and task lists, block quotes, tables, fenced code blocks in several highlighted languages plus an unknown language, a fence tall enough to trigger collapsing, images in `.media/` (including one wide, one tall, and one small), a banner with dark and light `banner_style` overrides, and a front-matter `link`. There is also a minimal post (title and one paragraph, no optional front matter), a post with `disable_tree: true`, and a post with a very long title and long unbroken words. The fixture set includes a write-up with platform tags and one Hacklas note per note variant (with and without `note_tags`, nested path, checklist with nested items), plus a fixture `resume.json` covering every optional field (agency, remote/hybrid/onsite, links, biography) and one entry with only required fields.

Enough posts exist to exercise listing behavior (sorting, tag filtering, empty search results), with fixed dates. All text uses fixed dates and contains non-ASCII characters somewhere.

When a template or markdown feature is added, the fixture content **MUST** be extended in the same PR to exercise it. The fixture content is the visual test specification; a feature not present in it is not visually tested.

### 2.2 Building it

`tests/visual/build-fixture-site.ts` creates the fixture input by copying `src/` to `.cache/visual-src/`, removing the real content collections, copying the fixture content in their place, and running Eleventy against it:

```ts
import { cpSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";

const SRC = ".cache/visual-src";
const OUT = ".cache/visual-site";
const CONTENT_DIRS = ["blog", "write-ups", "hacklas"];

rmSync(SRC, { recursive: true, force: true });
cpSync("src", SRC, {
  recursive: true,
  filter: (from) => !CONTENT_DIRS.some((dir) => from.startsWith(`src/${dir}/`) || from === `src/${dir}`),
});
cpSync("tests/fixtures/visual-content", SRC, { recursive: true });

execFileSync(
  "npx",
  ["@11ty/eleventy", "--config=eleventy.config.ts", `--input=${SRC}`, `--output=${OUT}`, "--quiet"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      SITE_URL: "http://localhost:8080/",
      SOURCE_DATE_EPOCH: "1768471200", // 2026-01-15T10:00:00Z
      SITE_FEATURES: JSON.stringify({ hacklas: true, hacklas_show_beta: true }),
    },
  },
);
```

This relies on build helpers using Eleventy's configured directories rather than hard-coded `src/` or `_site/` paths (`SPEC_BUILD_TS.md` §4.1). If the fixture build renders real content or reads from `_site/`, that is a bug in a build helper.

`SOURCE_DATE_EPOCH` pins the build date, so footers, feed dates, and anything else derived from build time are identical on every run. Git-derived dates are absent in the copied tree, which is also deterministic.

The fixture site is built as a separate step before Playwright starts, because Playwright collects tests before its global setup runs, and the page list is read from the fixture site's sitemap at collection time.

---

## 3. Tooling and configuration

### 3.1 Install

```bash
npm i -D @playwright/test sirv-cli
npx playwright install --with-deps chromium
```

`sirv-cli` serves the built directories as plain static files, matching GitHub Pages. The Eleventy dev server is not used because it injects a live-reload client and different response headers.

### 3.2 `playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

const VISUAL_URL = "http://localhost:8080";
const SMOKE_URL = "http://localhost:8081";
const visual = { testDir: "./tests/visual", testIgnore: /smoke\.spec\.ts/ };

export default defineConfig({
  snapshotPathTemplate: "{testDir}/__snapshots__/{testFilePath}/{arg}-{projectName}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: 0,
  updateSnapshots: process.env["CI"] ? "none" : "missing",
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    locale: "en-US",
    timezoneId: "UTC",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },

  expect: {
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },

  projects: [
    { name: "desktop", ...visual, use: { ...devices["Desktop Chrome"], baseURL: VISUAL_URL, viewport: { width: 1280, height: 800 } } },
    { name: "tablet", ...visual, use: { ...devices["Desktop Chrome"], baseURL: VISUAL_URL, viewport: { width: 768, height: 1024 } } },
    { name: "mobile", ...visual, use: { ...devices["Pixel 7"], baseURL: VISUAL_URL } },
    { name: "no-js", ...visual, use: { ...devices["Desktop Chrome"], baseURL: VISUAL_URL, javaScriptEnabled: false } },
    { name: "smoke", testDir: "./tests/visual", testMatch: /smoke\.spec\.ts/, use: { ...devices["Pixel 7"], baseURL: SMOKE_URL } },
    { name: "smoke-no-js", testDir: "./tests/visual", testMatch: /smoke\.spec\.ts/, use: { ...devices["Pixel 7"], baseURL: SMOKE_URL, javaScriptEnabled: false } },
  ],

  webServer: [
    { command: "npx sirv .cache/visual-site --port 8080 --quiet", url: VISUAL_URL, reuseExistingServer: !process.env["CI"] },
    { command: "npx sirv .cache/smoke-site --port 8081 --quiet", url: SMOKE_URL, reuseExistingServer: !process.env["CI"] },
  ],
});
```

`updateSnapshots: "none"` in CI means a missing baseline fails instead of being written silently. `retries: 0` is intentional: a snapshot test that passes on retry is flaky and must be fixed, not masked.

The `no-js` project runs every visual test with JavaScript disabled and keeps its own baselines. It is the automated form of the project rule that every page must render and be navigable without JavaScript.

### 3.3 Scripts

```json
{
  "scripts": {
    "build:visual": "node tests/visual/build-fixture-site.ts",
    "build:smoke": "SITE_URL=http://localhost:8081/ eleventy --config=eleventy.config.ts --output=.cache/smoke-site --quiet",
    "test:visual": "./scripts/playwright-docker.sh \"npm run build:visual && npm run build:smoke && npx playwright test\"",
    "test:visual:update": "./scripts/playwright-docker.sh \"npm run build:visual && npx playwright test --update-snapshots --project=desktop --project=tablet --project=mobile --project=no-js\"",
    "test:visual:report": "npx playwright show-report"
  }
}
```

---

## 4. Environment consistency

Font rendering and anti-aliasing differ between operating systems and browser builds, and the site relies on system fonts, so a baseline captured on macOS will not match Linux CI. Baselines **MUST** be generated and compared inside the official Playwright Docker image, pinned to the exact installed `@playwright/test` version.

`scripts/playwright-docker.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
PW_VERSION=$(node -p "require('@playwright/test/package.json').version")
docker run --rm -it --ipc=host \
  -v "$PWD":/work -v /work/node_modules -w /work \
  "mcr.microsoft.com/playwright:v${PW_VERSION}-noble" \
  /bin/bash -c "npm ci && $1"
```

The anonymous `/work/node_modules` volume keeps host-installed binaries out of the container. The image ships Node; if its major version differs from `.nvmrc`, install the pinned Node in the script before `npm ci`. Running Playwright directly on a developer machine is fine for iterating on a test, but those screenshots are not authoritative and are never committed.

Upgrading Playwright is its own PR: bump the version, regenerate all baselines, and confirm the diffs are limited to rendering noise.

`scripts/` is a new top-level directory; `ARCHITECTURE.md` must list it along with `tests/`.

---

## 5. Determinism

Every source of variation **MUST** be controlled. The shared fixture in `tests/visual/fixtures.ts` applies all of it, so individual tests cannot forget.

```ts
import { test as base, expect, type Page } from "@playwright/test";

export type Theme = "dark" | "light";

export const test = base.extend<{ theme: Theme }>({
  theme: ["dark", { option: true }],
  page: async ({ page, theme }, use) => {
    await page.clock.setFixedTime(new Date("2026-01-15T10:00:00Z"));
    await page.addInitScript((t) => {
      try { localStorage.setItem("theme", t); } catch { /* storage blocked: default theme */ }
    }, theme);
    await page.route("https://giscus.app/**", (route) => route.abort());
    await use(page);
  },
});

/** Wait until the page is visually final: fonts loaded, lazy images decoded. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = Array.from(document.images);
    for (const img of images) img.loading = "eager";
    await Promise.all(images.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))));
  });
}

export { expect };
```

The clock is frozen for anything the client computes from the current time. The build date is pinned by `SOURCE_DATE_EPOCH` (§2.2). The theme is set the way a returning visitor's stored preference sets it, rather than by clicking the toggle. Third-party embeds (Giscus) are blocked, so the comments section renders its no-JavaScript fallback in every run. Lazy images are forced to load and decode before capture, since full-page screenshots do not scroll the page. `reducedMotion: "reduce"` and `animations: "disabled"` remove motion.

Screenshots are taken only once the page is in its final state. Wait on a user-visible condition and `settle()`, never on a timeout or `networkidle` (both are lint errors).

Masking (`mask: [locator]`) is a last resort after data, time, and third parties are controlled, and it requires a reason in the test. A masked region still renders as a box, so layout changes around it are detected.

---

## 6. Visual suite

### 6.1 Page inventory

Pages are enumerated from the fixture site's `sitemap.xml`, so every page the site can generate is covered without a hand-maintained list. Adding a template or content type automatically adds its pages once fixture content exercises it.

```ts
// tests/visual/pages.ts
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const FIXTURE_SITE = ".cache/visual-site";

export interface FixturePage { name: string; path: string }

/** HTML page paths listed in a built site's sitemap. */
export function sitemapPaths(sitemapFile: string): string[] {
  const xml = readFileSync(sitemapFile, "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1] ?? "").pathname)
    .filter((p) => p.endsWith("/") || p.endsWith(".html"));
}

export function fixturePages(): FixturePage[] {
  return [...sitemapPaths(`${FIXTURE_SITE}/sitemap.xml`), "/404.html"].map((p) => ({
    path: p,
    name: p === "/" ? "home" : p.replace(/^\/|\/$/g, "").replaceAll("/", "__"),
  }));
}

/** Path of the first fixture page whose HTML contains the given data-* hook attribute. */
export function firstPageWith(hookAttribute: string): string {
  const file = readdirSync(FIXTURE_SITE, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".html"))
    .sort()
    .find((f) => readFileSync(path.join(FIXTURE_SITE, f), "utf8").includes(hookAttribute));
  if (!file) throw new Error(`No fixture page contains ${hookAttribute}; extend tests/fixtures/visual-content`);
  return `/${file.replace(/index\.html$/, "")}`;
}
```

The 404 page is not in the sitemap and is appended explicitly. `firstPageWith` fails loudly when no fixture page contains a hook, which means the fixture content needs extending, not that the test should be skipped.

### 6.2 Structure and appearance per page

```ts
// tests/visual/pages.spec.ts
import { test, expect, settle } from "./fixtures";
import { fixturePages } from "./pages";

for (const theme of ["dark", "light"] as const) {
  test.describe(`${theme} theme`, () => {
    test.use({ theme });

    for (const { name, path } of fixturePages()) {
      test(`${name} appearance`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("main")).toBeVisible();
        await settle(page);
        await expect(page).toHaveScreenshot(`${name}-${theme}.png`, { fullPage: true });
      });
    }
  });
}

for (const { name, path } of fixturePages()) {
  test(`${name} structure`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("main")).toMatchAriaSnapshot({ name: `${name}.aria.yml` });
  });
}

test("site chrome structure", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toMatchAriaSnapshot({ name: "chrome-banner.aria.yml" });
  await expect(page.getByRole("contentinfo")).toMatchAriaSnapshot({ name: "chrome-footer.aria.yml" });
});
```

ARIA snapshots cover `main` per page and the shared header and footer once, so a navigation change produces one structural diff rather than one per page. Screenshots are full-page, so a legitimate change to shared chrome updates every screenshot baseline; review a representative sample of each template and confirm the diff is identical in the others.

Every page is captured across the desktop, tablet, and mobile projects and in both themes, plus the no-JS project.

### 6.3 Enhancement states

Each client module with a visible state change has a spec file in `tests/visual/states/` named after the module. Tests find a fixture page containing the module's hook by `data-*` attribute, reach the state through real interaction, and screenshot the affected component rather than the whole page, so unrelated page changes do not cause failures.

```ts
// tests/visual/states/image-lightbox.spec.ts
import { test, expect, settle } from "../fixtures";
import { firstPageWith } from "../pages";

test("lightbox open", async ({ page }) => {
  await page.goto(firstPageWith("data-lightbox"));
  await settle(page);
  await page.locator("[data-lightbox] img").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveScreenshot("lightbox-open.png");
  await expect(dialog).toMatchAriaSnapshot({ name: "lightbox-open.aria.yml" });
});
```

The states to cover are defined per module: every dialog, overlay, or fullscreen mode open; every expanded and collapsed variant; search and filter results including the empty-results state; keyboard focus styles on primary controls; and each state of any gate or banner (for example, shown and dismissed). A new client module with a visible state **MUST** add its states file in the same PR.

The `no-js` project skips states files, since those states require JavaScript. Use `test.skip(({ javaScriptEnabled }) => !javaScriptEnabled, "requires JS")` at the top of each states file.

### 6.4 Soft navigation equivalence

Soft navigation swaps `<main>` without a full page load. A page reached by soft navigation must render identically to the same page loaded directly. For each page linked from the primary navigation, load the home page, click the link, wait for the URL and heading to change, and compare against the direct-load baseline of the same page by reusing its snapshot name. Any difference means the swap left stale state, missed a module re-initialization, or failed to reset scroll or focus. This test is skipped in the `no-js` project, where every navigation is a full load.

---

## 7. Smoke suite (real content)

The smoke suite runs against the real site built into `.cache/smoke-site/`, iterating over every page in its sitemap. It has no baselines. Each page is loaded at mobile width, with and without JavaScript, and the following assertions must hold.

There are no console errors or uncaught exceptions; Chromium reports CSP violations as console errors, so this also catches a stale inline-script hash or a disallowed origin. Every image has loaded (`naturalWidth > 0`). There is no horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`), which is the most common way a long code line, table, or unbroken word in real content breaks mobile layout. The `main` landmark contains visible text.

```ts
// tests/visual/smoke.spec.ts
import { test, expect } from "@playwright/test";
import { sitemapPaths } from "./pages";

for (const path of sitemapPaths(".cache/smoke-site/sitemap.xml")) {
  test(`smoke ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    page.on("pageerror", (err) => errors.push(err.message));
    await page.route("https://giscus.app/**", (route) => route.abort());

    await page.goto(path);
    await expect(page.getByRole("main")).not.toBeEmpty();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(0);

    const broken = await page.evaluate(async () => {
      const images = Array.from(document.images);
      for (const img of images) img.loading = "eager";
      await Promise.all(images.map((img) => img.decode().catch(() => undefined)));
      return images.filter((img) => img.naturalWidth === 0).map((img) => img.currentSrc || img.src);
    });
    expect(broken, "images that failed to load").toEqual([]);
    expect(errors).toEqual([]);
  });
}
```

Because the smoke suite asserts properties rather than comparing pixels, content can change freely; it only fails when real content actually breaks something.

---

## 8. ARIA snapshot conventions

Page-level ARIA snapshots are stored as `.aria.yml` files and **SHOULD** be complete, generated with `--update-snapshots`, so added and removed elements are detected. Focused inline snapshots in states tests may be partial. Use regular expressions for values that legitimately vary between otherwise identical renders, such as counts: `- paragraph: /\d+ results/`.

A missing accessible name appears in a snapshot as an unnamed `button`, `link`, or `img`. Reviewers **MUST** treat an unnamed interactive element in a new or updated ARIA snapshot as a defect to fix, not a baseline to accept.

---

## 9. Jest text snapshots (restricted)

Jest snapshots are allowed only for small, stable serialized outputs where the exact text is the behavior, and always inline so the expected value is visible in review. Suitable cases in this repo are a generated `robots.txt` or `llms.txt` produced from fixture data, a CSP string, and a single rendered markdown construct:

```ts
it("renders a task list item as a disabled checkbox", () => {
  expect(render("- [x] done")).toMatchInlineSnapshot(
    `"<ul class="task-list"><li class="task-list__item"><input type="checkbox" checked disabled> done</li></ul>"`,
  );
});
```

They are prohibited for full pages, layouts, and anything longer than about 30 lines; those are covered by site integration invariants and ARIA snapshots. CI runs Jest with `--ci`, so missing snapshots fail rather than being written.

---

## 10. Updating baselines

A diff means rendered output changed. The only question is whether the change was intended.

When a test fails, open the HTML report (`npm run test:visual:report`). For screenshots it shows the expected, actual, and highlighted diff images with a slider; for ARIA snapshots it shows a text diff.

If the change is unintended, it is a regression. Fix the code. Baselines are never updated to make a failing test pass without identifying the cause.

If the change is intended, regenerate baselines in Docker (`npm run test:visual:update`), scoped to the affected tests where possible (append `-g "blog"` or a file path), and review every changed image and YAML file before committing. Baseline updates **MUST** be committed separately from code changes, with a message stating what changed and why (for example, `visual: update listing baselines for new tag chip spacing`). Approving a PR with baseline changes asserts that each changed image was inspected.

Changes to fixture content also change baselines. Commit fixture content and its resulting baselines together in their own commit, separate from template or CSS changes, so reviewers can tell whether a diff comes from new fixtures or from a rendering change.

---

## 11. Refactoring workflow

Before refactoring, confirm the fixture content exercises everything the refactor touches, and extend it first if not (with baselines committed from the pre-refactor code). Run the full visual suite on the pre-refactor code and confirm it is green.

After the refactor, the expected result is **zero diffs** in every project and theme. Any diff is investigated as a regression. The exception is a refactor whose stated scope includes visual change (for example, moving CSS to new tokens that intentionally adjust spacing); the PR description lists the expected changes, and the baseline commit is reviewed against that list.

ARIA passing while screenshots fail indicates a styling regression. Screenshots passing while ARIA fails usually indicates a lost accessible name, a changed heading level, or text that was removed but visually subtle. A `no-js` diff with passing JS projects means the no-JavaScript rendering path changed. All are real regressions.

---

## 12. CI

Visual and smoke tests run in their own job, in the pinned Playwright container, after the `check` job from `SPEC_LINT.md`. Deployment depends on it.

```yaml
visual:
  needs: check
  runs-on: ubuntu-latest
  container:
    image: mcr.microsoft.com/playwright:v1.XX.X-noble   # must match @playwright/test in package.json
    options: --ipc=host
  steps:
    - uses: actions/checkout@v5
    - uses: actions/setup-node@v5
      with:
        node-version-file: .nvmrc
        cache: npm
    - run: npm ci
    - run: npm run build:visual
    - run: npm run build:smoke
    - run: npx playwright test
      env:
        CI: "true"
    - if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 14
```

The uploaded report lets reviewers inspect diffs without running anything locally. The container tag is updated in the same PR that bumps `@playwright/test`.

---

## 13. File layout

```
tests/
  fixtures/
    visual-content/            # fixed content: blog/, write-ups/, hacklas/, _data/resume.json
  visual/
    build-fixture-site.ts
    fixtures.ts                # extended test: clock, theme, blocked third parties, settle()
    pages.ts                   # sitemap-driven page lists, firstPageWith()
    pages.spec.ts              # per-page structure + appearance
    soft-nav.spec.ts
    smoke.spec.ts              # real-content assertions, no baselines
    states/
      <module>.spec.ts         # one per client module with visible states
    __snapshots__/             # committed baselines (.png, .aria.yml)
scripts/
  playwright-docker.sh
```

`.cache/` holds the fixture source, both built sites, and tool caches, and is gitignored. If the baseline set grows large, track `tests/visual/__snapshots__/**/*.png` with Git LFS.

---

## 14. Definition of done

A change is complete when every new template, layout, or markdown feature is exercised by fixture content and therefore appears in the sitemap-driven page inventory. Every new visible enhancement state has a states test. The visual suite passes in the pinned Docker image across all projects and both themes with no retries, and the smoke suite passes on real content. Baseline changes are in a dedicated commit, match the intended change, were visually reviewed, and contain no unnamed interactive elements. No new masks, loosened tolerances, or skipped tests exist without justification.

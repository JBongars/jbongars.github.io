import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "@jest/globals";
import { bundleClient, inlineScriptCode, modulePreloadTags } from "../../_11ty/bundle.ts";

const FIXTURE = path.join(import.meta.dirname, "../../_11ty/__fixtures__/bundle");

function copyFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "bundle-"));
  cpSync(FIXTURE, root, { recursive: true });
  return {
    entryDir: path.join(root, "entries"),
    outDir: path.join(root, "out"),
    shared: path.join(root, "shared.js"),
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("base64");
}

function preloadHrefs(tags) {
  return Iterator.from(tags.matchAll(/href="([^"]+)"/g))
    .map((match) => match[1])
    .toArray();
}

describe("bundleClient", () => {
  it("writes module entries, hashed chunks, classic IIFE files, and inline scripts", async () => {
    const fixture = copyFixture();
    const result = await bundleClient({
      entryDir: fixture.entryDir,
      outDir: fixture.outDir,
      minify: false,
    });

    const site = readFileSync(path.join(fixture.outDir, "js/site.js"), "utf8");
    const extra = readFileSync(path.join(fixture.outDir, "js/extra.js"), "utf8");
    const disclaimer = readFileSync(
      path.join(fixture.outDir, "js/hacklas-disclaimer-init.js"),
      "utf8",
    );
    const siteChunk = site.match(/from ['"]\.\/(chunks\/[^'"]+)['"]/);

    expect(siteChunk?.[1]).toMatch(/^chunks\/.+\.js$/);
    expect(readFileSync(path.join(fixture.outDir, "js", siteChunk[1]), "utf8")).toContain(
      "SHARED_TOKEN",
    );
    expect(extra).toContain(siteChunk[1]);
    expect(disclaimer).toContain("__disclaimerInit");
    expect(existsSync(path.join(fixture.outDir, "js/theme-init.js"))).toBe(false);

    const theme = result.inline["theme-init"];
    expect(theme?.code).toContain("__themeInit");
    expect(theme?.sha256).toBe(sha256(theme.code));

    const siteHrefs = preloadHrefs(result.preloadTags("site"));
    const extraHrefs = preloadHrefs(result.preloadTags("extra"));
    expect(siteHrefs).toHaveLength(1);
    expect(siteHrefs[0]).toMatch(/^\/js\/chunks\/.+\.js$/);
    expect(extraHrefs).toEqual(siteHrefs);
    expect(result.preloadTags("missing")).toBe("");
    expect(inlineScriptCode(result, "nope")).toBe("");
  });

  it("minifies inline scripts and still hashes the built string", async () => {
    const fixture = copyFixture();
    const result = await bundleClient({
      entryDir: fixture.entryDir,
      outDir: fixture.outDir,
      minify: true,
    });
    const theme = result.inline["theme-init"];
    expect(theme?.code).toContain("__themeInit");
    expect(theme?.code).toMatch(/^!function\(\)/);
    expect(theme?.sha256).toBe(sha256(theme.code));
  });

  it("replaces leftover files in the js output directory", async () => {
    const fixture = copyFixture();
    const leftover = path.join(fixture.outDir, "js/stale.js");
    mkdirSync(path.dirname(leftover), { recursive: true });
    writeFileSync(leftover, "stale");
    await bundleClient({
      entryDir: fixture.entryDir,
      outDir: fixture.outDir,
      minify: false,
    });
    expect(existsSync(leftover)).toBe(false);
    expect(existsSync(path.join(fixture.outDir, "js/site.js"))).toBe(true);
  });

  it("keeps rev stable when nothing changes and updates it when a chunk changes", async () => {
    const fixture = copyFixture();
    const options = {
      entryDir: fixture.entryDir,
      outDir: fixture.outDir,
      minify: false,
    };
    const first = await bundleClient(options);
    const second = await bundleClient({
      ...options,
      outDir: path.join(fixture.outDir, "again"),
    });
    expect(second.rev).toBe(first.rev);

    writeFileSync(fixture.shared, 'export const token = "CHANGED_TOKEN";\n');
    const third = await bundleClient({
      ...options,
      outDir: path.join(fixture.outDir, "changed"),
    });
    expect(third.rev).not.toBe(first.rev);
  });

  it("returns helpers for missing bundles and unknown names", () => {
    expect(inlineScriptCode(undefined, "theme-init")).toBe("");
    expect(inlineScriptCode({ rev: "", inline: {}, preloadTags: () => "" }, 1)).toBe("");
    expect(modulePreloadTags(undefined, "site")).toBe("");
    expect(modulePreloadTags({ rev: "", inline: {}, preloadTags: () => "x" }, 1)).toBe("");
  });

  it("skips non-entry files and still builds when only inline scripts exist", async () => {
    const fixture = copyFixture();
    writeFileSync(path.join(fixture.entryDir, "README.md"), "# skip me\n");
    writeFileSync(path.join(fixture.entryDir, "notes.test.js"), "export const x = 1;\n");
    const result = await bundleClient({
      entryDir: fixture.entryDir,
      outDir: path.join(fixture.outDir, "notes"),
      minify: false,
    });
    expect(result.inline["theme-init"]?.code).toContain("__themeInit");
  });

  it("builds TypeScript entries and reports preload tags by name", async () => {
    const fixture = copyFixture();
    writeFileSync(path.join(fixture.entryDir, "typed.ts"), "export const n = 1;\n");
    const result = await bundleClient({
      entryDir: fixture.entryDir,
      outDir: path.join(fixture.outDir, "typed"),
      minify: false,
    });
    expect(modulePreloadTags(result, "site")).toContain("/js/chunks/");
    expect(existsSync(path.join(fixture.outDir, "typed/js/typed.js"))).toBe(true);
  });

  it("builds when there are no module entries", async () => {
    const fixture = copyFixture();
    unlinkSync(path.join(fixture.entryDir, "site.js"));
    unlinkSync(path.join(fixture.entryDir, "extra.js"));
    const result = await bundleClient({
      entryDir: fixture.entryDir,
      outDir: path.join(fixture.outDir, "inline-only"),
      minify: false,
    });
    expect(result.inline["theme-init"]?.code).toContain("__themeInit");
    expect(result.preloadTags("site")).toBe("");
  });
});

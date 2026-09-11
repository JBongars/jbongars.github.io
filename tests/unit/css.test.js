import { afterEach, describe, expect, it, jest } from "@jest/globals";
import fs from "node:fs";
import { bundleCss, cssRev } from "../../_11ty/css.ts";
import { data, render } from "../../src/css/bundle.11ty.ts";

describe("bundleCss", () => {
  it("inlines imported sheets and drops @import rules", () => {
    const css = bundleCss();
    expect(css).not.toContain("@import");
    expect(css).toContain("--bg:");
  });

  it("treats a non-object features file as hacklas off", () => {
    const original = fs.readFileSync.bind(fs);
    const read = jest.spyOn(fs, "readFileSync");
    read.mockImplementation((file, encoding) => {
      if (String(file).endsWith("features.json")) {
        return "[]";
      }
      return original(file, encoding);
    });
    try {
      expect(bundleCss()).not.toContain("@import");
    } finally {
      read.mockRestore();
    }
  });
});

describe("cssRev", () => {
  it("is an 8-character hex digest of the bundle", () => {
    expect(cssRev()).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("bundle.11ty.js", () => {
  it("writes /css/style.css", () => {
    expect(data()).toEqual({
      permalink: "/css/style.css",
      eleventyExcludeFromCollections: true,
    });
    expect(render()).toBe(bundleCss());
  });
});

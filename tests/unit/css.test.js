import { describe, expect, it } from "@jest/globals";
import { bundleCss, cssRev } from "../../_11ty/css.js";
import { data, render } from "../../src/css/bundle.11ty.js";

describe("bundleCss", () => {
  it("inlines imported sheets and drops @import rules", () => {
    const css = bundleCss();
    expect(css).not.toContain("@import");
    expect(css).toContain("--bg:");
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

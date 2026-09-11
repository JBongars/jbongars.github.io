import { describe, expect, it } from "@jest/globals";
import { runClientScript } from "./helpers.js";

describe("site-url.js", () => {
  it("prefixes paths from data-path-prefix", () => {
    const { window } = runClientScript(
      "site-url.js",
      `<!doctype html><html data-path-prefix="/app/"><body></body></html>`,
    );
    expect({
      root: window.siteUrl(),
      relative: window.siteUrl("js/site.js"),
      absolute: window.siteUrl("/js/site.js"),
    }).toMatchSnapshot();
  });

  it("returns the path unchanged when the prefix is /", () => {
    const { window } = runClientScript(
      "site-url.js",
      `<!doctype html><html data-path-prefix="/"><body></body></html>`,
    );
    expect(window.siteUrl("/js/site.js")).toBe("/js/site.js");
  });
});

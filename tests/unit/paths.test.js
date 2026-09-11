import path from "node:path";
import { existsSync } from "node:fs";
import { describe, expect, it } from "@jest/globals";
import {
  ROOT,
  SRC_ROOT,
  absoluteHref,
  resolvePathPrefix,
  siteOrigin,
  siteUrl,
  withPathPrefix,
} from "../../_11ty/paths.ts";

describe("resolvePathPrefix", () => {
  it("defaults to /", () => {
    expect(resolvePathPrefix({})).toBe("/");
    expect(resolvePathPrefix({ PATH_PREFIX: "/" })).toBe("/");
  });

  it("normalizes PATH_PREFIX with a leading and trailing slash", () => {
    expect(resolvePathPrefix({ PATH_PREFIX: "repo" })).toBe("/repo/");
    expect(resolvePathPrefix({ PATH_PREFIX: "/repo" })).toBe("/repo/");
    expect(resolvePathPrefix({ PATH_PREFIX: "/repo/" })).toBe("/repo/");
  });

  it("uses the SITE_URL pathname when PATH_PREFIX is unset", () => {
    expect(resolvePathPrefix({ SITE_URL: "https://example.com/blog/" })).toBe("/blog/");
    expect(resolvePathPrefix({ SITE_URL: "https://example.com/" })).toBe("/");
    expect(resolvePathPrefix({ SITE_URL: "not a url" })).toBe("/not a url/");
  });
});

describe("siteOrigin and siteUrl", () => {
  it("strip or keep the trailing slash", () => {
    const environment = { SITE_URL: "https://example.com/" };
    expect(siteOrigin(environment)).toBe("https://example.com");
    expect(siteUrl(environment)).toBe("https://example.com/");
  });

  it("returns empty strings when SITE_URL is missing", () => {
    expect(siteOrigin({})).toBe("");
    expect(siteUrl({})).toBe("");
  });
});

describe("absoluteHref", () => {
  it("joins a pathname onto SITE_URL", () => {
    const environment = { SITE_URL: "https://example.com/" };
    expect(absoluteHref("/resume/", environment)).toBe("https://example.com/resume/");
    expect(absoluteHref("resume/", environment)).toBe("https://example.com/resume/");
    expect(absoluteHref("", environment)).toBe("https://example.com/");
  });

  it("returns a site-root path when SITE_URL is missing", () => {
    expect(absoluteHref("/resume/", {})).toBe("/resume/");
  });
});

describe("withPathPrefix", () => {
  it("leaves root-relative hrefs unchanged when the loaded prefix is /", () => {
    expect(withPathPrefix("/js/site.js")).toBe("/js/site.js");
    expect(withPathPrefix("https://example.com/")).toBe("https://example.com/");
  });
});

describe("ROOT and SRC_ROOT", () => {
  it("point at this repo", () => {
    expect(existsSync(path.join(ROOT, "eleventy.config.ts"))).toBe(true);
    expect(SRC_ROOT).toBe(path.join(ROOT, "src"));
  });
});

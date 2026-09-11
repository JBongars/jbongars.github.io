/**
 * @jest-environment jsdom
 */
import { describe, expect, it } from "@jest/globals";
import { pathPrefix, siteUrl } from "./index";

describe("site-url", () => {
  it("prefixes paths from data-path-prefix", () => {
    document.documentElement.dataset["pathPrefix"] = "/app/";
    expect({
      root: siteUrl(),
      relative: siteUrl("js/site.js"),
      absolute: siteUrl("/js/site.js"),
      prefix: pathPrefix(),
    }).toEqual({
      root: "/app/",
      relative: "/app/js/site.js",
      absolute: "/app/js/site.js",
      prefix: "/app/",
    });
  });

  it("returns the path unchanged when the prefix is /", () => {
    document.documentElement.dataset["pathPrefix"] = "/";
    expect(siteUrl("/js/site.js")).toBe("/js/site.js");
  });

  it("defaults the prefix to / when the dataset is empty", () => {
    delete document.documentElement.dataset["pathPrefix"];
    expect(pathPrefix()).toBe("/");
    expect(siteUrl()).toBe("/");
  });

  it("reads the prefix from the document even when given an element root", () => {
    document.documentElement.dataset["pathPrefix"] = "/app/";
    expect(pathPrefix(document.body)).toBe("/app/");
  });
});

import path from "node:path";
import { describe, expect, it } from "@jest/globals";
import { computedData } from "../../_11ty/computed.ts";
import { SRC_ROOT } from "../../_11ty/paths.ts";

const computed = computedData();
const blogPath = path.join("src", "blog", "hello", "index.md");
const notePath = path.join("src", "hacklas", "enumeration", "smb.md");
const writeUpPath = path.join("src", "write-ups", "box", "index.md");
const awsPost = path.join(SRC_ROOT, "blog", "AWS_EC2_Probe", "index.md");

describe("computedData", () => {
  it("picks layouts from the content folder", () => {
    expect(computed.layout({ page: { inputPath: blogPath } })).toBe("post.njk");
    expect(computed.layout({ page: { inputPath: blogPath }, layout: "" })).toBe("post.njk");
    expect(computed.layout({ page: { inputPath: notePath } })).toBe("note.njk");
    expect(computed.layout({ page: { inputPath: blogPath }, layout: "custom.njk" })).toBe(
      "custom.njk",
    );
    expect(computed.layout({ page: { inputPath: "src/index.njk" }, layout: "base.njk" })).toBe(
      "base.njk",
    );
  });

  it("keeps an explicit title and otherwise uses the file slug for posts", () => {
    expect(computed.title({ title: "Hello", page: { inputPath: blogPath } })).toBe("Hello");
    expect(computed.title({ page: { inputPath: blogPath, fileSlug: "hello" } })).toBe("hello");
  });

  it("shows banners only on blog and write-up markdown", () => {
    expect(computed.showBanner({ page: { inputPath: blogPath } })).toBe(true);
    expect(computed.showBanner({ page: { inputPath: notePath } })).toBe(false);
  });

  it("builds note path metadata from the hacklas file path", () => {
    expect(computed.notePathParts({ page: { inputPath: notePath } })).toEqual([
      "enumeration",
      "smb",
    ]);
    expect(computed.notePath({ page: { inputPath: notePath } })).toBe("enumeration/smb");
    expect(computed.noteTags({ page: { inputPath: notePath }, note_tags: "Windows, smb" })).toEqual(
      ["enumeration", "smb", "windows"],
    );
    expect(
      computed.noteTags({ page: { inputPath: notePath }, note_tags: ["Windows", "windows"] }),
    ).toEqual(["enumeration", "smb", "windows"]);
    expect(computed.noteTags({ page: { inputPath: notePath }, note_tags: ["", "Linux"] })).toEqual([
      "enumeration",
      "smb",
      "linux",
    ]);
    expect(computed.noteTags({ page: { inputPath: notePath }, note_tags: "  ,  " })).toEqual([
      "enumeration",
      "smb",
    ]);
    expect(computed.noteTags({ page: { inputPath: blogPath } })).toBe();
    expect(computed.title({ page: { inputPath: "src/index.njk" } })).toBe();
    expect(computed.author({ page: { inputPath: notePath } })).toBe();
    expect(computed.title({ page: { inputPath: notePath, fileSlug: "smb" } })).toBeDefined();
    expect(computed.author({ page: { inputPath: notePath }, author: "Jules" })).toBe("Jules");
    expect(computed.notePathParts({ page: { inputPath: blogPath } })).toBe();
  });

  it("leaves note fields empty off the hacklas tree", () => {
    expect(computed.notePath({ page: { inputPath: blogPath } })).toBe();
    expect(computed.author({ page: { inputPath: blogPath } })).toBe();
  });

  it("resolves a post banner from banner_path", () => {
    expect(
      computed.banner({
        page: { inputPath: awsPost, url: "/blog/AWS_EC2_Probe/" },
        banner_path: "../backgrounds/satelite-dish.jpg",
      }),
    ).toBe("/blog/backgrounds/satelite-dish.jpg");
    expect(computed.banner({ page: { inputPath: notePath } })).toBe();
    expect(computed.banner({ page: { inputPath: blogPath, url: "/blog/hello/" } })).toBe();
  });

  it("uses front-matter dates when present and file dates otherwise", () => {
    const published = new Date("2026-02-01T00:00:00.000Z");
    expect(computed.date({ page: { inputPath: awsPost, date: published } })).toBe(published);

    const fallback = new Date("2020-01-01T00:00:00.000Z");
    expect(computed.date({ page: { inputPath: blogPath, date: fallback } })).toBe(fallback);
    expect(computed.date({ page: { inputPath: "src/index.njk" } })).toBe();
  });

  it("exposes lastmod, layout, and meta description helpers", () => {
    expect(computed.dateModified({ page: { inputPath: "_11ty/text.ts" } })).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(computed.layout({ page: { inputPath: writeUpPath } })).toBe("post.njk");
    expect(computed.metaDescription({ description: "  Hello.  " })).toBe("Hello.");
  });
});

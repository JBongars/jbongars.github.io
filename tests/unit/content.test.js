import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "@jest/globals";
import {
  cssDecls as cssDeclarations,
  fileCreatedDate,
  findBannerFile,
  frontMatterHasKey,
  hacklasPathParts,
  isContentMarkdown,
  isReadableFile,
  parseFrontMatterLink,
  parseHacklasMeta,
  passthroughMediaFolders,
  resolveBannerFile,
  srcFileToUrl as sourceFileToUrl,
  stripNoteChrome,
  stripWriteupChrome,
} from "../../_11ty/content.js";
import { SRC_ROOT } from "../../_11ty/paths.js";

const awsPost = path.join(SRC_ROOT, "blog", "AWS_EC2_Probe", "index.md");

describe("isContentMarkdown", () => {
  it("requires a folder segment and a .md suffix", () => {
    expect(isContentMarkdown(path.join("src", "blog", "hello", "index.md"), "blog")).toBe(true);
    expect(isContentMarkdown(path.join("src", "blog", "hello", "index.md"), "write-ups")).toBe(
      false,
    );
    expect(isContentMarkdown(path.join("src", "blog", "hello", "index.njk"), "blog")).toBe(false);
    expect(isContentMarkdown()).toBe(false);
  });
});

describe("isReadableFile", () => {
  it("is true for a file and false for a missing path", () => {
    expect(isReadableFile(path.join(SRC_ROOT, "_data", "resume.json"))).toBe(true);
    expect(isReadableFile(path.join(SRC_ROOT, "does-not-exist.json"))).toBe(false);
  });
});

describe("hacklasPathParts", () => {
  it("splits the path under /hacklas/ and drops the extension", () => {
    expect(hacklasPathParts("src/hacklas/enumeration/windows/smb.md")).toEqual([
      "enumeration",
      "windows",
      "smb",
    ]);
    expect(hacklasPathParts("src/blog/hello.md")).toEqual([]);
    expect(hacklasPathParts()).toEqual([]);
  });
});

describe("stripNoteChrome", () => {
  it("drops the leading h1, metadata paragraph, and rule", () => {
    const html = `<h1>Title</h1>
<p><strong>Author:</strong> A<br><strong>Date:</strong> 2024-01-01</p>
<hr>
<p>Body</p>`;
    expect(stripNoteChrome(html).trim()).toBe("<p>Body</p>");
  });

  it("returns empty input unchanged", () => {
    expect(stripNoteChrome("")).toBe("");
  });
});

describe("stripWriteupChrome", () => {
  it("drops a leading h2 and platform blockquote", () => {
    const html = `<h2>Box — Writeup</h2>
<blockquote><p>Platform: HTB<br>Target: 10.0.0.1</p></blockquote>
<p>Body</p>`;
    expect(stripWriteupChrome(html).trim()).toBe("<p>Body</p>");
  });
});

describe("cssDecls", () => {
  it("normalizes a CSS string and a declaration map", () => {
    expect(cssDeclarations("color: red")).toBe("color: red;");
    expect(cssDeclarations("color: red;")).toBe("color: red;");
    expect(cssDeclarations({ "background-color": "navy", "--x": "1" })).toBe(
      "background-color: navy; --x: 1;",
    );
    expect(cssDeclarations()).toBe("");
    expect(cssDeclarations(JSON.parse("null"))).toBe("");
  });

  it("strips HTML closers from values", () => {
    expect(cssDeclarations("color: red</style>")).toBe("color: redstyle>;");
  });
});

describe("parseFrontMatterLink", () => {
  it("accepts markdown, maps, and bare URLs", () => {
    expect(parseFrontMatterLink("[Docs](example.com/x)")).toEqual({
      label: "Docs",
      href: "https://example.com/x",
    });
    expect(parseFrontMatterLink({ url: "https://github.com/a", label: "GitHub" })).toEqual({
      href: "https://github.com/a",
      label: "GitHub",
    });
    expect(parseFrontMatterLink("github.com/a")).toEqual({
      href: "https://github.com/a",
      label: "github.com/a",
    });
    expect(parseFrontMatterLink("")).toEqual({ href: "", label: "" });
  });
});

describe("parseHacklasMeta", () => {
  it("returns an empty object when the file is missing", () => {
    expect(parseHacklasMeta()).toEqual({});
    expect(parseHacklasMeta(path.join(SRC_ROOT, "missing-note.md"))).toEqual({});
  });

  it("reads title, author, and calendar date from note chrome", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "note-meta-"));
    try {
      const notePath = path.join(directory, "note.md");
      writeFileSync(
        notePath,
        "# Hello\n**Author:** Ada\\\n**Date:** written 2024-06-07\n---\nbody\n",
      );
      const metadata = parseHacklasMeta(notePath);
      expect(metadata.title).toBe("Hello");
      expect(metadata.author).toBe("Ada");
      expect(metadata.date.toISOString().slice(0, 10)).toBe("2024-06-07");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("findBannerFile", () => {
  it("returns the first banner.* filename in a directory", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "banner-"));
    try {
      expect(findBannerFile(directory)).toBe();
      writeFileSync(path.join(directory, "banner.webp"), "");
      expect(findBannerFile(directory)).toBe("banner.webp");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("frontMatterHasKey", () => {
  it("is true only when the key is present in YAML", () => {
    expect(frontMatterHasKey(awsPost, "date")).toBe(true);
    expect(frontMatterHasKey(awsPost, "nope")).toBe(false);
    expect(frontMatterHasKey(path.join(SRC_ROOT, "missing.md"), "date")).toBe(false);
  });
});

describe("resolveBannerFile", () => {
  it("resolves a path under src/ and rejects escapes", () => {
    const banner = resolveBannerFile(awsPost, "../backgrounds/satelite-dish.jpg");
    expect(banner.endsWith(`${path.sep}satelite-dish.jpg`)).toBe(true);
    expect(resolveBannerFile(awsPost, "/blog/backgrounds/satelite-dish.jpg")).toBe(banner);
    expect(resolveBannerFile(awsPost, "")).toBe();
    expect(resolveBannerFile(awsPost, "../../package.json")).toBe();
  });
});

describe("fileCreatedDate", () => {
  it("returns a Date for an existing file", () => {
    const created = fileCreatedDate(path.join(SRC_ROOT, "_data", "resume.json"));
    expect(created.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("passthroughMediaFolders", () => {
  it("does nothing when the content folder is missing", () => {
    const copies = [];
    passthroughMediaFolders(
      {
        addPassthroughCopy(copy) {
          copies.push(copy);
        },
      },
      "does-not-exist",
    );
    expect(copies).toEqual([]);
  });

  it("registers passthrough copies for write-up banners", () => {
    const copies = [];
    passthroughMediaFolders(
      {
        addPassthroughCopy(copy) {
          copies.push(copy);
        },
      },
      "write-ups",
    );
    expect(copies.length).toBeGreaterThan(0);
    expect(
      copies.some((copy) =>
        Object.values(copy).some((destination) => /hackthebox\.png$/.test(destination)),
      ),
    ).toBe(true);
  });
});

describe("srcFileToUrl", () => {
  it("returns a root-relative URL under src/", () => {
    expect(sourceFileToUrl(path.join(SRC_ROOT, "img", "hero.jpg"))).toBe("/img/hero.jpg");
  });
});

import path from "node:path";
import { describe, expect, it } from "@jest/globals";
import { buildJsonLd, pageDescription } from "../../_11ty/jsonld.ts";
import personResume from "../../src/_data/resume.json" with { type: "json" };

const blogPost = path.join("src", "blog", "hello", "index.md");
const writeUp = path.join("src", "write-ups", "box", "index.md");

describe("pageDescription", () => {
  it("uses an explicit description when present", () => {
    expect(pageDescription({ description: "  Hello.  ", page: { url: "/" } })).toBe("Hello.");
  });

  it("builds fallback copy for known routes", () => {
    expect(pageDescription({ page: { url: "/" } })).toContain(personResume.name);
    expect(pageDescription({ page: { url: "/resume/" } })).toContain("Resume");
    expect(pageDescription({ page: { url: "/blog/" } })).toContain("Blog");
    expect(pageDescription({ page: { url: "/write-ups/" } })).toContain("write-up");
    expect(
      pageDescription({ page: { url: "/blog/hello/", inputPath: blogPost }, title: "Hello" }),
    ).toContain("blog post");
    expect(
      pageDescription({ page: { url: "/write-ups/box/", inputPath: writeUp }, title: "Box" }),
    ).toContain("write-up");
    expect(pageDescription({ page: { url: "/unknown/" } })).toContain(personResume.title);
  });
});

describe("buildJsonLd", () => {
  it("emits a ProfilePage graph for home and resume", () => {
    expect(buildJsonLd({ page: { url: "/" } })["@type"]).toBe("ProfilePage");
    expect(buildJsonLd({ page: { url: "/resume/" } })["@type"]).toBe("ProfilePage");
  });

  it("emits a CollectionPage with an ItemList for blog and write-ups indexes", () => {
    const blog = buildJsonLd({
      page: { url: "/blog/" },
      collections: { blog: [{ url: "/blog/hello/", data: { title: "Hello" }, fileSlug: "hello" }] },
    });
    expect(blog["@type"]).toBe("CollectionPage");
    expect(blog.mainEntity.numberOfItems).toBe(1);
    expect(blog.mainEntity.itemListElement[0].name).toBe("Hello");
  });

  it("emits BlogPosting or TechArticle for markdown posts", () => {
    const post = buildJsonLd({
      page: { url: "/blog/hello/", inputPath: blogPost },
      title: "Hello",
      date: new Date("2024-01-02T12:00:00.000Z"),
      dateModified: "2024-02-03",
    });
    expect(post["@type"]).toBe("BlogPosting");
    expect(post.datePublished).toBe("2024-01-02");
    expect(post.dateModified).toBe("2024-02-03");
    expect(
      buildJsonLd({
        page: { url: "/write-ups/box/", inputPath: writeUp },
        title: "Box",
        dateModified: new Date("2024-03-04T12:00:00.000Z"),
      })["@type"],
    ).toBe("TechArticle");
  });

  it("falls back to a Person node for unknown routes", () => {
    const writeUps = buildJsonLd({
      page: { url: "/write-ups/" },
      collections: {
        writeUps: [{ url: "/write-ups/box/", data: { title: "Box" }, fileSlug: "box" }],
      },
    });
    expect(writeUps["@type"]).toBe("CollectionPage");
    expect(writeUps.mainEntity.itemListElement[0].name).toBe("Box");
    expect(buildJsonLd({ page: { url: "/unknown/" } })["@type"]).toBe("Person");
  });

  it("includes profile URLs when SITE_URL is set", () => {
    const previous = process.env["SITE_URL"];
    process.env["SITE_URL"] = "https://example.test";
    try {
      const person = buildJsonLd({ page: { url: "/unknown/" } });
      expect(person.url).toBe("https://example.test/");
      expect(person.image).toBe("https://example.test/img/profile.jpg");
      const post = buildJsonLd({
        page: { url: "/blog/hello/", inputPath: blogPost },
        title: "Hello",
      });
      expect(post.image).toBe("https://example.test/img/profile.jpg");
    } finally {
      if (previous === undefined) {
        delete process.env["SITE_URL"];
      } else {
        process.env["SITE_URL"] = previous;
      }
    }
  });
});

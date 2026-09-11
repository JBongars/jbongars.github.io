import path from "node:path";
import { describe, expect, it } from "@jest/globals";
import MarkdownIt from "markdown-it";
import { buildToc, configureMarkdown, warmPrismLanguages } from "../../_11ty/markdown.ts";

function renderMarkdown(source, environment = {}) {
  const markdown = new MarkdownIt();
  configureMarkdown(markdown);
  return markdown.render(source, environment);
}

describe("buildToc", () => {
  it("returns empty when there are fewer than two headings with ids", () => {
    expect(buildToc("")).toBe("");
    expect(buildToc('<h2 id="one">One</h2>')).toBe("");
  });

  it("lists h2–h4 headings that already have ids", () => {
    const html = `
      <h2 id="alpha">Alpha</h2>
      <p>x</p>
      <h3 id="beta">Beta &amp; Co</h3>
      <h4 id="gamma">Gamma</h4>
    `;
    const toc = buildToc(html);
    expect(toc.startsWith('<ul class="toc__list">')).toBe(true);
    expect(toc).toContain('href="#alpha"');
    expect(toc).toContain("Beta &amp; Co");
    expect(toc).toContain('href="#gamma"');
  });
});

describe("configureMarkdown", () => {
  it("demotes headings, assigns ids, and highlights known languages", () => {
    warmPrismLanguages();
    const html = renderMarkdown(
      ["# Title", "", "## Section", "", "```js", "const n = 1;", "```"].join("\n"),
    );
    expect(html).toContain('<h2 id="title">Title</h2>');
    expect(html).toContain('<h3 id="section">Section</h3>');
    expect(html).toContain('class="language-javascript"');
    expect(html).toContain("data-code-block");
    expect(html).toContain("token");
  });

  it("escapes unknown fences and does not render raw HTML", () => {
    const html = renderMarkdown("```nope\n<script>\n```\n\n<img src=x>");
    expect(html).toContain("language-nope");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
  });

  it("rewrites markdown links and marks external ones", () => {
    const html = renderMarkdown(
      "[note](./other.md) [root](/hacklas/foo.md) [out](https://example.com/a)",
    );
    expect(html).toContain('href="../other/"');
    expect(html).toContain('href="/hacklas/foo/"');
    expect(html).toContain('href="https://example.com/a"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("turns task items and full-width images into marked-up HTML", () => {
    const html = renderMarkdown("- [x] Done\n\n!![Alt](/img/hero.jpg)");
    expect(html).toContain("task-list");
    expect(html).toContain("task-list-item__checkbox");
    expect(html).toContain("data-task-checkbox");
    expect(html).toContain("data-task-item");
    expect(html).toContain('checked=""');
    expect(html).toContain("prose-img--full");
    expect(html).toContain("data-lightbox");
  });

  it("keeps hacklas heading levels and softens long callouts", () => {
    const notePath = path.join("src", "hacklas", "enumeration", "smb.md");
    const long = "A".repeat(80);
    const html = renderMarkdown(`# Keep\n\n#### ${long}`, {
      page: { inputPath: notePath },
    });
    expect(html).toContain('<h1 id="keep">Keep</h1>');
    expect(html).toContain("<strong>");
    expect(html).not.toContain("<h4");
  });

  it("aliases language tokens and highlights an empty fence as text", () => {
    expect(renderMarkdown("```\nplain\n```")).toContain("language-text");
    expect(renderMarkdown("```xml\n<root/>\n```")).toContain("language-markup");
  });

  it("escapes a language Prism cannot load", () => {
    const html = renderMarkdown("```not-a-real-prism-lang\ncode\n```");
    expect(html).toContain("language-not-a-real-prism-lang");
    expect(html).toContain("code");
  });

  it("rewrites query suffixes, hash links, mailto, and non-markdown paths", () => {
    const html = renderMarkdown(
      "[note](./other.md?x=1) [here](#section) [mail](mailto:a@b.test) [img](./pic.png)",
    );
    expect(html).toContain("other/?x=1");
    expect(html).toContain('href="#section"');
    expect(html).toContain("mailto:a@b.test");
    expect(html).toContain("./pic.png");
  });

  it("uniques duplicate heading slugs and leaves unchecked tasks unchecked", () => {
    const html = renderMarkdown("## Same\n\n## Same\n\n- [ ] Todo");
    expect(html).toContain('id="same"');
    expect(html).toContain('id="same-1"');
    expect(html).toContain("task-list-item");
    expect(html).not.toContain('checked=""');
  });

  it("keeps leftover text before a full-width image marker", () => {
    const html = renderMarkdown("See !![Alt](/img/hero.jpg)");
    expect(html).toContain("See");
    expect(html).toContain("prose-img--full");
  });

  it("rewrites an empty markdown href and a telephone link", () => {
    const html = renderMarkdown("[empty]() [call](tel:+15551212) [ok](./note.md#frag)");
    expect(html).toContain('href=""');
    expect(html).toContain("tel:+15551212");
    expect(html).toContain("note/#frag");
  });

  it("leaves ordinary list items and h6 headings in the document", () => {
    const html = renderMarkdown("- hello\n\n###### Deep");
    expect(html).toContain("<li>");
    expect(html).toContain("hello");
    expect(html).toContain("<h6");
  });

  it("assigns an id to an empty heading and keeps a tight task list", () => {
    const html = renderMarkdown("##\n\n- [ ] one\n- [x] two");
    expect(html).toContain("<h3");
    expect(html).toContain("task-list");
  });

  it("treats punctuation-only fences as text and rewrites unsuffixed markdown paths", () => {
    expect(renderMarkdown("```!!!\nplain\n```")).toContain("language-text");
    expect(renderMarkdown("[n](note.md)")).toContain("../note/");
    expect(renderMarkdown("[n](/root.md)")).toContain("/root/");
    expect(renderMarkdown("[n](./dir/.md)")).toContain("../dir/");
    expect(renderMarkdown("[n](/rooted/.md)")).toContain("/rooted/");
  });

  it("skips empty TOC titles and still lists the rest", () => {
    const toc = buildToc(`
      <h2 id="empty"></h2>
      <h2 id="alpha">Alpha</h2>
      <h3 id="beta">Beta</h3>
    `);
    expect(toc).toContain("Alpha");
    expect(toc).toContain("Beta");
    expect(toc).not.toContain('href="#empty"');
  });

  it("does not demote headings already at h6", () => {
    const html = renderMarkdown("###### Deepest");
    expect(html).toContain("<h6");
  });
});

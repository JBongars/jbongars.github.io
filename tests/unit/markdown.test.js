import path from "node:path";
import { describe, expect, it } from "@jest/globals";
import MarkdownIt from "markdown-it";
import { buildToc, configureMarkdown, warmPrismLanguages } from "../../_11ty/markdown.js";

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
    expect(html).toContain('checked=""');
    expect(html).toContain("prose-img--full");
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
});

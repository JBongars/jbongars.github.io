import { describe, expect, it } from "@jest/globals";
import { click, keydown, runClientScript, stubClipboard, tree } from "./helpers.js";

const markup = `<!doctype html><html><body>
<article class="prose">
<pre class="language-js"><code class="language-js">const ready = true;</code></pre>
<p>Use <code>ready</code> in the shell.</p>
</article>
</body></html>`;

describe("code-blocks.js", () => {
  it("wraps prose pre blocks and marks inline code as copyable", () => {
    const { window } = runClientScript("code-blocks.js", markup, { innerHeight: 800 });
    expect(tree(window.document)).toMatchSnapshot();
  });

  it("opens and closes fullscreen from the toolbar", () => {
    const { window } = runClientScript("code-blocks.js", markup, { innerHeight: 800 });
    click(window, window.document.querySelector('[aria-label="Open code fullscreen"]'));
    expect(tree(window.document)).toMatchSnapshot();

    keydown(window, window.document, "Escape");
    expect(tree(window.document)).toMatchSnapshot();
  });

  it("marks the copy control as copied after a click", async () => {
    const { window } = runClientScript("code-blocks.js", markup, {
      innerHeight: 800,
      setup: stubClipboard,
    });
    click(window, window.document.querySelector('[aria-label="Copy code"]'));
    await Promise.resolve();
    const copy = window.document.querySelector('[aria-label="Copied"], [aria-label="Copy code"]');
    expect({
      label: copy.getAttribute("aria-label"),
      copiedClass: copy.className,
    }).toMatchSnapshot();
  });
});

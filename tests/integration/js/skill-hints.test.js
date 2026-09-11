import { describe, expect, it } from "@jest/globals";
import { click, keydown, runClientScript, stubMatchMedia, tree } from "./helpers.js";

const markup = `<!doctype html><html><body>
<a class="tag--link" href="#linux" data-hint="A skill.">Linux</a>
</body></html>`;

describe("skill-hints.js", () => {
  it("opens a hint panel on click when hover is unavailable, then closes it", () => {
    const { window } = runClientScript("skill-hints.js", markup, {
      setup(domWindow) {
        stubMatchMedia(domWindow, (query) => query === "(hover: none)");
      },
    });
    const tag = window.document.querySelector("a.tag--link");
    const open = click(window, tag);
    expect(open.defaultPrevented).toBe(true);
    expect(tree(window.document)).toMatchSnapshot();

    click(window, window.document.querySelector(".skill-hint__close"));
    expect(tree(window.document)).toMatchSnapshot();

    click(window, tag);
    keydown(window, window.document, "Escape");
    expect(window.document.querySelector(".skill-hint").hidden).toBe(true);
  });
});

import { describe, expect, it } from "@jest/globals";
import { click, runClientScript } from "./helpers.js";

const markup = `<!doctype html><html><body>
<a href="#main" data-back>Back</a>
</body></html>`;

describe("back-button.js", () => {
  it("calls history.back on a plain click, not a modified click", () => {
    const { window } = runClientScript("back-button.js", markup);
    const calls = [];
    window.history.back = function back() {
      calls.push("back");
    };
    const link = window.document.querySelector("a[data-back]");

    const modified = click(window, link, { metaKey: true });
    const plain = click(window, link);
    expect({
      modifiedPrevented: modified.defaultPrevented,
      plainPrevented: plain.defaultPrevented,
      calls,
    }).toMatchSnapshot();
  });
});

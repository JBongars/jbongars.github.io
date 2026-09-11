import { describe, expect, it } from "@jest/globals";
import { runClientScript } from "./helpers.js";

const markup = `<!doctype html><html><body>
<input type="checkbox" id="theme-toggle">
</body></html>`;

describe("theme-init.js", () => {
  it("leaves the toggle off when localStorage has no theme", () => {
    const { window } = runClientScript("theme-init.js", markup);
    expect({ checked: window.document.querySelector("#theme-toggle").checked }).toMatchSnapshot();
  });

  it("checks the toggle when localStorage theme is light", () => {
    const { window } = runClientScript("theme-init.js", markup, {
      setup(win) {
        win.localStorage.setItem("theme", "light");
      },
    });
    expect({ checked: window.document.querySelector("#theme-toggle").checked }).toMatchSnapshot();
  });
});

import { describe, expect, it } from "@jest/globals";
import { runClientScript } from "./helpers.js";

const markup = `<!doctype html><html><body>
<input type="checkbox" id="theme-toggle">
<main id="main"><p>Hello</p></main>
</body></html>`;

describe("site.js", () => {
  it("applies a stored light theme, then persists a toggle to dark", () => {
    const { window } = runClientScript("site.js", markup, {
      setup(domWindow) {
        domWindow.localStorage.setItem("theme", "light");
      },
    });
    const toggle = window.document.querySelector("#theme-toggle");
    expect(toggle.checked).toBe(true);

    toggle.checked = false;
    toggle.dispatchEvent(new window.Event("change", { bubbles: true }));
    expect({
      checked: toggle.checked,
      theme: window.localStorage.getItem("theme"),
    }).toMatchSnapshot();
  });
});

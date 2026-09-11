import { describe, expect, it } from "@jest/globals";
import { runClientScript, tree } from "./helpers.js";

const markup = `<!doctype html><html><head></head><body>
<input type="checkbox" id="theme-toggle">
<section
  data-comments
  data-repo="owner/repo"
  data-repo-id="R_repo"
  data-category="Announcements"
  data-category-id="C_cat"
  data-term="a-post"
>
  <div data-comments-mount></div>
</section>
</body></html>`;

describe("comments.js", () => {
  it("injects the Giscus client script and a CSS decoy", () => {
    const { window } = runClientScript("comments.js", markup);
    expect(tree(window.document)).toMatchSnapshot();
  });

  it("posts a light theme to the widget when the toggle changes", () => {
    const { window } = runClientScript("comments.js", markup);
    const iframe = window.document.createElement("iframe");
    iframe.className = "giscus-frame";
    window.document.querySelector("[data-comments-mount]").append(iframe);

    const messages = [];
    iframe.contentWindow.postMessage = function postMessage(data, origin) {
      messages.push({ data, origin });
    };

    const toggle = window.document.querySelector("#theme-toggle");
    toggle.checked = true;
    toggle.dispatchEvent(new window.Event("change", { bubbles: true }));
    expect(messages).toMatchSnapshot();
  });
});

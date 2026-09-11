import { describe, expect, it } from "@jest/globals";
import { click, keydown, runClientScript, tree } from "./helpers.js";

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const markup = `<!doctype html><html><body>
<div class="prose">
  <img src="${PIXEL}" alt="Hero">
  <a href="#resume"><img src="${PIXEL}" alt="Linked"></a>
</div>
</body></html>`;

describe("image-lightbox.js", () => {
  it("marks standalone prose images zoomable and leaves linked images alone", () => {
    const { window } = runClientScript("image-lightbox.js", markup);
    expect(tree(window.document)).toMatchSnapshot();
  });

  it("does not open from a linked image", () => {
    const { window } = runClientScript("image-lightbox.js", markup);
    click(window, window.document.querySelector('a img[alt="Linked"]'));
    expect(window.document.querySelector(".img-lightbox")).toBeNull();
  });

  it("opens the lightbox on click and closes from the control and Escape", () => {
    const { window } = runClientScript("image-lightbox.js", markup);
    click(window, window.document.querySelector('.prose > img[alt="Hero"]'));
    expect(tree(window.document)).toMatchSnapshot();

    click(window, window.document.querySelector('[aria-label="Close image"]'));
    expect(window.document.querySelector(".img-lightbox")).toBeNull();

    keydown(window, window.document.querySelector('.prose > img[alt="Hero"]'), "Enter");
    expect(window.document.querySelector(".img-lightbox")).toBeTruthy();

    keydown(window, window.document, "Escape");
    expect(tree(window.document)).toMatchSnapshot();
  });
});

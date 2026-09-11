import { describe, expect, it, jest } from "@jest/globals";
import { click, fillInput, runClientScript, tree } from "./helpers.js";

const markup = `<!doctype html><html><body>
<ul data-sortable-list>
  <li data-tags="linux,ssh" data-title="zebra" data-date="2024-01-01">Zebra</li>
  <li data-tags="linux" data-title="alpha" data-date="2025-06-01">Alpha</li>
</ul>
</body></html>`;

describe("booru-search.js", () => {
  it("mounts list tools onto data-sortable-list", () => {
    const { window } = runClientScript("booru-search.js", markup);
    expect(tree(window.document)).toMatchSnapshot();
  });

  it("sorts by name, then filters to a committed tag", () => {
    jest.useFakeTimers();
    try {
      const { window } = runClientScript("booru-search.js", markup);
      const sortButtons = window.document.querySelectorAll(".list-sort__btn");
      click(window, sortButtons[1]);

      const input = window.document.querySelector(".tag-search__input");
      fillInput(window, input, "ssh");
      jest.advanceTimersByTime(200);
      expect(tree(window.document)).toMatchSnapshot();

      click(window, window.document.querySelector(".tag-search__option"));
      expect(tree(window.document)).toMatchSnapshot();
    } finally {
      jest.useRealTimers();
    }
  });
});

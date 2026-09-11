/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom/jest-globals";
import userEvent from "@testing-library/user-event";
import { init, SKILL_HINT_HOOK } from "../../../src/js/skill-hints";
import { firstPageWith, loadIntoDocument } from "./helpers";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
});

describe("skill hints on built pages", () => {
  it("opens a hint from a resume skill tag when hover is unavailable", async () => {
    loadIntoDocument(firstPageWith(SKILL_HINT_HOOK));
    teardowns.push(
      init(document, {
        matchMedia: (query) => ({ matches: query === "(hover: none)" }),
      }),
    );
    const tags = screen.getAllByRole("link").filter((link) => Boolean(link.dataset["hint"]));
    expect(tags.length).toBeGreaterThan(0);
    await userEvent.setup().click(tags[0]!);

    expect(screen.getByRole("status")).toBeVisible();
  });
});

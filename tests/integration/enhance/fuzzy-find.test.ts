/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { FUZZY_FIND_HOOK, init } from "../../../src/js/fuzzy-find";
import { firstPageWith, loadIntoDocument } from "./helpers";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
});

describe("fuzzy-find on built pages", () => {
  it("filters notes when the search field is typed", async () => {
    loadIntoDocument(firstPageWith(FUZZY_FIND_HOOK));
    teardowns.push(init(document));

    await userEvent.setup().type(screen.getByRole("searchbox"), "nmap");

    expect(screen.getByRole("option", { name: /nmap/i })).toBeVisible();
    expect(screen.queryByRole("option", { name: /cyberchef/i })).not.toBeInTheDocument();
  });
});

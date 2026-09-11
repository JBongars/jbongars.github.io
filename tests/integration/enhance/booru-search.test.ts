/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { init, SORTABLE_LIST_HOOK } from "../../../src/js/booru-search";
import { firstPageWith, loadIntoDocument } from "./helpers";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
});

describe("booru-search on built pages", () => {
  it("mounts list tools and sorts the listing", async () => {
    loadIntoDocument(firstPageWith(SORTABLE_LIST_HOOK));
    teardowns.push(init(document));

    expect(screen.getByRole("group", { name: "Sort posts" })).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: /^name$/i }));

    expect(screen.getByRole("button", { name: /name/i })).toHaveAttribute("aria-pressed", "true");
  });
});

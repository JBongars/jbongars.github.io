/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom/jest-globals";
import userEvent from "@testing-library/user-event";
import { init, LIGHTBOX_HOOK } from "../../../src/js/image-lightbox";
import { firstPageWith, loadIntoDocument } from "./helpers";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
});

describe("image lightbox on built pages", () => {
  it("opens a dialog from the first lightbox image", async () => {
    loadIntoDocument(firstPageWith(LIGHTBOX_HOOK));
    teardowns.push(init(document));
    const images = screen
      .getAllByRole("button")
      .filter((node) => node.dataset["lightbox"] !== undefined);
    expect(images.length).toBeGreaterThan(0);

    await userEvent.setup().click(images[0]!);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

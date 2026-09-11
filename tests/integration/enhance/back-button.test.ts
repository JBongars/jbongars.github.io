/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { BACK_BUTTON_HOOK, init } from "../../../src/js/back-button";
import { firstPageWith, loadIntoDocument } from "./helpers";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
});

describe("back button on built pages", () => {
  it("intercepts the back link from the template", async () => {
    loadIntoDocument(firstPageWith(BACK_BUTTON_HOOK));
    const calls: string[] = [];
    teardowns.push(
      init(document, {
        history: {
          back() {
            calls.push("back");
          },
        },
      }),
    );

    await userEvent.setup().click(screen.getByRole("link", { name: "← Back" }));

    expect(calls).toEqual(["back"]);
  });
});

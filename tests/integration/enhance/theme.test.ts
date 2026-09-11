/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { init, THEME_TOGGLE_HOOK } from "../../../src/js/theme";
import { firstPageWith, loadIntoDocument } from "./helpers";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
});

describe("theme on built pages", () => {
  it("persists the header toggle from the template hook", async () => {
    loadIntoDocument(firstPageWith(THEME_TOGGLE_HOOK));
    const values: Record<string, string> = {};
    teardowns.push(
      init(document, {
        storage: {
          getItem(key) {
            return values[key];
          },
          setItem(key, value) {
            values[key] = value;
          },
        },
      }),
    );

    await userEvent
      .setup()
      .click(screen.getByRole("checkbox", { name: /toggle light and dark mode/i }));

    expect(values["theme"]).toBe("light");
  });
});

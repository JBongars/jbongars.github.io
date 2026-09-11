/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { init } from "../../../src/js/hacklas/hacklas-help";
import { firstPageWith, loadIntoDocument } from "./helpers";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
  document.documentElement.classList.remove("shortcuts-open", "disclaimer-open");
});

function desktopList(): Pick<MediaQueryList, "matches" | "addEventListener"> {
  return {
    matches: true,
    addEventListener() {
      /*
       * built-page tests stay on a desktop breakpoint
       */
    },
  };
}

describe("hacklas help on built pages", () => {
  it("mounts the help button on the Hacklas index and opens the dialog", async () => {
    loadIntoDocument(firstPageWith("[data-fuzzy-find]"));
    const disclaimer = screen.getByRole("dialog", { name: "Disclaimer" });
    disclaimer.hidden = true;
    teardowns.push(init(document, { matchMediaList: desktopList }));

    expect(screen.getByRole("button", { name: "Hacklas keyboard shortcuts" })).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Hacklas keyboard shortcuts" }));

    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
    expect(screen.getByText("Go to Hacklas")).toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { CODE_BLOCK_HOOK, init } from "../../../src/js/code-blocks";
import { firstPageWith, loadIntoDocument } from "./helpers";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
});

describe("code blocks on built pages", () => {
  it("copies fence text from the template hook", async () => {
    loadIntoDocument(firstPageWith(CODE_BLOCK_HOOK));
    const texts: string[] = [];
    teardowns.push(
      init(document, {
        clipboard: {
          writeText(text: string): Promise<void> {
            texts.push(text);
            return Promise.resolve();
          },
        },
      }),
    );

    await userEvent.setup().click(screen.getAllByRole("button", { name: "Copy code" })[0]!);

    expect(texts.length).toBeGreaterThan(0);
  });
});

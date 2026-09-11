/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { COMMENTS_HOOK, init } from "../../../src/js/comments";
import { firstPageWith, loadIntoDocument } from "./helpers";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
});

describe("comments on built pages", () => {
  it("injects Giscus into a post comments mount", () => {
    loadIntoDocument(firstPageWith(COMMENTS_HOOK));
    teardowns.push(init(document));

    expect(document.querySelector("script[src*='giscus.app/client.js']")).toBeTruthy();
  });
});

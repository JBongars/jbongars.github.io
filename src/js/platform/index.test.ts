/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  clipboardWrite,
  fetchSameOrigin,
  matchMediaQuery,
  mediaQueryList,
  safeLocalStorage,
} from "./index";
import type { FetchResponse } from "./types";

const originalMatchMedia = Object.getOwnPropertyDescriptor(globalThis, "matchMedia");
const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
const originalClipboard = navigator.clipboard;

function restoreDescriptor(
  target: object,
  key: string,
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(target, key, descriptor);
    return;
  }
  Reflect.deleteProperty(target, key);
}

afterEach(() => {
  restoreDescriptor(globalThis, "matchMedia", originalMatchMedia);
  restoreDescriptor(globalThis, "fetch", originalFetch);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: originalClipboard,
  });
});

describe("matchMediaQuery", () => {
  it("reports the native matchMedia result", () => {
    Object.defineProperty(globalThis, "matchMedia", {
      configurable: true,
      writable: true,
      value: () => ({ matches: true }),
    });

    expect(matchMediaQuery("(prefers-reduced-motion: reduce)")).toEqual({ matches: true });
  });

  it("falls back to no match when matchMedia throws", () => {
    Object.defineProperty(globalThis, "matchMedia", {
      configurable: true,
      writable: true,
      value() {
        throw new Error("blocked");
      },
    });

    expect(matchMediaQuery("(hover: none)")).toEqual({ matches: false });
  });
});

describe("mediaQueryList", () => {
  it("returns the native media query list", () => {
    const list = {
      matches: true,
      addEventListener() {
        /*
         * unused
         */
      },
    };
    Object.defineProperty(globalThis, "matchMedia", {
      configurable: true,
      writable: true,
      value: () => list,
    });

    expect(mediaQueryList("(min-width: 48rem)")).toBe(list);
  });

  it("returns a no-op list when matchMedia throws", () => {
    Object.defineProperty(globalThis, "matchMedia", {
      configurable: true,
      writable: true,
      value() {
        throw new Error("blocked");
      },
    });

    const list = mediaQueryList("(min-width: 48rem)");
    expect(list.matches).toBe(false);
    expect(() => {
      list.addEventListener("change", () => {
        /*
         * unused
         */
      });
    }).not.toThrow();
  });
});

describe("safeLocalStorage", () => {
  it("wraps getItem so missing keys are undefined", () => {
    localStorage.clear();
    const storage = safeLocalStorage();
    expect(storage).toBeDefined();
    expect(storage?.getItem("missing")).toBeUndefined();

    storage?.setItem("theme", "light");
    expect(storage?.getItem("theme")).toBe("light");
  });

  it("returns undefined when storage is blocked", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(safeLocalStorage()).toBeUndefined();
  });
});

describe("clipboardWrite", () => {
  it("writes through navigator.clipboard", async () => {
    const writeText = jest.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    await clipboardWrite().writeText("copied");

    expect(writeText).toHaveBeenCalledWith("copied");
  });
});

describe("fetchSameOrigin", () => {
  it("calls fetch with same-origin credentials", async () => {
    const response: FetchResponse = {
      ok: true,
      status: 200,
      text() {
        return Promise.resolve("");
      },
    };
    const fetchMock = jest.fn(() => Promise.resolve(response));
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    await expect(fetchSameOrigin("/resume/")).resolves.toBe(response);
    expect(fetchMock).toHaveBeenCalledWith("/resume/", {
      credentials: "same-origin",
    });
  });

  it("lets the caller override request init", async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text() {
          return Promise.resolve("");
        },
      }),
    );
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });
    const signal = new AbortController().signal;

    await fetchSameOrigin("/blog/", { method: "GET", signal });

    expect(fetchMock).toHaveBeenCalledWith("/blog/", {
      credentials: "same-origin",
      method: "GET",
      signal,
    });
  });
});

/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { registerModules } from "./index";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
});

describe("lifecycle", () => {
  it("inits modules, tears them down before navigate, and inits again after", () => {
    const calls: string[] = [];
    teardowns.push(
      registerModules([
        {
          init() {
            calls.push("init");
            return () => {
              calls.push("stop");
            };
          },
        },
      ]),
    );

    expect(calls).toEqual(["init"]);

    document.dispatchEvent(new Event("site:beforenavigate"));
    expect(calls).toEqual(["init", "stop"]);

    document.dispatchEvent(new Event("site:navigated"));
    expect(calls).toEqual(["init", "stop", "init"]);
  });

  it("stops listening after teardown", () => {
    const calls: string[] = [];
    const stop = registerModules([
      {
        init() {
          calls.push("init");
          return () => {
            calls.push("stop");
          };
        },
      },
    ]);
    stop();
    calls.length = 0;

    document.dispatchEvent(new Event("site:beforenavigate"));
    document.dispatchEvent(new Event("site:navigated"));

    expect(calls).toEqual([]);
  });
});

import { describe, expect, it } from "@jest/globals";
import { gitLastmodDay, isoDay } from "../../_11ty/git.ts";

describe("isoDay", () => {
  it("returns YYYY-MM-DD for Date and ISO strings", () => {
    expect(isoDay(new Date("2024-03-15T12:00:00.000Z"))).toBe("2024-03-15");
    expect(isoDay("2024-03-15T08:11:00+08:00")).toBe("2024-03-15");
  });

  it("returns a missing value for empty or unparseable input", () => {
    expect(isoDay()).toBe();
    expect(isoDay("")).toBe();
    expect(isoDay("not-a-date")).toBe();
    expect(isoDay(new Date("nope"))).toBe();
  });
});

describe("gitLastmodDay", () => {
  it("returns a calendar day for a tracked source file", () => {
    expect(gitLastmodDay("_11ty/text.js")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns a missing value when the path is empty", () => {
    expect(gitLastmodDay()).toBe();
  });
});

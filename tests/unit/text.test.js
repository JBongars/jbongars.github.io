import { describe, expect, it } from "@jest/globals";
import {
  escapeHtml,
  formatResumeDate,
  plainSummary,
  unescapeHtml,
  xmlEscape,
} from "../../_11ty/text.js";

describe("xmlEscape", () => {
  it("escapes XML special characters", () => {
    expect(xmlEscape(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;");
  });

  it("treats missing values as empty", () => {
    expect(xmlEscape()).toBe("");
    expect(xmlEscape(JSON.parse("null"))).toBe("");
  });

  it("stringifies other values", () => {
    expect(xmlEscape(0)).toBe("0");
    expect(xmlEscape("&amp;")).toBe("&amp;amp;");
  });
});

describe("escapeHtml", () => {
  it("escapes HTML special characters but not apostrophes", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;'");
  });

  it("stringifies missing values as the words undefined and null", () => {
    expect(escapeHtml()).toBe("undefined");
    expect(escapeHtml(JSON.parse("null"))).toBe("null");
  });
});

describe("unescapeHtml", () => {
  it("decodes named, decimal, and hex entities", () => {
    expect(unescapeHtml("&amp;&lt;&gt;&quot;&#39;&apos;&#65;&#x42;")).toBe("&<>\"''AB");
  });

  it("decodes &amp; last so &amp;lt; stays a less-than entity", () => {
    expect(unescapeHtml("&amp;lt;")).toBe("&lt;");
  });
});

describe("plainSummary", () => {
  it("strips tags, scripts, and styles to a single line", () => {
    expect(
      plainSummary(`<p>Hello</p><script>alert(1)</script><style>p{color:red}</style><b>world</b>`),
    ).toBe("Hello world");
  });

  it("truncates on a word boundary and appends an ellipsis", () => {
    const words = Array.from({ length: 40 }, (_, index) => `word${index}`).join(" ");
    const summary = plainSummary(words, 20);
    expect(summary.endsWith("…")).toBe(true);
    expect(summary.length).toBeLessThanOrEqual(21);
  });

  it("returns the full text when it fits", () => {
    expect(plainSummary("<p>Short</p>")).toBe("Short");
  });
});

describe("formatResumeDate", () => {
  it("formats present, year-month, and empty values", () => {
    expect(formatResumeDate("present")).toBe("Present");
    expect(formatResumeDate("2024-03")).toBe("Mar 2024");
    expect(formatResumeDate("")).toBe("");
    expect(formatResumeDate()).toBe("");
    expect(formatResumeDate(JSON.parse("null"))).toBe("");
  });

  it("normalizes dashes and leaves unknown strings alone", () => {
    expect(formatResumeDate("2020-2021")).toBe("2020 – 2021");
    expect(formatResumeDate("2024-13")).toBe("2024 – 13");
    expect(formatResumeDate("Summer 2019")).toBe("Summer 2019");
  });
});

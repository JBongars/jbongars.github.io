import { describe, expect, it } from "@jest/globals";
import { data, parseYearRange, render } from "../../src/resume-json.11ty.ts";
import resume from "../../src/_data/resume.json" with { type: "json" };

function restoreEnvironment(key, previous) {
  if (previous === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = previous;
  }
}

describe("resume-json.11ty.js", () => {
  it("writes /resume.json", () => {
    expect(data()).toEqual({
      permalink: "/resume.json",
      eleventyExcludeFromCollections: true,
    });
  });

  it("renders JSON Resume with basics, work, and skills", () => {
    const resumeJson = JSON.parse(render());
    expect(resumeJson.$schema).toContain("jsonresume");
    expect(resumeJson.basics.name).toBe(resume.name);
    expect(resumeJson.basics.label).toBe(resume.title);
    expect(Array.isArray(resumeJson.work)).toBe(true);
    expect(resumeJson.work[0].name).toBe(resume.experience[0].company);
    expect(resumeJson.work[0].endDate).toBe();
    expect(resumeJson.skills.map((skill) => skill.name)).toEqual(resume.skills);
  });

  it("includes origin URLs when SITE_URL is set", () => {
    const previous = process.env["SITE_URL"];
    process.env["SITE_URL"] = "https://example.test";
    try {
      const resumeJson = JSON.parse(render());
      expect(resumeJson.basics.url).toBe("https://example.test/");
      expect(resumeJson.basics.image).toBe("https://example.test/img/profile.jpg");
    } finally {
      restoreEnvironment("SITE_URL", previous);
    }
  });

  it("parses year ranges and skips unmatched dates", () => {
    expect(parseYearRange("2015–2018")).toEqual({ startDate: "2015", endDate: "2018" });
    expect(parseYearRange("2020 - present")).toEqual({ startDate: "2020" });
    expect(parseYearRange("sometime")).toEqual({});
  });
});

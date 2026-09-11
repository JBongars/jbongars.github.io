import { describe, expect, it } from "@jest/globals";
import { data, render } from "../../src/resume-json.11ty.ts";
import resume from "../../src/_data/resume.json" with { type: "json" };

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
});

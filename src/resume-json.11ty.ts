import resume from "./_data/resume.json" with { type: "json" };
import { siteOrigin } from "../_11ty/paths.ts";
import { asStringOrEmpty } from "../_11ty/text.ts";

type Resume = typeof resume;
type Role = Resume["experience"][number];
type Education = Resume["education"][number];
type Certificate = Resume["certificates"][number];

interface YearRange {
  startDate?: string;
  endDate?: string;
}

function parseYearRange(dates: unknown): YearRange {
  const match = /(\d{4})\s*[–-]\s*(\d{4}|present)?/i.exec(asStringOrEmpty(dates));
  const startDate = match?.[1];
  if (startDate === undefined) {
    return {};
  }
  const out: YearRange = { startDate };
  const endDate = match?.[2];
  if (endDate !== undefined && !/^present$/i.test(endDate)) {
    out.endDate = endDate;
  }
  return out;
}

interface WorkItem {
  name: string;
  position: string;
  startDate: string;
  endDate?: string;
  highlights?: string[];
  location?: string;
  description?: string;
  url?: string;
}

function assignOptionalWorkFields(item: WorkItem, role: Role): void {
  if (role.end && !/^present$/i.test(role.end)) {
    item.endDate = role.end;
  }
  if (role.location) {
    item.location = role.location;
  }
  if ("agency" in role && role.agency) {
    item.description = `via ${role.agency}`;
  }
  const links = "links" in role ? role.links : undefined;
  const firstLink = links?.[0];
  if (firstLink?.url) {
    item.url = firstLink.url;
  }
}

function toWorkItem(role: Role): WorkItem {
  const item: WorkItem = {
    name: role.company,
    position: role.title,
    startDate: role.start,
    highlights: Array.isArray(role.bullets) ? role.bullets.filter(Boolean) : [],
  };
  assignOptionalWorkFields(item, role);
  if (item.highlights?.length === 0) {
    delete item.highlights;
  }
  return item;
}

interface Profile {
  network: string;
  username: string;
  url: string;
}

interface Basics {
  name: string;
  label: string;
  location?: { city: string; countryCode: string };
  profiles?: Profile[];
  url?: string;
  image?: string;
  summary?: string;
}

function addProfiles(basics: Basics, source: Resume): void {
  if (source.linkedin) {
    basics.profiles?.push({
      network: "LinkedIn",
      username: "julienbongars",
      url: source.linkedin,
    });
  }
  if (source.github) {
    basics.profiles?.push({
      network: "GitHub",
      username: "jbongars",
      url: source.github,
    });
  }
  if (basics.profiles?.length === 0) {
    delete basics.profiles;
  }
}

function toBasics(source: Resume): Basics {
  const origin = siteOrigin();
  const basics: Basics = {
    name: source.name,
    label: source.title,
    location: source.location ? { city: source.location, countryCode: "SG" } : undefined,
    profiles: [],
  };
  if (origin) {
    basics.url = `${origin}/`;
    basics.image = `${origin}/img/profile.jpg`;
  }
  addProfiles(basics, source);
  return basics;
}

function toJsonResume(source: Resume): Record<string, unknown> {
  const basics = toBasics(source);

  const work = source.experience.map((role) => toWorkItem(role));

  const education = source.education.map((item: Education) => {
    const row = {
      institution: item.institution,
      area: item.program,
      ...parseYearRange(item.dates),
    };
    return row;
  });

  const certificates = source.certificates.map((cert: Certificate) => {
    const row: { name: string; issuer?: string; date?: string } = { name: cert.name };
    if (cert.issuer) {
      row.issuer = cert.issuer;
    }
    if (cert.year) {
      row.date = cert.year;
    }
    return row;
  });

  const skills = source.skills.map((name) => ({ name }));

  return {
    $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
    basics,
    work,
    education,
    certificates,
    skills,
  };
}

export function data(): {
  permalink: string;
  eleventyExcludeFromCollections: boolean;
} {
  return {
    permalink: "/resume.json",
    eleventyExcludeFromCollections: true,
  };
}

export function render(): string {
  return `${JSON.stringify(toJsonResume(resume), undefined, 2)}\n`;
}

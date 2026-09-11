import resume from "./_data/resume.json" with { type: "json" };
import { siteOrigin } from "../_11ty/paths.js";

function parseYearRange(dates) {
  const m = String(dates || "").match(/(\d{4})\s*[–-]\s*(\d{4}|present)?/i);
  if (!m) return {};
  const out = { startDate: m[1] };
  if (m[2] && !/^present$/i.test(m[2])) out.endDate = m[2];
  return out;
}

function toWorkItem(role) {
  const item = {
    name: role.company,
    position: role.title,
    startDate: role.start,
    highlights: Array.isArray(role.bullets) ? role.bullets.filter(Boolean) : [],
  };
  if (role.end && !/^present$/i.test(String(role.end))) {
    item.endDate = role.end;
  }
  if (role.location) {
    item.location = role.location;
  }
  if (role.agency) {
    item.description = `via ${role.agency}`;
  }
  if (Array.isArray(role.links) && role.links[0]?.url) {
    item.url = role.links[0].url;
  }
  if (item.highlights.length === 0) {
    delete item.highlights;
  }
  return item;
}

function toBasics(source) {
  const origin = siteOrigin();
  const basics = {
    name: source.name,
    label: source.title,
    location: source.location ? { city: source.location, countryCode: "SG" } : undefined,
    profiles: [],
  };
  if (origin) {
    basics.url = `${origin}/`;
    basics.image = `${origin}/img/profile.jpg`;
  }
  if (source.linkedin) {
    basics.profiles.push({
      network: "LinkedIn",
      username: "julienbongars",
      url: source.linkedin,
    });
  }
  if (source.github) {
    basics.profiles.push({
      network: "GitHub",
      username: "jbongars",
      url: source.github,
    });
  }
  if (basics.profiles.length === 0) {
    delete basics.profiles;
  }
  if (source.biography) {
    basics.summary = source.biography;
  }
  return basics;
}

function toJsonResume(source) {
  const basics = toBasics(source);

  const work = (source.experience || []).map((role) => toWorkItem(role));

  const education = (source.education || []).map((item) => {
    const row = {
      institution: item.institution,
      area: item.program,
      ...parseYearRange(item.dates),
    };
    return row;
  });

  const certificates = (source.certificates || []).map((cert) => {
    const row = { name: cert.name };
    if (cert.issuer) row.issuer = cert.issuer;
    if (cert.year) row.date = String(cert.year);
    return row;
  });

  const skills = (source.skills || []).map((name) => ({ name }));

  const document = {
    $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
    basics,
    work,
    education,
    certificates,
    skills,
  };

  return document;
}

export function data() {
  return {
    permalink: "/resume.json",
    eleventyExcludeFromCollections: true,
  };
}

export function render() {
  return `${JSON.stringify(toJsonResume(resume), undefined, 2)}\n`;
}

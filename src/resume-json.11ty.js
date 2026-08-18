const resume = require("./_data/resume.json");
const { siteOrigin } = require("../_11ty/paths");

function parseYearRange(dates) {
  const m = String(dates || "").match(/(\d{4})\s*[–-]\s*(\d{4}|present)?/i);
  if (!m) return {};
  const out = { startDate: m[1] };
  if (m[2] && !/^present$/i.test(m[2])) out.endDate = m[2];
  return out;
}

function toJsonResume(src) {
  const origin = siteOrigin();
  const basics = {
    name: src.name,
    label: src.title,
    location: src.location
      ? { city: src.location, countryCode: "SG" }
      : undefined,
    profiles: [],
  };
  if (origin) {
    basics.url = `${origin}/`;
    basics.image = `${origin}/img/profile.jpg`;
  }
  if (src.linkedin) {
    basics.profiles.push({
      network: "LinkedIn",
      username: "julienbongars",
      url: src.linkedin,
    });
  }
  if (src.github) {
    basics.profiles.push({
      network: "GitHub",
      username: "jbongars",
      url: src.github,
    });
  }
  if (!basics.profiles.length) delete basics.profiles;
  if (src.biography) basics.summary = src.biography;

  const work = (src.experience || []).map((role) => {
    const item = {
      name: role.company,
      position: role.title,
      startDate: role.start,
      highlights: Array.isArray(role.bullets) ? role.bullets.filter(Boolean) : [],
    };
    if (role.end && !/^present$/i.test(String(role.end))) {
      item.endDate = role.end;
    }
    if (role.location) item.location = role.location;
    if (role.agency) {
      item.description = `via ${role.agency}`;
    }
    if (Array.isArray(role.links) && role.links[0]?.url) {
      item.url = role.links[0].url;
    }
    if (!item.highlights.length) delete item.highlights;
    return item;
  });

  const education = (src.education || []).map((item) => {
    const row = {
      institution: item.institution,
      area: item.program,
      ...parseYearRange(item.dates),
    };
    return row;
  });

  const certificates = (src.certificates || []).map((cert) => {
    const row = { name: cert.name };
    if (cert.issuer) row.issuer = cert.issuer;
    if (cert.year) row.date = String(cert.year);
    return row;
  });

  const skills = (src.skills || []).map((name) => ({ name }));

  const doc = {
    $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
    basics,
    work,
    education,
    certificates,
    skills,
  };

  return doc;
}

module.exports.data = () => ({
  permalink: "/resume.json",
  eleventyExcludeFromCollections: true,
});

module.exports.render = () => `${JSON.stringify(toJsonResume(resume), null, 2)}\n`;

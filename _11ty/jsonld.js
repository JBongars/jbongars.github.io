const { absoluteHref, siteOrigin } = require("./paths");
const { isContentMarkdown } = require("./content");

function personNode() {
  const personResume = require("../src/_data/resume.json");
  const origin = siteOrigin();
  const person = {
    "@type": "Person",
    name: personResume.name,
    jobTitle: personResume.title,
  };
  if (origin) {
    person.url = `${origin}/`;
    person.image = `${origin}/img/profile.jpg`;
  }
  const sameAs = [personResume.linkedin, personResume.github].filter(Boolean);
  if (sameAs.length) person.sameAs = sameAs;
  if (personResume.location) {
    person.address = {
      "@type": "PostalAddress",
      addressLocality: personResume.location,
    };
  }
  if (Array.isArray(personResume.skills) && personResume.skills.length) {
    person.knowsAbout = personResume.skills;
  }
  return person;
}

function listItems(collection) {
  return (collection || []).map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: absoluteHref(item.url),
    name: item.data?.title || item.fileSlug,
  }));
}

function pageDescription(data) {
  const raw = data.description;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  const personResume = require("../src/_data/resume.json");
  const name = personResume.name || "";
  const role = personResume.title || "";
  const url = data.page?.url || "/";
  const inputPath = data.page?.inputPath;
  const heading = data.title || data.page?.fileSlug || name;
  if (url === "/") {
    return `${name} — ${role} in Singapore. The resume is compact employment history; the blog covers depth that does not fit there; write-ups are hands-on offensive security work.`;
  }
  if (url === "/resume/") {
    return `Resume for ${name}, ${role} in Singapore. Compact employment history; see the blog and write-ups for depth.`;
  }
  if (url === "/blog/") {
    return `Blog by ${name}: project notes and longer explanations for skills and work the resume cannot hold.`;
  }
  if (url === "/write-ups/") {
    return `HackTheBox and Offensive Security machine write-ups by ${name}.`;
  }
  if (isContentMarkdown(inputPath, "blog")) {
    return `${heading} — blog post by ${name}.`;
  }
  if (isContentMarkdown(inputPath, "write-ups")) {
    return `${heading} — offensive security write-up by ${name}.`;
  }
  return `${role} in Singapore. Resume, blog, write-ups, and LinkedIn.`;
}

function buildJsonLd(data) {
  const pageUrl = data.page?.url || "/";
  const url = absoluteHref(pageUrl);
  const person = personNode();
  const inputPath = data.page?.inputPath;
  const description = pageDescription(data);
  const headline = data.title || person.name;

  if (pageUrl === "/") {
    return {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url,
      name: person.name,
      description,
      mainEntity: person,
      hasPart: [
        { "@type": "WebPage", name: "Resume", url: absoluteHref("/resume/") },
        { "@type": "CollectionPage", name: "Blog", url: absoluteHref("/blog/") },
        {
          "@type": "CollectionPage",
          name: "Write-Ups",
          url: absoluteHref("/write-ups/"),
        },
      ],
    };
  }

  if (pageUrl === "/resume/") {
    return {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url,
      name: `${person.name} — Resume`,
      description,
      mainEntity: person,
    };
  }

  if (pageUrl === "/blog/" || pageUrl === "/write-ups/") {
    const isBlog = pageUrl === "/blog/";
    const items = isBlog ? data.collections?.blog : data.collections?.writeUps;
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      url,
      name: isBlog ? "Blog" : "Write-Ups",
      description,
      about: person,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: (items || []).length,
        itemListElement: listItems(items),
      },
    };
  }

  if (
    isContentMarkdown(inputPath, "blog") ||
    isContentMarkdown(inputPath, "write-ups")
  ) {
    const isWriteUp = isContentMarkdown(inputPath, "write-ups");
    const node = {
      "@context": "https://schema.org",
      "@type": isWriteUp ? "TechArticle" : "BlogPosting",
      url,
      headline,
      description,
      author: person,
      mainEntityOfPage: url,
    };
    if (data.date instanceof Date && !Number.isNaN(data.date.getTime())) {
      node.datePublished = data.date.toISOString().slice(0, 10);
    }
    if (person.image) node.image = person.image;
    return node;
  }

  return {
    "@context": "https://schema.org",
    ...person,
    description,
  };
}

module.exports = { pageDescription, buildJsonLd };

import { absoluteHref, siteOrigin } from "./paths.js";
import { isContentMarkdown } from "./content.js";
import personResume from "../src/_data/resume.json" with { type: "json" };

function personNode() {
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
  if (sameAs.length > 0) {
    person.sameAs = sameAs;
  }
  if (personResume.location) {
    person.address = {
      "@type": "PostalAddress",
      addressLocality: personResume.location,
    };
  }
  if (Array.isArray(personResume.skills) && personResume.skills.length > 0) {
    person.knowsAbout = personResume.skills;
  }
  return person;
}

function listItems(collection) {
  return (collection || []).map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: absoluteHref(item.url),
    name: item.data?.title || item.fileSlug,
  }));
}

function publishedDay(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
}

function modifiedDay(value) {
  if (typeof value === "string" && value) {
    return value;
  }
  return publishedDay(value);
}

function urlDescriptions(name, role) {
  return {
    "/": `${name} — ${role} in Singapore. The resume is compact employment history; the blog covers depth that does not fit there; write-ups are hands-on offensive security work.`,
    "/resume/": `Resume for ${name}, ${role} in Singapore. Compact employment history; see the blog and write-ups for depth.`,
    "/blog/": `Blog by ${name}: project notes and longer explanations for skills and work the resume cannot hold.`,
    "/write-ups/": `HackTheBox and Offensive Security machine write-ups by ${name}.`,
  };
}

function contentDescription(data, name, role) {
  const heading = data.title || data.page?.fileSlug || name;
  const inputPath = data.page?.inputPath;
  if (isContentMarkdown(inputPath, "blog")) {
    return `${heading} — blog post by ${name}.`;
  }
  if (isContentMarkdown(inputPath, "write-ups")) {
    return `${heading} — offensive security write-up by ${name}.`;
  }
  return `${role} in Singapore. Resume, blog, write-ups, and LinkedIn.`;
}

function routeDescription(data) {
  const name = personResume.name || "";
  const role = personResume.title || "";
  return urlDescriptions(name, role)[data.page?.url || "/"] || contentDescription(data, name, role);
}

function pageDescription(data) {
  const raw = data.description;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  return routeDescription(data);
}

function homeJsonLd(person, url, description) {
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

function resumeJsonLd(person, url, description) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    name: `${person.name} — Resume`,
    description,
    mainEntity: person,
  };
}

function collectionJsonLd({ data, person, url, description }) {
  const isBlog = data.page?.url === "/blog/";
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

function articleJsonLd({ data, person, url, description }) {
  const isWriteUp = isContentMarkdown(data.page?.inputPath, "write-ups");
  const node = {
    "@context": "https://schema.org",
    "@type": isWriteUp ? "TechArticle" : "BlogPosting",
    url,
    headline: data.title || person.name,
    description,
    author: person,
    mainEntityOfPage: url,
  };
  const datePublished = publishedDay(data.date);
  if (datePublished) {
    node.datePublished = datePublished;
  }
  const dateModified = modifiedDay(data.dateModified);
  if (dateModified) {
    node.dateModified = dateModified;
  }
  if (person.image) {
    node.image = person.image;
  }
  return node;
}

function articleOrPersonJsonLd(graph) {
  const inputPath = graph.data.page?.inputPath;
  if (isContentMarkdown(inputPath, "blog") || isContentMarkdown(inputPath, "write-ups")) {
    return articleJsonLd(graph);
  }
  return {
    "@context": "https://schema.org",
    ...graph.person,
    description: graph.description,
  };
}

function buildJsonLd(data) {
  const pageUrl = data.page?.url || "/";
  const url = absoluteHref(pageUrl);
  const person = personNode();
  const description = pageDescription(data);
  const graph = { data, person, url, description };
  const byUrl = {
    "/": () => homeJsonLd(person, url, description),
    "/resume/": () => resumeJsonLd(person, url, description),
    "/blog/": () => collectionJsonLd(graph),
    "/write-ups/": () => collectionJsonLd(graph),
  };
  return (byUrl[pageUrl] || (() => articleOrPersonJsonLd(graph)))();
}

export { pageDescription, buildJsonLd };

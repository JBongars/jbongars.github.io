import { absoluteHref, siteOrigin } from "./paths.ts";
import { isContentMarkdown } from "./content.ts";
import personResume from "../src/_data/resume.json" with { type: "json" };
import type { CollectionItem, PageData } from "./types.ts";

interface PersonNode {
  "@type": "Person";
  name: string;
  jobTitle: string;
  url?: string;
  image?: string;
  sameAs?: string[];
  address?: {
    "@type": "PostalAddress";
    addressLocality: string;
  };
  knowsAbout?: string[];
  description?: string;
}

interface JsonLdNode {
  "@context"?: string;
  "@type": string;
  url?: string;
  name?: string;
  headline?: string;
  description?: string;
  mainEntity?: unknown;
  hasPart?: unknown;
  about?: PersonNode;
  author?: PersonNode;
  mainEntityOfPage?: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
}

interface JsonLdGraph {
  data: PageData;
  person: PersonNode;
  url: string;
  description: string;
}

function presentStrings(values: unknown[]): string[] {
  const present: string[] = [];
  for (const value of values) {
    if (typeof value === "string" && value) {
      present.push(value);
    }
  }
  return present;
}

function personNode(): PersonNode {
  const origin = siteOrigin();
  const person: PersonNode = {
    "@type": "Person",
    name: personResume.name,
    jobTitle: personResume.title,
  };
  if (origin) {
    person.url = `${origin}/`;
    person.image = `${origin}/img/profile.jpg`;
  }
  const sameAs = presentStrings([personResume.linkedin, personResume.github]);
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

function listItems(collection?: CollectionItem[]): Record<string, unknown>[] {
  return (collection ?? []).map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: absoluteHref(item.url),
    name: item.data?.title ?? item.fileSlug,
  }));
}

function publishedDay(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
}

function modifiedDay(value: unknown): string | undefined {
  if (typeof value === "string" && value) {
    return value;
  }
  return publishedDay(value);
}

function urlDescriptions(name: string, role: string): Record<string, string> {
  return {
    "/": `${name} — ${role} in Singapore. The resume is compact employment history; the blog covers depth that does not fit there; write-ups are hands-on offensive security work.`,
    "/resume/": `Resume for ${name}, ${role} in Singapore. Compact employment history; see the blog and write-ups for depth.`,
    "/blog/": `Blog by ${name}: project notes and longer explanations for skills and work the resume cannot hold.`,
    "/write-ups/": `HackTheBox and Offensive Security machine write-ups by ${name}.`,
  };
}

function contentDescription(data: PageData, name: string, role: string): string {
  const heading = data.title ?? data.page?.fileSlug ?? name;
  const inputPath = data.page?.inputPath;
  if (isContentMarkdown(inputPath, "blog")) {
    return `${heading} — blog post by ${name}.`;
  }
  if (isContentMarkdown(inputPath, "write-ups")) {
    return `${heading} — offensive security write-up by ${name}.`;
  }
  return `${role} in Singapore. Resume, blog, write-ups, and LinkedIn.`;
}

function routeDescription(data: PageData): string {
  const name = personResume.name;
  const role = personResume.title;
  const descriptions = urlDescriptions(name, role);
  const pageUrl = data.page?.url ?? "/";
  return descriptions[pageUrl] ?? contentDescription(data, name, role);
}

function pageDescription(data: PageData): string {
  const raw = data.description;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  return routeDescription(data);
}

function homeJsonLd(person: PersonNode, url: string, description: string): JsonLdNode {
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

function resumeJsonLd(person: PersonNode, url: string, description: string): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    name: `${person.name} — Resume`,
    description,
    mainEntity: person,
  };
}

function collectionJsonLd(graph: JsonLdGraph): JsonLdNode {
  const isBlog = graph.data.page?.url === "/blog/";
  const items = isBlog ? graph.data.collections?.blog : graph.data.collections?.writeUps;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    url: graph.url,
    name: isBlog ? "Blog" : "Write-Ups",
    description: graph.description,
    about: graph.person,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: (items ?? []).length,
      itemListElement: listItems(items),
    },
  };
}

function articleJsonLd(graph: JsonLdGraph): JsonLdNode {
  const isWriteUp = isContentMarkdown(graph.data.page?.inputPath, "write-ups");
  const node: JsonLdNode = {
    "@context": "https://schema.org",
    "@type": isWriteUp ? "TechArticle" : "BlogPosting",
    url: graph.url,
    headline: graph.data.title ?? graph.person.name,
    description: graph.description,
    author: graph.person,
    mainEntityOfPage: graph.url,
  };
  const datePublished = publishedDay(graph.data.date);
  if (datePublished) {
    node.datePublished = datePublished;
  }
  const dateModified = modifiedDay(graph.data.dateModified);
  if (dateModified) {
    node.dateModified = dateModified;
  }
  if (graph.person.image) {
    node.image = graph.person.image;
  }
  return node;
}

function articleOrPersonJsonLd(graph: JsonLdGraph): JsonLdNode {
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

function buildJsonLd(data: PageData): JsonLdNode {
  const pageUrl = data.page?.url ?? "/";
  const url = absoluteHref(pageUrl);
  const person = personNode();
  const description = pageDescription(data);
  const graph = { data, person, url, description };
  const byUrl: Record<string, () => JsonLdNode> = {
    "/": () => homeJsonLd(person, url, description),
    "/resume/": () => resumeJsonLd(person, url, description),
    "/blog/": () => collectionJsonLd(graph),
    "/write-ups/": () => collectionJsonLd(graph),
  };
  const builder = byUrl[pageUrl];
  return builder === undefined ? articleOrPersonJsonLd(graph) : builder();
}

export { pageDescription, buildJsonLd };

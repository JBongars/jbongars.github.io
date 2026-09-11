import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export interface BuiltPage {
  file: string;
  html: string;
  url: string;
}

const SITE_ORIGIN = "http://localhost:8080/";

export function siteDirectory(): string {
  const directory = process.env["TEST_SITE_DEFAULT"];
  if (!directory) {
    throw new Error("build-site globalSetup did not run");
  }
  return directory;
}

function listHtmlFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".html"))
    .toSorted((left, right) => left.localeCompare(right));
}

function pageUrl(file: string): string {
  const posix = file.split(path.sep).join("/");
  const pathname = posix.replace(/index\.html$/u, "").replace(/\.html$/u, "");
  return new URL(pathname, SITE_ORIGIN).href;
}

export function firstPageWith(selector: string): BuiltPage {
  const directory = siteDirectory();
  for (const file of listHtmlFiles(directory)) {
    const html = readFileSync(path.join(directory, file), "utf8");
    const parsed = new DOMParser().parseFromString(html, "text/html");
    if (parsed.querySelector(selector)) {
      return { file, html, url: pageUrl(file) };
    }
  }
  throw new Error(`No built page contained ${selector}`);
}

function copyAttributes(from: Element, to: Element): void {
  const stale = Array.from(to.attributes, (attribute) => attribute.name);
  for (const name of stale) {
    to.removeAttribute(name);
  }
  for (const attribute of from.attributes) {
    to.setAttribute(attribute.name, attribute.value);
  }
}

function adoptChildren(from: Element, to: Element): void {
  to.replaceChildren(...Array.from(from.childNodes, (node) => document.importNode(node, true)));
}

export function loadIntoDocument(page: BuiltPage): void {
  const parsed = new DOMParser().parseFromString(page.html, "text/html");
  copyAttributes(parsed.documentElement, document.documentElement);
  adoptChildren(parsed.head, document.head);
  adoptChildren(parsed.body, document.body);
  const next = new URL(page.url);
  globalThis.history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`);
}

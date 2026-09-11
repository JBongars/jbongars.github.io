/*
Path prefix helper for GitHub project Pages.
*/

export function pathPrefix(root: ParentNode = document): string {
  const documentRoot = root instanceof Document ? root.documentElement : document.documentElement;
  return documentRoot.dataset["pathPrefix"] ?? "/";
}

export function siteUrl(href?: string, prefix: string = pathPrefix()): string {
  if (!href) {
    return prefix;
  }
  const path = href.startsWith("/") ? href : `/${href}`;
  if (prefix === "/") {
    return path;
  }
  return prefix.replace(/\/$/, "") + path;
}

/*
 * Path prefix helper for GitHub project Pages. Used by deferred scripts.
 */
function siteUrl(path) {
  const prefix = document.documentElement.dataset.pathPrefix || "/";
  if (!path) {
    return prefix;
  }
  const href = path.startsWith("/") ? path : `/${path}`;
  if (prefix === "/") {
    return href;
  }
  return prefix.replace(/\/$/, "") + href;
}

globalThis.siteUrl = siteUrl;

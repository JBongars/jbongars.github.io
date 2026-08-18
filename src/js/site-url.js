/* Path prefix helper for GitHub project Pages. Used by deferred scripts. */
window.siteUrl = function (path) {
  var prefix = document.documentElement.getAttribute("data-path-prefix") || "/";
  if (!path) return prefix;
  if (path.charAt(0) !== "/") path = "/" + path;
  if (prefix === "/") return path;
  return prefix.replace(/\/$/, "") + path;
};

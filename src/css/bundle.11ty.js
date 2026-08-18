const fs = require("node:fs");
const path = require("node:path");

const CSS_DIR = __dirname;

module.exports.data = () => ({
  permalink: "/css/style.css",
  eleventyExcludeFromCollections: true,
});

module.exports.render = () => {
  const entry = fs.readFileSync(path.join(CSS_DIR, "style.css"), "utf8");
  const files = [...entry.matchAll(/@import url\("\.\/([^"]+)"\);/g)].map(
    (match) => match[1]
  );
  return files
    .map((file) => fs.readFileSync(path.join(CSS_DIR, file), "utf8"))
    .join("\n");
};

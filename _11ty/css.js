const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const CSS_DIR = path.join(__dirname, "../src/css");
const FEATURES_PATH = path.join(__dirname, "../src/_data/features.json");

function readFeatures() {
  return JSON.parse(fs.readFileSync(FEATURES_PATH, "utf8"));
}

function bundleCss() {
  const features = readFeatures();
  const entry = fs.readFileSync(path.join(CSS_DIR, "style.css"), "utf8");
  const files = [...entry.matchAll(/@import url\("\.\/([^"]+)"\);/g)].map(
    (match) => match[1]
  );
  return files
    .filter((file) => features.hacklas || file !== "hacklas.css")
    .map((file) => fs.readFileSync(path.join(CSS_DIR, file), "utf8"))
    .join("\n");
}

function cssRev() {
  return crypto.createHash("sha256").update(bundleCss()).digest("hex").slice(0, 8);
}

module.exports = { bundleCss, cssRev };

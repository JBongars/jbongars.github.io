import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const CSS_DIR = path.join(import.meta.dirname, "../src/css");
const FEATURES_PATH = path.join(import.meta.dirname, "../src/_data/features.json");
const IMPORT_PATTERN = /@import url\("\.\/([^"]+)"\);/g;

function readFeatures() {
  return JSON.parse(fs.readFileSync(FEATURES_PATH, "utf8"));
}

function bundleCss() {
  const features = readFeatures();
  const entry = fs.readFileSync(path.join(CSS_DIR, "style.css"), "utf8");
  const files = Iterator.from(entry.matchAll(IMPORT_PATTERN))
    .map((match) => match[1])
    .toArray();
  return files
    .filter((file) => features.hacklas || file !== "hacklas.css")
    .map((file) => fs.readFileSync(path.join(CSS_DIR, file), "utf8"))
    .join("\n");
}

function cssRev() {
  return crypto.createHash("sha256").update(bundleCss()).digest("hex").slice(0, 8);
}

export { bundleCss, cssRev };

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const CSS_DIR = path.join(import.meta.dirname, "../src/css");
const FEATURES_PATH = path.join(import.meta.dirname, "../src/_data/features.json");
const IMPORT_PATTERN = /@import url\("\.\/([^"]+)"\);/g;

interface SiteFeatures {
  hacklas: boolean;
}

function isFeatureRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFeatures(): SiteFeatures {
  const parsed: unknown = JSON.parse(fs.readFileSync(FEATURES_PATH, "utf8"));
  if (!isFeatureRecord(parsed)) {
    return { hacklas: false };
  }
  return { hacklas: Boolean(parsed["hacklas"]) };
}

function importedSheets(entry: string): string[] {
  const files: string[] = [];
  for (const match of entry.matchAll(IMPORT_PATTERN)) {
    const file = match[1];
    if (file !== undefined) {
      files.push(file);
    }
  }
  return files;
}

function bundleCss(): string {
  const features = readFeatures();
  const entry = fs.readFileSync(path.join(CSS_DIR, "style.css"), "utf8");
  return importedSheets(entry)
    .filter((file) => features.hacklas || file !== "hacklas.css")
    .map((file) => fs.readFileSync(path.join(CSS_DIR, file), "utf8"))
    .join("\n");
}

function cssRev(): string {
  return crypto.createHash("sha256").update(bundleCss()).digest("hex").slice(0, 8);
}

export { bundleCss, cssRev };

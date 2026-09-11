import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "../..");
const SITE_URL = "http://localhost:8080/";

export default function buildSite(): void {
  const out = mkdtempSync(path.join(tmpdir(), "site-default-"));
  execFileSync(
    path.join(ROOT, "node_modules/.bin/eleventy"),
    ["--config=eleventy.config.ts", `--output=${out}`, "--quiet"],
    {
      cwd: ROOT,
      env: { ...process.env, SITE_URL },
      stdio: "inherit",
    },
  );
  process.env["TEST_SITE_DEFAULT"] = out;
}

import { execFileSync } from "node:child_process";
import path from "node:path";
import { ROOT } from "./paths.ts";
import { asString } from "./text.ts";

function isoDay(value?: unknown): string | undefined {
  if (!value) {
    return;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(asString(value));
  return match?.[1];
}

/**
 * Last commit date (YYYY-MM-DD) for a source file, if git knows it.
 */
function gitLastmodDay(inputPath?: unknown): string | undefined {
  if (!inputPath || typeof inputPath !== "string") {
    return;
  }
  const absolutePath = path.isAbsolute(inputPath) ? inputPath : path.join(ROOT, inputPath);
  try {
    const output = execFileSync("git", ["log", "-1", "--format=%cI", "--", absolutePath], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return isoDay(output);
  } catch {
    return;
  }
}

export { isoDay, gitLastmodDay };

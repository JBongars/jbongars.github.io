const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { ROOT } = require("./paths");

function isoDay(value) {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : undefined;
}

/** Last commit date (YYYY-MM-DD) for a source file, if git knows it. */
function gitLastmodDay(inputPath) {
  if (!inputPath) return undefined;
  const abs = path.isAbsolute(inputPath)
    ? inputPath
    : path.join(ROOT, inputPath);
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", abs], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return isoDay(out);
  } catch {
    return undefined;
  }
}

module.exports = { isoDay, gitLastmodDay };

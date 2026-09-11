import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "@jest/globals";
import security from "../../src/_data/security.js";

describe("security data", () => {
  it("hashes theme-init.js into script-src", () => {
    const source = readFileSync(
      path.join(import.meta.dirname, "../../src/js/theme-init.js"),
      "utf8",
    );
    const digest = createHash("sha256").update(source).digest("base64");
    expect(security.contentSecurityPolicy).toContain(`'sha256-${digest}'`);
    expect(security.contentSecurityPolicy).not.toMatch(/script-src [^;]*'unsafe-inline'/);
    expect(security.themeInitScript).toBe(source);
  });

  it("sets cache headers by URL kind", () => {
    const headers = {};
    const response = {
      setHeader(name, value) {
        headers[name] = value;
      },
    };
    let nextCalls = 0;
    const next = () => {
      nextCalls += 1;
    };

    security.cacheControlMiddleware({ url: "/.11ty/reload" }, response, next);
    expect(headers["Cache-Control"]).toBe("no-store");

    security.cacheControlMiddleware({ url: "/css/style.css?v=1" }, response, next);
    expect(headers["Cache-Control"]).toBe("public, max-age=86400");

    security.cacheControlMiddleware({ url: "/resume/" }, response, next);
    expect(headers["Cache-Control"]).toBe("no-cache");
    expect(nextCalls).toBe(3);
  });
});

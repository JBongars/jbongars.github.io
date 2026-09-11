import { createHash } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import security, { applyThemeInit, applyThemeInitFromBundle } from "../../_11ty/security.ts";

describe("security data", () => {
  it("hashes the built theme-init string into script-src", () => {
    const built = "void 0;";
    applyThemeInit(built);
    const digest = createHash("sha256").update(built).digest("base64");
    expect(security.contentSecurityPolicy).toContain(`'sha256-${digest}'`);
    expect(security.contentSecurityPolicy).not.toMatch(/script-src [^;]*'unsafe-inline'/);
    expect(security.themeInitScript).toBe(built);
    expect(security.httpHeaders["Content-Security-Policy"]).toContain(`'sha256-${digest}'`);
  });

  it("applies theme-init from a bundle result", () => {
    applyThemeInitFromBundle({
      rev: "",
      inline: { "theme-init": { code: "a", sha256: "ignored" } },
      preloadTags: () => "",
    });
    expect(security.themeInitScript).toBe("a");
    expect(security.contentSecurityPolicy).toContain(
      `'sha256-${createHash("sha256").update("a").digest("base64")}'`,
    );
  });

  it("throws when the bundle is missing theme-init", () => {
    expect(() => {
      applyThemeInitFromBundle({ rev: "", inline: {}, preloadTags: () => "" });
    }).toThrow(/theme-init/);
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

    security.cacheControlMiddleware({}, response, next);
    expect(headers["Cache-Control"]).toBe("no-cache");
    expect(nextCalls).toBe(4);
  });

  it("development server middleware sends the live CSP after theme-init is applied", () => {
    const built = "void 0;";
    applyThemeInit(built);
    const headers = {};
    const response = {
      setHeader(name, value) {
        headers[name] = value;
      },
    };
    let nextCalls = 0;
    security.developmentServerMiddleware({ url: "/resume/" }, response, () => {
      nextCalls += 1;
    });
    expect(headers["Content-Security-Policy"]).toContain(
      `'sha256-${createHash("sha256").update(built).digest("base64")}'`,
    );
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Cache-Control"]).toBe("no-cache");
    expect(nextCalls).toBe(1);
  });
});

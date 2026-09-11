/**
 * @jest-environment jsdom
 */
/* eslint-disable testing-library/no-node-access -- Giscus scripts and #giscus-css have no accessible role */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { COMMENTS_HOOK, init, type CommentsDependencies } from "./index";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
  document.head.replaceChildren();
  document.body.replaceChildren();
});

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

function scriptTheme(script: Element | null): string | undefined {
  if (!(script instanceof HTMLScriptElement)) {
    return;
  }
  return script.dataset["theme"];
}

function captureIframeMessages(iframe: HTMLIFrameElement, posted: unknown[]): void {
  const contentWindow = iframe.contentWindow;
  if (!contentWindow) {
    throw new Error("missing iframe contentWindow");
  }
  contentWindow.postMessage = (data: unknown) => {
    posted.push(data);
  };
}

function enhance(
  root: ParentNode = document.body,
  dependencies: CommentsDependencies = {},
): () => void {
  const stop = init(root, dependencies);
  teardowns.push(stop);
  return stop;
}

const SECTION = `
<input type="checkbox" data-theme-toggle aria-label="Toggle light and dark mode">
<section
  data-comments
  data-repo="owner/repo"
  data-repo-id="R_repo"
  data-category="Announcements"
  data-category-id="C_cat"
  data-term="a-post"
  aria-label="Comments"
>
  <div data-comments-mount></div>
</section>
`;

describe("comments", () => {
  it("injects the Giscus client script and a CSS decoy", () => {
    enhance(mount(SECTION));

    const script = document.querySelector<HTMLScriptElement>("script[src*='giscus.app/client.js']");
    expect(script).toBeTruthy();
    expect(script?.dataset["repo"]).toBe("owner/repo");
    expect(document.querySelector("#giscus-css")).toBeTruthy();
  });

  it("posts a light theme to the widget when the toggle changes", async () => {
    const user = userEvent.setup();
    const messages: { data: unknown; origin: string }[] = [];
    enhance(mount(SECTION), {
      postMessage(_iframe, data, origin) {
        messages.push({ data, origin });
      },
    });
    const iframe = document.createElement("iframe");
    iframe.className = "giscus-frame";
    document.body.append(iframe);

    await user.click(screen.getByRole("checkbox", { name: /toggle light and dark mode/i }));

    expect(messages).toEqual([
      {
        data: { giscus: { setConfig: { theme: "light" } } },
        origin: "https://giscus.app",
      },
    ]);
  });

  it("is idempotent", () => {
    const root = mount(SECTION);
    enhance(root);
    enhance(root);
    expect(document.querySelectorAll("script[src*='giscus.app/client.js']")).toHaveLength(1);
  });

  it("does nothing when there are no comments", () => {
    expect(() => {
      enhance(mount("<p>no comments</p>"))();
    }).not.toThrow();
  });

  it("only injects comments inside the inited subtree", () => {
    mount(`
      <div role="group" aria-label="scoped">${SECTION}</div>
      <section data-comments data-repo="out/out" data-repo-id="R" data-category-id="C" data-term="out">
        <div data-comments-mount></div>
      </section>
    `);
    enhance(screen.getByRole("group", { name: "scoped" }));
    expect(document.querySelectorAll("script[src*='giscus.app/client.js']")).toHaveLength(1);
  });

  it("exports the template hook", () => {
    expect(COMMENTS_HOOK).toBe("[data-comments]");
  });

  it("skips a section that is missing a mount or required fields", () => {
    enhance(
      mount(`
        <section data-comments data-repo="owner/repo" aria-label="No mount"></section>
        <section data-comments data-repo="" data-repo-id="" data-category-id="" data-term="" aria-label="Empty">
          <div data-comments-mount></div>
        </section>
      `),
    );

    expect(document.querySelector("script[src*='giscus.app/client.js']")).toBeNull();
  });

  it("does not inject a second script when Giscus is already mounted", () => {
    enhance(
      mount(`
        <section data-comments data-repo="owner/repo" data-repo-id="R" data-category-id="C" data-term="post" aria-label="Comments">
          <div data-comments-mount>
            <iframe class="giscus-frame" title="Comments"></iframe>
          </div>
        </section>
      `),
    );

    expect(document.querySelector("script[src*='giscus.app/client.js']")).toBeNull();
  });

  it("uses custom theme tokens and posts through the iframe when no postMessage is injected", async () => {
    const user = userEvent.setup();
    enhance(
      mount(`
        <input type="checkbox" data-theme-toggle aria-label="Toggle light and dark mode">
        <section
          data-comments
          data-repo="owner/repo"
          data-repo-id="R_repo"
          data-category-id="C_cat"
          data-term="a-post"
          data-theme="noborder_dark"
          data-theme-light="noborder_light"
          aria-label="Comments"
        >
          <div data-comments-mount></div>
        </section>
      `),
    );
    const posted: unknown[] = [];
    const iframe = document.createElement("iframe");
    iframe.className = "giscus-frame";
    iframe.title = "Giscus";
    document.body.append(iframe);
    captureIframeMessages(iframe, posted);

    await user.click(screen.getByRole("checkbox", { name: /toggle light and dark mode/i }));

    expect(posted).toEqual([{ giscus: { setConfig: { theme: "noborder_light" } } }]);
    expect(
      document.querySelector<HTMLScriptElement>("script[src*='giscus.app/client.js']")?.dataset[
        "theme"
      ],
    ).toBe("noborder_dark");
  });

  it("applies a pending theme after Giscus announces itself", async () => {
    const user = userEvent.setup();
    const messages: unknown[] = [];
    enhance(mount(SECTION), {
      postMessage(_iframe, data) {
        messages.push(data);
      },
    });

    await user.click(screen.getByRole("checkbox", { name: /toggle light and dark mode/i }));
    expect(messages).toEqual([]);

    const iframe = document.createElement("iframe");
    iframe.className = "giscus-frame";
    iframe.title = "Giscus";
    document.body.append(iframe);

    dispatchEvent(
      new MessageEvent("message", {
        origin: "https://giscus.app",
        data: { giscus: { resizeHeight: 120 } },
      }),
    );

    expect(messages).toEqual([{ giscus: { setConfig: { theme: "light" } } }]);
  });

  it("ignores unrelated message events", () => {
    enhance(mount(SECTION));
    expect(() => {
      dispatchEvent(new MessageEvent("message", { origin: "https://example.com", data: {} }));
      dispatchEvent(new MessageEvent("message", { origin: "https://giscus.app", data: "ready" }));
    }).not.toThrow();
  });

  it("does nothing when the root is not an element", () => {
    expect(() => {
      init(document.createDocumentFragment())();
    }).not.toThrow();
  });

  it("uses default theme tokens and skips a second CSS decoy", () => {
    document.head.innerHTML = `<style id="giscus-css"></style>`;
    enhance(
      mount(`
        <section data-comments data-repo="owner/repo" data-repo-id="R_repo" data-category-id="C_cat" data-term="a-post" aria-label="Comments">
          <div data-comments-mount></div>
        </section>
      `),
    );
    expect(document.querySelector("#giscus-css")).toBeTruthy();
    expect(scriptTheme(document.querySelector("script[src*='giscus.app/client.js']"))).toBe(
      "transparent_dark",
    );
  });

  it("skips a section whose mount already has a Giscus frame", () => {
    enhance(
      mount(`
        <section data-comments data-repo="owner/repo" aria-label="Comments"></section>
        <section data-comments data-repo="owner/repo" data-repo-id="R_repo" data-category-id="C_cat" data-term="a-post" aria-label="Filled">
          <div data-comments-mount>
            <iframe class="giscus-frame" title="Existing"></iframe>
          </div>
        </section>
      `),
    );
    expect(document.querySelectorAll("script[src*='giscus.app/client.js']")).toHaveLength(0);
  });

  it("ignores a theme toggle when comments are gone", async () => {
    const user = userEvent.setup();
    enhance(
      mount(`<input type="checkbox" data-theme-toggle aria-label="Toggle light and dark mode">`),
    );
    await user.click(screen.getByRole("checkbox", { name: /toggle light and dark mode/i }));
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("uses the document when init is called without a root", () => {
    document.body.innerHTML = SECTION;
    const stop = init();
    teardowns.push(stop);
    expect(document.querySelector("script[src*='giscus.app/client.js']")).toBeTruthy();
  });

  it("ignores a Giscus message that has no widget payload", async () => {
    const user = userEvent.setup();
    enhance(mount(SECTION));
    await user.click(screen.getByRole("checkbox", { name: /toggle light and dark mode/i }));
    expect(() => {
      dispatchEvent(
        new MessageEvent("message", { origin: "https://giscus.app", data: { ready: true } }),
      );
      dispatchEvent(new MessageEvent("message", { origin: "https://giscus.app", data: 1 }));
    }).not.toThrow();
  });
});
/* eslint-enable testing-library/no-node-access -- paired with the file-level disable */

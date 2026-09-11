/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { init } from "./index";
import type { FetchResponse } from "../platform";

const teardowns: (() => void)[] = [];
const originalImage = Image;
const originalComplete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "complete");

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
  document.body.replaceChildren();
  history.replaceState(undefined, "", "http://localhost:8080/");
  delete document.documentElement.dataset["pathPrefix"];
  globalThis.Image = originalImage;
  if (originalComplete) {
    Object.defineProperty(HTMLImageElement.prototype, "complete", originalComplete);
  }
  jest.useRealTimers();
});

const NEXT_PAGE = `<html><head><title>Next</title></head><body><nav class="site-nav"><a href="/">Home</a></nav><main><p>Next page</p></main></body></html>`;
const BLOG_PAGE = `<html><head><title>Blog</title></head><body><main><p>Blog index</p></main></body></html>`;
const NO_MAIN = `<html><head><title>Empty</title></head><body><p>no main</p></body></html>`;

function pageResponse(html: string, status = 200): FetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text() {
      return Promise.resolve(html);
    },
  };
}

function startNav(
  html: string,
  fetched: string | (() => Promise<FetchResponse>) = NEXT_PAGE,
): void {
  document.body.innerHTML = html;
  teardowns.push(
    init(document, {
      fetch() {
        return typeof fetched === "function" ? fetched() : Promise.resolve(pageResponse(fetched));
      },
      scrollTo() {
        /*
         * no-op in tests
         */
      },
    }),
  );
}

describe("soft-nav", () => {
  it("replaces main with the fetched page on a same-origin click", async () => {
    const user = userEvent.setup();
    document.body.innerHTML = `<nav class="site-nav"></nav><main><a href="/resume/">Resume</a></main>`;
    startNav(`<nav class="site-nav"></nav><main><a href="/resume/">Resume</a></main>`);

    await user.click(screen.getByRole("link", { name: "Resume" }));

    expect(await screen.findByText("Next page")).toBeInTheDocument();
    expect(document.title).toBe("Next");
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  it("ignores downloads, new tabs, and other-origin links", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    document.body.innerHTML = `
      <main>
        <a href="/resume/" download>Download</a>
        <a href="/resume/" target="_blank">New tab</a>
        <a href="https://example.com/">Away</a>
      </main>
    `;
    teardowns.push(
      init(document, {
        fetch(input) {
          calls.push(input);
          return Promise.resolve(pageResponse(NEXT_PAGE));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Download" }));
    await user.click(screen.getByRole("link", { name: "New tab" }));
    await user.click(screen.getByRole("link", { name: "Away" }));

    expect(calls).toEqual([]);
    expect(screen.getByRole("link", { name: "Download" })).toBeInTheDocument();
  });

  it("prefetches on pointer over", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    document.body.innerHTML = `<main><a href="/resume/">Resume</a></main>`;
    teardowns.push(
      init(document, {
        fetch(input) {
          calls.push(input);
          return Promise.resolve(pageResponse(NEXT_PAGE));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.hover(screen.getByRole("link", { name: "Resume" }));

    expect(calls.length).toBeGreaterThan(0);
  });

  it("falls back to a full navigation when fetch fails", async () => {
    const user = userEvent.setup();
    startNav(`<main><a href="/resume/">Resume</a></main>`, async () => {
      throw new Error("offline");
    });

    await user.click(screen.getByRole("link", { name: "Resume" }));
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByRole("link", { name: "Resume" })).toBeInTheDocument();
  });

  it("rejects a document without main", async () => {
    const user = userEvent.setup();
    startNav(`<main><a href="/resume/">Resume</a></main>`, NO_MAIN);

    await user.click(screen.getByRole("link", { name: "Resume" }));
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByRole("link", { name: "Resume" })).toBeInTheDocument();
  });

  it("rejects a non-OK response", async () => {
    const user = userEvent.setup();
    document.body.innerHTML = `<main><a href="/resume/">Resume</a></main>`;
    teardowns.push(
      init(document, {
        fetch() {
          return Promise.resolve(pageResponse("nope", 500));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Resume" }));
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByRole("link", { name: "Resume" })).toBeInTheDocument();
  });

  it("updates the remembered path on site:pathreplace", () => {
    startNav(`<main><p>here</p></main>`);
    history.replaceState(undefined, "", "http://localhost:8080/hacklas/?q=nmap");
    document.dispatchEvent(new CustomEvent("site:pathreplace"));
    expect(location.search).toBe("?q=nmap");
  });

  it("does nothing when there is no main", () => {
    expect(() => {
      init(document)();
    }).not.toThrow();
  });

  it("does nothing when the root is not an element", () => {
    expect(() => {
      init(document.createDocumentFragment())();
    }).not.toThrow();
  });

  it("is idempotent", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    document.body.innerHTML = `<main><a href="/resume/">Resume</a></main>`;
    const fetchPage = () => {
      calls.push("fetch");
      return Promise.resolve(pageResponse(BLOG_PAGE));
    };
    teardowns.push(
      init(document, {
        fetch: fetchPage,
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );
    teardowns.push(
      init(document, {
        fetch: fetchPage,
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Resume" }));
    await screen.findByText("Blog index");

    expect(calls).toHaveLength(1);
  });

  it("reloads the previous page on popstate", async () => {
    const user = userEvent.setup();
    const pages = new Map([
      ["/resume/", NEXT_PAGE],
      [
        "http://localhost:8080/",
        `<html><head><title>Home</title></head><body><main><p>Home again</p></main></body></html>`,
      ],
    ]);
    document.body.innerHTML = `<main><a href="/resume/">Resume</a></main>`;
    teardowns.push(
      init(document, {
        fetch(input) {
          const html =
            [...pages].find(([key]) => input.includes(key) || input.endsWith(key))?.[1] ??
            NEXT_PAGE;
          return Promise.resolve(pageResponse(html));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Resume" }));
    await screen.findByText("Next page");
    history.replaceState(undefined, "", "http://localhost:8080/");
    globalThis.dispatchEvent(new PopStateEvent("popstate"));
    expect(await screen.findByText("Home again")).toBeInTheDocument();
  });

  it("shows a loading skeleton while a listing page is in flight", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    document.body.innerHTML = `<main><a href="/blog/">Blog</a></main>`;
    teardowns.push(
      init(document, {
        fetch() {
          return new Promise<FetchResponse>((resolve) => {
            setTimeout(() => {
              resolve(pageResponse(BLOG_PAGE));
            }, 400);
          });
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Blog" }));
    await jest.advanceTimersByTimeAsync(160);
    expect(screen.getByText("Loading")).toBeInTheDocument();
    await jest.advanceTimersByTimeAsync(400);
    expect(await screen.findByText("Blog index")).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("decodes banner images on a post page", async () => {
    class FakeImage {
      src = "";
      srcset = "";
      sizes = "";
      complete = true;
      decode(): Promise<void> {
        return Promise.resolve();
      }
      addEventListener(): void {
        /*
         * unused
         */
      }
    }
    // @ts-expect-error -- test Image double for decodeImg
    globalThis.Image = FakeImage;
    const user = userEvent.setup();
    const post = `<html><head><title>Post</title></head><body><main><p>A post</p><img class="post-banner__img" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" srcset="a.gif 1x" sizes="100vw" width="800" height="400" alt=""></main></body></html>`;
    document.body.innerHTML = `<main><a href="/blog/hello/">Hello</a><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="16" height="16" alt=""></main>`;
    teardowns.push(
      init(document, {
        fetch() {
          return Promise.resolve(pageResponse(post));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Hello" }));
    expect(await screen.findByText("A post")).toBeInTheDocument();
  });

  it("prefetches when a link receives focus", async () => {
    const calls: string[] = [];
    document.body.innerHTML = `<main><a href="/resume/">Resume</a></main>`;
    teardowns.push(
      init(document, {
        fetch(input) {
          calls.push(input);
          return Promise.resolve(pageResponse(NEXT_PAGE));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    screen.getByRole("link", { name: "Resume" }).focus();
    await Promise.resolve();

    expect(calls.length).toBeGreaterThan(0);
  });

  it("ignores modified clicks", () => {
    const calls: string[] = [];
    document.body.innerHTML = `<main><a href="/resume/">Resume</a></main>`;
    teardowns.push(
      init(document, {
        fetch(input) {
          calls.push(input);
          return Promise.resolve(pageResponse(NEXT_PAGE));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    screen
      .getByRole("link", { name: "Resume" })
      .dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ctrlKey: true }),
      );

    expect(calls).toEqual([]);
    expect(screen.getByRole("link", { name: "Resume" })).toBeInTheDocument();
  });

  it("unchecks the nav toggle after a swap", async () => {
    const user = userEvent.setup();
    document.body.innerHTML = `
      <input type="checkbox" id="nav-toggle" checked>
      <label for="nav-toggle">Menu</label>
      <nav class="site-nav"></nav>
      <main><a href="/resume/">Resume</a></main>
    `;
    teardowns.push(
      init(document, {
        fetch() {
          return Promise.resolve(pageResponse(NEXT_PAGE));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Resume" }));
    await screen.findByText("Next page");

    expect(screen.getByRole("checkbox", { name: "Menu" })).not.toBeChecked();
  });

  it("shows a post skeleton while a write-up is in flight", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    document.body.innerHTML = `<main><a href="/write-ups/box/">Box</a></main>`;
    teardowns.push(
      init(document, {
        fetch() {
          return new Promise<FetchResponse>((resolve) => {
            setTimeout(() => {
              resolve(pageResponse(NEXT_PAGE));
            }, 400);
          });
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Box" }));
    await jest.advanceTimersByTimeAsync(160);
    expect(screen.getByText("Loading")).toBeInTheDocument();
    await jest.advanceTimersByTimeAsync(400);
    expect(await screen.findByText("Next page")).toBeInTheDocument();
  });

  it("does not show a skeleton for generic pages", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    document.body.innerHTML = `<main><a href="/resume/">Resume</a></main>`;
    teardowns.push(
      init(document, {
        fetch() {
          return new Promise<FetchResponse>((resolve) => {
            setTimeout(() => {
              resolve(pageResponse(NEXT_PAGE));
            }, 400);
          });
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Resume" }));
    await jest.advanceTimersByTimeAsync(160);
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
    await jest.advanceTimersByTimeAsync(400);
    expect(await screen.findByText("Next page")).toBeInTheDocument();
  });

  it("ignores popstate when the path did not change", () => {
    startNav(`<main><p>here</p></main>`);
    globalThis.dispatchEvent(new PopStateEvent("popstate"));
    expect(screen.getByText("here")).toBeInTheDocument();
  });

  it("drops an in-flight navigation when a newer one wins", async () => {
    const user = userEvent.setup();
    let finishFirst: ((value: FetchResponse) => void) | undefined;
    document.body.innerHTML = `<main><a href="/resume/">Resume</a><a href="/blog/">Blog</a></main>`;
    teardowns.push(
      init(document, {
        fetch(input) {
          if (input.includes("/resume/")) {
            return new Promise<FetchResponse>((resolve) => {
              finishFirst = resolve;
            });
          }
          return Promise.resolve(pageResponse(BLOG_PAGE));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Resume" }));
    await user.click(screen.getByRole("link", { name: "Blog" }));
    expect(await screen.findByText("Blog index")).toBeInTheDocument();
    finishFirst?.(pageResponse(NEXT_PAGE));
    await Promise.resolve();
    expect(screen.getByText("Blog index")).toBeInTheDocument();
  });

  it("swallows AbortError when teardown cancels a fetch", async () => {
    const user = userEvent.setup();
    document.body.innerHTML = `<main><a href="/resume/">Resume</a></main>`;
    const stop = init(document, {
      fetch(_input, init) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
      },
      scrollTo() {
        /*
         * unused
         */
      },
    });
    teardowns.push(stop);

    await user.click(screen.getByRole("link", { name: "Resume" }));
    stop();
    await Promise.resolve();
    expect(screen.getByRole("link", { name: "Resume" })).toBeInTheDocument();
  });

  it("marks pending images and skips ignored ones", async () => {
    Object.defineProperty(HTMLImageElement.prototype, "complete", {
      configurable: true,
      get() {
        return false;
      },
    });
    const user = userEvent.setup();
    const next = `<html><head><title>Post</title></head><body><main>
      <p>Hero page</p>
      <img class="post-banner__img" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="800" height="400" alt="Banner">
      <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="16" height="16" alt="">
      <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="400" height="200" alt="Ignored" eleventy:ignore>
    </main></body></html>`;
    document.body.innerHTML = `<main><a href="/blog/hero/">Hero</a></main>`;
    teardowns.push(
      init(document, {
        fetch() {
          return Promise.resolve(pageResponse(next));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Hero" }));
    const banner = await screen.findByRole("img", { name: "Banner" });
    expect(banner).toHaveClass("is-pending");
    banner.dispatchEvent(new Event("load"));
    expect(banner).toHaveClass("is-loaded");
  });

  it("decodes images without Image.decode via load", async () => {
    class FakeImage {
      src = "";
      srcset = "";
      sizes = "";
      complete = false;
      addEventListener(type: string, listener: () => void): void {
        if (type === "load") {
          queueMicrotask(listener);
        }
      }
    }
    // @ts-expect-error -- test Image double for decodeImg
    globalThis.Image = FakeImage;
    const user = userEvent.setup();
    const post = `<html><head><title>Post</title></head><body><main><p>Decoded</p><img class="post-banner__img" src="banner.gif" alt=""></main></body></html>`;
    document.body.innerHTML = `<main><a href="/blog/decoded/">Decoded</a></main>`;
    teardowns.push(
      init(document, {
        fetch() {
          return Promise.resolve(pageResponse(post));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Decoded" }));
    expect(await screen.findByText("Decoded")).toBeInTheDocument();
  });

  it("decodes images without Image.decode via error", async () => {
    class FakeImage {
      src = "";
      srcset = "";
      sizes = "";
      complete = false;
      addEventListener(type: string, listener: () => void): void {
        if (type === "error") {
          queueMicrotask(listener);
        }
      }
    }
    // @ts-expect-error -- test Image double for decodeImg
    globalThis.Image = FakeImage;
    const user = userEvent.setup();
    const post = `<html><head><title>Post</title></head><body><main><p>Broken</p><img class="post-banner__img" src="missing.gif" alt=""></main></body></html>`;
    document.body.innerHTML = `<main><a href="/blog/broken/">Broken</a></main>`;
    teardowns.push(
      init(document, {
        fetch() {
          return Promise.resolve(pageResponse(post));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Broken" }));
    expect(await screen.findByText("Broken")).toBeInTheDocument();
  });

  it("settles when Image.decode rejects", async () => {
    class FakeImage {
      src = "";
      srcset = "";
      sizes = "";
      complete = false;
      decode(): Promise<void> {
        return Promise.reject(new Error("broken"));
      }
      addEventListener(): void {
        /*
         * unused
         */
      }
    }
    // @ts-expect-error -- test Image double for decodeImg
    globalThis.Image = FakeImage;
    const user = userEvent.setup();
    const post = `<html><head><title>Post</title></head><body><main><p>Reject</p><img class="post-banner__img" src="banner.gif" alt=""></main></body></html>`;
    document.body.innerHTML = `<main><a href="/blog/reject/">Reject</a></main>`;
    teardowns.push(
      init(document, {
        fetch() {
          return Promise.resolve(pageResponse(post));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Reject" }));
    expect(await screen.findByText("Reject")).toBeInTheDocument();
  });

  it("skips prefetch when an image has no src", async () => {
    const user = userEvent.setup();
    const post = `<html><head><title>Post</title></head><body><main><p>No src</p><img class="post-banner__img" alt=""></main></body></html>`;
    document.body.innerHTML = `<main><a href="/blog/empty/">Empty</a></main>`;
    teardowns.push(
      init(document, {
        fetch() {
          return Promise.resolve(pageResponse(post));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Empty" }));
    expect(await screen.findByText("No src")).toBeInTheDocument();
  });

  it("evicts old prefetches once the hover cap is exceeded", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    const links = Array.from({ length: 9 }, (_, index) => {
      const n = String(index);
      return `<a href="/page-${n}/">Page ${n}</a>`;
    }).join("");
    document.body.innerHTML = `<main>${links}</main>`;
    teardowns.push(
      init(document, {
        fetch(input) {
          calls.push(input);
          return Promise.resolve(pageResponse(NEXT_PAGE));
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    for (const index of Array.from({ length: 9 }, (_, n) => n)) {
      await user.hover(screen.getByRole("link", { name: `Page ${String(index)}` }));
    }
    expect(calls.length).toBeGreaterThanOrEqual(9);
  });

  it("strips a path prefix when classifying listing pages", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    document.documentElement.dataset["pathPrefix"] = "/app";
    history.replaceState(undefined, "", "http://localhost:8080/app/");
    document.body.innerHTML = `<main><a href="/app/blog/">Blog</a></main>`;
    teardowns.push(
      init(document, {
        fetch() {
          return new Promise<FetchResponse>((resolve) => {
            setTimeout(() => {
              resolve(pageResponse(BLOG_PAGE));
            }, 400);
          });
        },
        scrollTo() {
          /*
           * unused
           */
        },
      }),
    );

    await user.click(screen.getByRole("link", { name: "Blog" }));
    await jest.advanceTimersByTimeAsync(160);
    expect(screen.getByText("Loading")).toBeInTheDocument();
    await jest.advanceTimersByTimeAsync(400);
    expect(await screen.findByText("Blog index")).toBeInTheDocument();
  });
});

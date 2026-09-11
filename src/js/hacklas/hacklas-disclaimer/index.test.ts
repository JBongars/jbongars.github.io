/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { init } from "./index";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
  document.body.replaceChildren();
  document.documentElement.classList.remove("disclaimer-open");
  jest.useRealTimers();
});

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

function enhance(
  root: ParentNode,
  storage: {
    getItem: (key: string) => string | undefined;
    setItem: (key: string, value: string) => void;
  },
): () => void {
  const stop = init(root, { storage });
  teardowns.push(stop);
  return stop;
}

const MODAL = `
<div data-hacklas-disclaimer role="dialog" aria-label="Hacklas disclaimer">
  <button type="button" data-hacklas-disclaimer-ack>I understand</button>
  <a href="/" data-hacklas-disclaimer-refuse>No thanks</a>
</div>
`;

describe("hacklas-disclaimer", () => {
  it("shows the gate and hides it on acknowledge", async () => {
    const user = userEvent.setup();
    const values: Record<string, string> = {};
    enhance(mount(MODAL), {
      getItem(key) {
        return values[key];
      },
      setItem(key, value) {
        values[key] = value;
      },
    });

    expect(screen.getByRole("dialog", { name: "Hacklas disclaimer" })).not.toHaveAttribute(
      "hidden",
    );

    await user.click(screen.getByRole("button", { name: "I understand" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(values["hacklas-disclaimer-ack"]).toBe("1");
  });

  it("stays hidden when already acknowledged", () => {
    enhance(mount(MODAL), {
      getItem(): string | undefined {
        return "1";
      },
      setItem() {
        /*
        unused
        */
      },
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does nothing when there is no disclaimer", () => {
    expect(() => {
      enhance(mount("<p>no gate</p>"), {
        getItem(): string | undefined {
          return "";
        },
        setItem() {
          /*
          unused
          */
        },
      })();
    }).not.toThrow();
  });

  it("sends the visitor home when they refuse with no useful referrer", async () => {
    const user = userEvent.setup();
    const assigned: string[] = [];
    teardowns.push(
      init(mount(MODAL), {
        storage: {
          getItem(): string | undefined {
            return;
          },
          setItem() {
            /*
            unused
            */
          },
        },
        location: {
          href: "http://localhost:8080/hacklas/",
          origin: "http://localhost:8080",
          pathname: "/hacklas/",
          assign(url) {
            assigned.push(String(url));
          },
        },
        referrer: "",
      }),
    );

    await user.click(screen.getByRole("link", { name: "No thanks" }));

    expect(assigned).toEqual(["/"]);
  });

  it("goes back when the referrer is outside Hacklas", async () => {
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    jest.useFakeTimers();
    const assigned: string[] = [];
    const historyCalls: string[] = [];
    const locationLike = {
      href: "http://localhost:8080/hacklas/",
      origin: "http://localhost:8080",
      pathname: "/hacklas/",
      assign(url: string) {
        assigned.push(url);
      },
    };
    teardowns.push(
      init(mount(MODAL), {
        storage: {
          getItem(): string | undefined {
            return;
          },
          setItem() {
            /*
            unused
            */
          },
        },
        location: locationLike,
        history: {
          back() {
            historyCalls.push("back");
          },
        },
        referrer: "http://localhost:8080/resume/",
      }),
    );

    await user.click(screen.getByRole("link", { name: "No thanks" }));
    expect(historyCalls).toEqual(["back"]);
    expect(assigned).toEqual([]);

    jest.advanceTimersByTime(250);
    expect(assigned).toEqual(["/"]);
    jest.useRealTimers();
  });

  it("keeps the gate open when storage throws", () => {
    teardowns.push(
      init(mount(MODAL), {
        storage: {
          getItem(): string | undefined {
            throw new Error("blocked");
          },
          setItem() {
            throw new Error("blocked");
          },
        },
      }),
    );

    expect(screen.getByRole("dialog", { name: "Hacklas disclaimer" })).not.toHaveAttribute(
      "hidden",
    );
  });

  it("treats a same-origin Hacklas referrer as no back target", async () => {
    const user = userEvent.setup();
    const assigned: string[] = [];
    document.documentElement.dataset["pathPrefix"] = "/app";
    teardowns.push(
      init(mount(MODAL), {
        storage: {
          getItem(): string | undefined {
            return;
          },
          setItem() {
            /*
            unused
            */
          },
        },
        location: {
          href: "http://localhost:8080/app/hacklas/",
          origin: "http://localhost:8080",
          pathname: "/app/hacklas/",
          assign(url) {
            assigned.push(String(url));
          },
        },
        referrer: "http://localhost:8080/app/hacklas/note/",
      }),
    );

    await user.click(screen.getByRole("link", { name: "No thanks" }));
    expect(assigned.length).toBeGreaterThan(0);
    delete document.documentElement.dataset["pathPrefix"];
  });

  it("does nothing when the root is not an element", () => {
    expect(() => {
      init(document.createDocumentFragment())();
    }).not.toThrow();
  });

  it("is idempotent", async () => {
    const user = userEvent.setup();
    const root = mount(MODAL);
    const storage = {
      getItem(): string | undefined {
        return;
      },
      setItem() {
        /*
        unused
        */
      },
    };
    enhance(root, storage);
    enhance(root, storage);

    await user.click(screen.getByRole("button", { name: "I understand" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("treats a cross-origin Hacklas referrer as a back target", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    const assigned: string[] = [];
    const historyCalls: string[] = [];
    const locationLike = {
      href: "http://localhost:8080/hacklas/",
      origin: "http://localhost:8080",
      pathname: "/hacklas/",
      assign(url: string) {
        assigned.push(url);
      },
    };
    teardowns.push(
      init(mount(MODAL), {
        storage: {
          getItem(): string | undefined {
            return;
          },
          setItem() {
            /*
            unused
            */
          },
        },
        location: locationLike,
        history: {
          back() {
            historyCalls.push("back");
          },
        },
        referrer: "https://evil.example/hacklas/",
      }),
    );

    await user.click(screen.getByRole("link", { name: "No thanks" }));
    expect(historyCalls).toEqual(["back"]);
    jest.advanceTimersByTime(250);
    expect(assigned).toEqual(["/"]);
    jest.useRealTimers();
  });

  it("ignores clicks that are not on an element", () => {
    const values: Record<string, string> = {};
    enhance(mount(MODAL), {
      getItem(key) {
        return values[key];
      },
      setItem(key, value) {
        values[key] = value;
      },
    });
    document.body.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
    expect(screen.getByRole("dialog", { name: "Hacklas disclaimer" })).not.toHaveAttribute(
      "hidden",
    );
  });
});

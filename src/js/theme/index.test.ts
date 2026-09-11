/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { init, parseTheme, THEME_KEY, type ThemeDependencies } from "./index";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
  document.body.replaceChildren();
});

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

function enhance(root: ParentNode, dependencies: ThemeDependencies = {}): () => void {
  const stop = init(root, dependencies);
  teardowns.push(stop);
  return stop;
}

function memoryStorage(initial: Record<string, string> = {}): {
  getItem: (key: string) => string | undefined;
  setItem: (key: string, value: string) => void;
  values: Record<string, string>;
} {
  const values = { ...initial };
  return {
    values,
    getItem(key: string) {
      return values[key];
    },
    setItem(key: string, value: string) {
      values[key] = value;
    },
  };
}

const TOGGLE = `<input type="checkbox" data-theme-toggle aria-label="Toggle light and dark mode">`;

describe("theme", () => {
  it("checks the toggle from stored light theme and persists dark", async () => {
    const user = userEvent.setup();
    const storage = memoryStorage({ [THEME_KEY]: "light" });
    enhance(mount(TOGGLE), { storage });

    const toggle = screen.getByRole("checkbox", { name: /toggle light and dark mode/i });
    expect(toggle).toBeChecked();

    await user.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(storage.values[THEME_KEY]).toBe("dark");
  });

  it("is idempotent", async () => {
    const user = userEvent.setup();
    const storage = memoryStorage();
    const root = mount(TOGGLE);
    enhance(root, { storage });
    enhance(root, { storage });

    await user.click(screen.getByRole("checkbox", { name: /toggle light and dark mode/i }));

    expect(storage.values[THEME_KEY]).toBe("light");
  });

  it("stops persisting after teardown", async () => {
    const user = userEvent.setup();
    const storage = memoryStorage();
    const teardown = enhance(mount(TOGGLE), { storage });
    teardown();

    await user.click(screen.getByRole("checkbox", { name: /toggle light and dark mode/i }));

    expect(storage.values[THEME_KEY]).toBeUndefined();
  });

  it("does nothing when there is no toggle", () => {
    expect(() => {
      enhance(mount("<p>no theme</p>"))();
    }).not.toThrow();
  });

  it("only handles the toggle inside the inited subtree", async () => {
    const user = userEvent.setup();
    const storage = memoryStorage();
    mount(`
      <div role="group" aria-label="scoped">
        <input type="checkbox" data-theme-toggle aria-label="Inside theme">
      </div>
      <input type="checkbox" data-theme-toggle aria-label="Outside theme">
    `);
    enhance(screen.getByRole("group", { name: "scoped" }), { storage });

    await user.click(screen.getByRole("checkbox", { name: "Outside theme" }));
    expect(storage.values[THEME_KEY]).toBeUndefined();

    await user.click(screen.getByRole("checkbox", { name: "Inside theme" }));
    expect(storage.values[THEME_KEY]).toBe("light");
  });

  it("parses only light and dark theme tokens", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("system")).toBeUndefined();
    expect(parseTheme(1)).toBeUndefined();
  });

  it("keeps the page usable when storage throws", async () => {
    const user = userEvent.setup();
    enhance(mount(TOGGLE), {
      storage: {
        getItem(): string | undefined {
          return;
        },
        setItem() {
          throw new Error("blocked");
        },
      },
    });

    const toggle = screen.getByRole("checkbox", { name: /toggle light and dark mode/i });
    await user.click(toggle);

    expect(toggle).toBeChecked();
  });

  it("does nothing when the root is not an element", () => {
    expect(() => {
      init(document.createDocumentFragment())();
    }).not.toThrow();
  });

  it("uses the document and native storage when init is called without arguments", () => {
    document.body.innerHTML = TOGGLE;
    const stop = init();
    teardowns.push(stop);
    expect(
      screen.getByRole("checkbox", { name: /toggle light and dark mode/i }),
    ).toBeInTheDocument();
  });
});

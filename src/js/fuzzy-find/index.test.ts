/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { apply, init, type FuzzyFindDependencies } from "./index";

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

function searchInput(element: HTMLElement): HTMLInputElement {
  if (!(element instanceof HTMLInputElement)) {
    throw new TypeError("expected a search input");
  }
  return element;
}

function enhance(root: ParentNode, dependencies: FuzzyFindDependencies = {}): () => void {
  const stop = init(root, dependencies);
  teardowns.push(stop);
  return stop;
}

const NOTES = `
<div data-fuzzy-find>
  <label for="fuzzy-q">Search notes</label>
  <input id="fuzzy-q" data-fuzzy-input type="search">
  <ul data-fuzzy-list role="listbox" aria-label="Notes">
    <li role="option" data-title="Linux notes" data-path="linux/ssh" data-tags="linux,ssh">
      <a href="/linux">Linux notes</a>
    </li>
    <li role="option" data-title="Windows notes" data-path="windows/ad" data-tags="windows">
      <a href="/windows">Windows notes</a>
    </li>
  </ul>
</div>
`;

describe("fuzzy-find", () => {
  it("filters notes by typing", async () => {
    const user = userEvent.setup();
    enhance(mount(NOTES));

    await user.type(screen.getByRole("searchbox", { name: "Search notes" }), "linux");

    expect(screen.getByRole("option", { name: /linux notes/i })).toBeVisible();
    expect(screen.queryByRole("option", { name: /windows notes/i })).not.toBeInTheDocument();
  });

  it("is idempotent", async () => {
    const user = userEvent.setup();
    const root = mount(NOTES);
    enhance(root);
    enhance(root);

    await user.type(screen.getByRole("searchbox", { name: "Search notes" }), "linux");

    expect(screen.getAllByRole("option", { name: /linux notes/i })).toHaveLength(1);
  });

  it("stops filtering after teardown", async () => {
    const user = userEvent.setup();
    const teardown = enhance(mount(NOTES));
    teardown();

    await user.type(screen.getByRole("searchbox", { name: "Search notes" }), "linux");

    expect(screen.getByRole("option", { name: /windows notes/i })).toBeVisible();
  });

  it("does nothing when there is no fuzzy-find field", () => {
    expect(() => {
      enhance(mount("<p>no search</p>"))();
    }).not.toThrow();
  });

  it("only filters notes inside the inited subtree", async () => {
    const user = userEvent.setup();
    mount(`
      <div role="group" aria-label="scoped">${NOTES}</div>
      <div data-fuzzy-find>
        <label for="outside-q">Outside search</label>
        <input id="outside-q" data-fuzzy-input type="search">
        <ul data-fuzzy-list role="listbox" aria-label="Outside notes">
          <li role="option" data-title="Outside windows" data-path="windows/ad" data-tags="windows">
            <a href="/windows">Outside windows</a>
          </li>
        </ul>
      </div>
    `);
    enhance(screen.getByRole("group", { name: "scoped" }));

    await user.type(screen.getByRole("searchbox", { name: "Outside search" }), "linux");
    expect(screen.getByRole("option", { name: /outside windows/i })).toBeVisible();

    await user.type(screen.getByRole("searchbox", { name: "Search notes" }), "linux");
    expect(screen.getByRole("option", { name: /linux notes/i })).toBeVisible();
    expect(screen.queryByRole("option", { name: /^windows notes$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /outside windows/i })).toBeVisible();
  });

  it("hydrates from the q and t URL parameters on a Hacklas index", () => {
    const replaced: string[] = [];
    enhance(mount(NOTES), {
      location: {
        href: "http://localhost:8080/hacklas/?q=linux&t=linux,ssh",
        pathname: "/hacklas/",
        search: "?q=linux&t=linux,ssh",
      },
      history: {
        replaceState(_state, _unused, url) {
          replaced.push(String(url));
        },
        back() {
          /*
          unused
          */
        },
      },
    });

    expect(screen.getByRole("searchbox", { name: "Search notes" })).toHaveValue("linux");
    expect(screen.getByRole("option", { name: /linux notes/i })).toBeVisible();
    expect(screen.queryByRole("option", { name: /windows notes/i })).not.toBeInTheDocument();
  });

  it("ranks a path query above a title contains match", async () => {
    const user = userEvent.setup();
    enhance(
      mount(`
        <div data-fuzzy-find>
          <label for="fuzzy-q">Search notes</label>
          <input id="fuzzy-q" data-fuzzy-input type="search">
          <ul data-fuzzy-list role="listbox" aria-label="Notes">
            <li role="option" data-title="later windows" data-path="windows/ad" data-tags="windows" data-orig="0">
              <a href="/windows">later windows</a>
            </li>
            <li role="option" data-title="linux notes" data-path="linux/ssh" data-tags="linux" data-orig="1">
              <a href="/linux">linux notes</a>
            </li>
          </ul>
        </div>
      `),
    );

    await user.type(screen.getByRole("searchbox", { name: "Search notes" }), "linux/ssh");

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("linux notes");
  });

  it("moves the highlight with arrows and opens it with Enter", async () => {
    const user = userEvent.setup();
    const clicks: string[] = [];
    enhance(mount(NOTES));
    screen.getByRole("link", { name: "Windows notes" }).addEventListener("click", (event) => {
      event.preventDefault();
      clicks.push("windows");
    });

    const field = screen.getByRole("searchbox", { name: "Search notes" });
    field.focus();
    await user.keyboard("{ArrowDown}{Enter}");

    expect(clicks).toEqual(["windows"]);
  });

  it("clears the query on Escape and pops a path segment on Backspace", async () => {
    const user = userEvent.setup();
    const backs: number[] = [];
    enhance(mount(NOTES), {
      location: {
        href: "http://localhost:8080/hacklas/",
        pathname: "/hacklas/",
        search: "",
      },
      history: {
        replaceState() {
          /*
          unused
          */
        },
        back() {
          backs.push(1);
        },
      },
    });
    const field = searchInput(screen.getByRole("searchbox", { name: "Search notes" }));
    await user.type(field, "linux/ssh");
    await user.keyboard("{Escape}");
    expect(field).toHaveValue("");

    await user.type(field, "linux/ssh");
    field.setSelectionRange(0, 0);
    await user.keyboard("{Backspace}");
    expect(field).toHaveValue("linux");

    field.setSelectionRange(0, 0);
    await user.keyboard("{Backspace}");
    expect(field).toHaveValue("");
    field.setSelectionRange(0, 0);
    await user.keyboard("{Backspace}");
    expect(backs).toEqual([1]);
  });

  it("highlights a note on hover", async () => {
    const user = userEvent.setup();
    enhance(mount(NOTES));

    await user.hover(screen.getByRole("option", { name: /windows notes/i }));

    expect(screen.getByRole("option", { name: /windows notes/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("applies a query to every live session", () => {
    enhance(mount(NOTES));
    apply("windows", []);

    expect(screen.getByRole("option", { name: /windows notes/i })).toBeVisible();
    expect(screen.queryByRole("option", { name: /linux notes/i })).not.toBeInTheDocument();
  });

  it("skips a field without an input or list", () => {
    expect(() => {
      enhance(
        mount(`
          <div data-fuzzy-find><p>empty</p></div>
          <div data-fuzzy-find><input aria-label="No list"></div>
        `),
      )();
    }).not.toThrow();
  });

  it("does nothing when the root is not an element", () => {
    expect(() => {
      init(document.createDocumentFragment())();
    }).not.toThrow();
  });

  it("uses the document when init is called without a root", () => {
    document.body.innerHTML = NOTES;
    const stop = init();
    teardowns.push(stop);
    expect(screen.getByRole("searchbox", { name: "Search notes" })).toBeInTheDocument();
  });

  it("treats a non-numeric orig index as zero and skips blank tags", async () => {
    const user = userEvent.setup();
    enhance(
      mount(`
        <div data-fuzzy-find>
          <label for="fuzzy-q">Search notes</label>
          <input id="fuzzy-q" data-fuzzy-input type="search">
          <ul data-fuzzy-list role="listbox" aria-label="Notes">
            <li role="option" data-title="Alpha" data-path="a" data-tags="  , linux " data-orig="nope">
              <a href="/a">Alpha</a>
            </li>
            <li role="option" data-title="Beta" data-path="b" data-tags="" data-orig="1">
              <a href="/b">Beta</a>
            </li>
          </ul>
        </div>
      `),
    );
    await user.type(screen.getByRole("searchbox", { name: "Search notes" }), "a");
    expect(screen.getByRole("option", { name: "Alpha" })).toBeVisible();
  });

  it("moves the highlight up and ignores arrows when nothing is visible", async () => {
    const user = userEvent.setup();
    enhance(mount(NOTES));
    const field = screen.getByRole("searchbox", { name: "Search notes" });
    field.focus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("option", { name: /windows notes/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.type(field, "zzzz");
    await user.keyboard("{ArrowDown}");
    expect(screen.queryByRole("option", { name: /linux notes/i })).not.toBeInTheDocument();
  });

  it("does not follow Enter when the active row has no link", async () => {
    const user = userEvent.setup();
    enhance(
      mount(`
        <div data-fuzzy-find>
          <label for="fuzzy-q">Search notes</label>
          <input id="fuzzy-q" data-fuzzy-input type="search">
          <ul data-fuzzy-list role="listbox" aria-label="Notes">
            <li role="option" data-title="Plain" data-path="plain" data-tags="plain">Plain</li>
          </ul>
        </div>
      `),
    );
    screen.getByRole("searchbox", { name: "Search notes" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("option", { name: "Plain" })).toBeInTheDocument();
  });

  it("lets Backspace edit when the caret is not at the start", async () => {
    const user = userEvent.setup();
    enhance(mount(NOTES));
    const field = searchInput(screen.getByRole("searchbox", { name: "Search notes" }));
    await user.type(field, "ab");
    await user.keyboard("{Backspace}");
    expect(field).toHaveValue("a");
  });

  it("ignores a non-keyboard keydown and a hover on the list itself", () => {
    enhance(mount(NOTES));
    const field = searchInput(screen.getByRole("searchbox", { name: "Search notes" }));
    field.dispatchEvent(new Event("keydown", { bubbles: true }));
    screen.getByRole("listbox", { name: "Notes" }).dispatchEvent(
      new MouseEvent("mousemove", { bubbles: true }),
    );
    expect(screen.getByRole("option", { name: /linux notes/i })).toBeInTheDocument();
  });

  it("skips a non-HTMLElement fuzzy field", () => {
    expect(() => {
      enhance(mount(`<svg data-fuzzy-find></svg>`))();
    }).not.toThrow();
  });

  it("falls back when scrollIntoView is missing", async () => {
    const user = userEvent.setup();
    enhance(mount(NOTES));
    const option = screen.getByRole("option", { name: /linux notes/i });
    Object.defineProperty(option, "scrollIntoView", {
      configurable: true,
      value: undefined,
    });
    screen.getByRole("searchbox", { name: "Search notes" }).focus();
    await user.keyboard("{ArrowDown}{ArrowUp}");
    expect(option).toBeInTheDocument();
  });
});

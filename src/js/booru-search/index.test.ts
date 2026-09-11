/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { init, type BooruSearchDependencies } from "./index";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
  document.body.replaceChildren();
  jest.useRealTimers();
});

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

function enhance(root: ParentNode, dependencies: BooruSearchDependencies = {}): () => void {
  const stop = init(root, dependencies);
  teardowns.push(stop);
  return stop;
}

const LIST = `
<ul data-sortable-list>
  <li data-tags="linux,ssh" data-title="zebra" data-date="2024-01-01"><a href="/z">Zebra</a></li>
  <li data-tags="linux" data-title="alpha" data-date="2025-06-01"><a href="/a">Alpha</a></li>
</ul>
`;

describe("booru-search", () => {
  it("mounts list tools and sorts by name", async () => {
    const user = userEvent.setup();
    enhance(mount(LIST));

    expect(screen.getByRole("group", { name: "Sort posts" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Filter by tag…")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^name$/i }));

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Alpha");
    expect(items[1]).toHaveTextContent("Zebra");
    expect(screen.getByRole("button", { name: /name/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("is idempotent", () => {
    const root = mount(LIST);
    enhance(root);
    enhance(root);

    expect(screen.getAllByRole("group", { name: "Sort posts" })).toHaveLength(1);
  });

  it("removes list tools after teardown", () => {
    const teardown = enhance(mount(LIST));
    teardown();

    expect(screen.queryByRole("group", { name: "Sort posts" })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Filter by tag…")).not.toBeInTheDocument();
  });

  it("does nothing when there is no sortable list", () => {
    expect(() => {
      enhance(mount("<p>no list</p>"))();
    }).not.toThrow();
  });

  it("only mounts list tools inside the inited subtree", () => {
    mount(`
      <div role="group" aria-label="scoped">${LIST}</div>
      <ul data-sortable-list>
        <li data-title="outside" data-date="2020-01-01"><a href="/o">Outside</a></li>
      </ul>
    `);
    enhance(screen.getByRole("group", { name: "scoped" }));

    expect(screen.getAllByRole("group", { name: "Sort posts" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Outside" })).toBeInTheDocument();
  });

  it("toggles date sort direction", async () => {
    const user = userEvent.setup();
    enhance(mount(LIST));

    await user.click(screen.getByRole("button", { name: /^date/i }));
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Zebra");
    expect(screen.getByRole("button", { name: /date/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("filters the list when a tag is committed", async () => {
    const user = userEvent.setup();
    enhance(
      mount(`
        <ul data-sortable-list>
          <li data-tags="linux,ssh" data-title="zebra" data-date="2024-01-01"><a href="/z">Zebra</a></li>
          <li data-tags="linux" data-title="alpha" data-date="2025-06-01"><a href="/a">Alpha</a></li>
          <li data-tags="windows" data-title="beta" data-date="2023-01-01"><a href="/b">Beta</a></li>
        </ul>
      `),
    );

    await user.type(screen.getByPlaceholderText("Filter by tag…"), "linux ");

    expect(screen.getByRole("link", { name: "Zebra" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Alpha" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Beta" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove tag linux/i })).toBeInTheDocument();
  });

  it("excludes a tag with a leading dash", async () => {
    const user = userEvent.setup();
    enhance(
      mount(`
        <ul data-sortable-list>
          <li data-tags="linux" data-title="alpha" data-date="2025-06-01"><a href="/a">Alpha</a></li>
          <li data-tags="windows" data-title="beta" data-date="2023-01-01"><a href="/b">Beta</a></li>
        </ul>
      `),
    );

    await user.type(screen.getByPlaceholderText("Filter by tag…"), "-windows ");

    expect(screen.getByRole("link", { name: "Alpha" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Beta" })).not.toBeInTheDocument();
  });

  it("removes a committed tag from its chip", async () => {
    const user = userEvent.setup();
    enhance(mount(LIST));
    await user.type(screen.getByPlaceholderText("Filter by tag…"), "linux ");

    await user.click(screen.getByRole("button", { name: /remove tag linux/i }));

    expect(screen.queryByRole("button", { name: /remove tag linux/i })).not.toBeInTheDocument();
  });

  it("composes tag search onto a fuzzy-find field from the URL", () => {
    enhance(
      mount(`
        <div data-fuzzy-find data-tag-search>
          <label for="fuzzy-q">Search notes</label>
          <input id="fuzzy-q" data-fuzzy-input type="search" value="">
          <ul data-fuzzy-list role="listbox" aria-label="Notes">
            <li data-tags="linux" data-title="linux notes" data-path="linux/ssh"><a href="/linux">linux notes</a></li>
            <li data-tags="windows" data-title="windows notes" data-path="windows/ad"><a href="/windows">windows notes</a></li>
          </ul>
        </div>
      `),
      { location: { href: "http://localhost:8080/hacklas/?t=linux" } },
    );

    expect(screen.getByRole("button", { name: /remove tag linux/i })).toBeInTheDocument();
  });

  it("picks a suggestion after debounce and removes it with Backspace", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    enhance(
      mount(`
        <ul data-sortable-list>
          <li data-tags="linux" data-title="alpha" data-date="2025-06-01"><a href="/a">Alpha</a></li>
          <li data-tags="windows" data-title="beta" data-date="2023-01-01"><a href="/b">Beta</a></li>
        </ul>
      `),
    );

    const field = screen.getByPlaceholderText("Filter by tag…");
    await user.type(field, "lin");
    await jest.advanceTimersByTimeAsync(250);
    await user.click(screen.getByRole("option", { name: /linux/i }));
    expect(screen.getByRole("button", { name: /remove tag linux/i })).toBeInTheDocument();
    field.focus();
    await user.keyboard("{Backspace}");
    expect(screen.queryByRole("button", { name: /remove tag linux/i })).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it("does not suggest a tag that is already chipped", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    enhance(
      mount(`
        <ul data-sortable-list>
          <li data-tags="linux" data-title="alpha" data-date="2025-06-01"><a href="/a">Alpha</a></li>
          <li data-tags="windows" data-title="beta" data-date="2023-01-01"><a href="/b">Beta</a></li>
        </ul>
      `),
    );
    const field = screen.getByPlaceholderText("Filter by tag…");
    await user.type(field, "lin");
    await jest.advanceTimersByTimeAsync(250);
    await user.click(screen.getByRole("option", { name: /linux/i }));
    await user.type(field, "lin");
    await jest.advanceTimersByTimeAsync(250);
    expect(screen.queryByRole("option", { name: /linux/i })).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it("commits a highlighted suggestion with Enter", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    enhance(
      mount(`
        <ul data-sortable-list>
          <li data-tags="linux" data-title="alpha" data-date="2025-06-01"><a href="/a">Alpha</a></li>
          <li data-tags="windows" data-title="beta" data-date="2023-01-01"><a href="/b">Beta</a></li>
        </ul>
      `),
    );
    const field = screen.getByPlaceholderText("Filter by tag…");
    await user.type(field, "alp");
    await jest.advanceTimersByTimeAsync(250);
    await user.keyboard("{ArrowRight}{ArrowLeft}{Enter}");
    expect(screen.getByRole("link", { name: "Alpha" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    jest.useRealTimers();
  });

  it("does nothing when the root is not an element", () => {
    expect(() => {
      init(document.createDocumentFragment())();
    }).not.toThrow();
  });

  it("commits an exact tag match with Tab on a fuzzy-find field", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    enhance(
      mount(`
        <div data-fuzzy-find data-tag-search>
          <label for="fuzzy-q">Search notes</label>
          <input id="fuzzy-q" data-fuzzy-input type="search">
          <ul data-fuzzy-list data-sortable-list>
            <li data-tags="linux" data-title="alpha" data-date="2025-06-01"><a href="/a">Alpha</a></li>
            <li data-tags="windows" data-title="beta" data-date="2023-01-01"><a href="/b">Beta</a></li>
          </ul>
        </div>
      `),
    );
    const field = screen.getByRole("searchbox", { name: "Search notes" });
    field.focus();
    await user.keyboard("linux");
    await jest.advanceTimersByTimeAsync(250);
    await user.keyboard("{Tab}");
    expect(screen.getByRole("button", { name: /remove tag linux/i })).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("formats large tag counts with a k suffix", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    const items = Array.from({ length: 1000 }, (_, index) => {
      const n = String(index);
      return `<li data-tags="linux" data-title="n${n}" data-date="2020-01-01"><a href="/${n}">N${n}</a></li>`;
    }).join("");
    enhance(mount(`<ul data-sortable-list>${items}</ul>`));
    const field = screen.getByPlaceholderText("Filter by tag…");
    await user.type(field, "lin");
    await jest.advanceTimersByTimeAsync(250);
    expect(screen.getByText("1k")).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("swallows Enter when the query is not an exact tag", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    enhance(mount(LIST));
    const field = screen.getByPlaceholderText("Filter by tag…");
    await user.type(field, "zzz");
    await jest.advanceTimersByTimeAsync(250);
    await user.keyboard("{Enter}");
    expect(field).toHaveValue("zzz");
    expect(screen.getByRole("link", { name: "Alpha" })).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("closes suggestions from the close button", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    enhance(mount(LIST));
    const field = screen.getByPlaceholderText("Filter by tag…");
    await user.type(field, "lin");
    await jest.advanceTimersByTimeAsync(250);
    expect(screen.getByRole("option", { name: /linux/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /close tag suggestions/i }));
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it("commits a tag with Space after suggestions were dismissed", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    enhance(mount(LIST));
    const field = screen.getByPlaceholderText("Filter by tag…");
    await user.type(field, "linux");
    await jest.advanceTimersByTimeAsync(250);
    await user.click(screen.getByRole("button", { name: /close tag suggestions/i }));
    field.focus();
    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: /remove tag linux/i })).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("ignores Shift+Tab and arrows while suggestions are closed", async () => {
    const user = userEvent.setup();
    enhance(mount(LIST));
    const field = screen.getByPlaceholderText("Filter by tag…");
    field.focus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    await user.keyboard("{ArrowRight}");
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("ignores a non-keyboard keydown on the field", () => {
    enhance(mount(LIST));
    const field = screen.getByPlaceholderText("Filter by tag…");
    field.dispatchEvent(new Event("keydown", { bubbles: true }));
    expect(field).toBeInTheDocument();
  });

  it("hydrates tags from a broken location href", () => {
    enhance(
      mount(`
        <div data-fuzzy-find data-tag-search>
          <label for="fuzzy-broken">Search notes</label>
          <input id="fuzzy-broken" type="search">
          <ul data-fuzzy-list data-sortable-list>
            <li data-tags="linux" data-title="alpha" data-date="2025-06-01"><a href="/a">Alpha</a></li>
          </ul>
        </div>
      `),
      { location: { href: "not a url" } },
    );
    expect(screen.getByRole("searchbox", { name: "Search notes" })).toBeInTheDocument();
  });

  it("dismisses suggestions on an outside click below the desktop breakpoint", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    enhance(mount(`${LIST}<p>Outside copy</p>`), {
      matchMedia: () => ({ matches: false }),
    });
    const field = screen.getByPlaceholderText("Filter by tag…");
    await user.type(field, "lin");
    await jest.advanceTimersByTimeAsync(250);
    expect(screen.getByRole("option", { name: /linux/i })).toBeInTheDocument();
    await user.click(screen.getByText("Outside copy"));
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it("focuses the input when the field chrome is clicked", async () => {
    const user = userEvent.setup();
    enhance(mount(LIST));
    const field = screen.getByPlaceholderText("Filter by tag…");
    const chrome = field.parentElement;
    if (!chrome) {
      throw new Error("missing field chrome");
    }
    await user.click(chrome);
    expect(field).toHaveFocus();
  });

  it("swallows the following click after a suggestion pointer down", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    enhance(mount(`${LIST}<p>Outside copy</p>`));
    const field = screen.getByPlaceholderText("Filter by tag…");
    await user.type(field, "lin");
    await jest.advanceTimersByTimeAsync(250);
    const option = screen.getByRole("option", { name: /linux/i });
    option.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 }),
    );
    await user.click(screen.getByText("Outside copy"));
    expect(screen.getByRole("button", { name: /remove tag linux/i })).toBeInTheDocument();
    jest.useRealTimers();
  });
});

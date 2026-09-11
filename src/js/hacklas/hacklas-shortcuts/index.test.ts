/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { init, type HacklasShortcutsDependencies } from "./index";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
  delete document.documentElement.dataset["pathPrefix"];
  document.body.replaceChildren();
});

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

function fakeLocation(
  pathname: string,
  href = `http://localhost:8080${pathname}`,
): Pick<Location, "pathname" | "href" | "assign"> & { assigned: string[] } {
  const state = {
    pathname,
    href,
    assigned: [] as string[],
    assign(url: string) {
      state.assigned.push(url);
    },
  };
  return state;
}

function fakeHistory(): Pick<History, "back"> & { calls: number } {
  const state = {
    calls: 0,
    back() {
      state.calls += 1;
    },
  };
  return state;
}

function enhance(root: ParentNode, dependencies: HacklasShortcutsDependencies = {}): () => void {
  const stop = init(root, dependencies);
  teardowns.push(stop);
  return stop;
}

describe("hacklas-shortcuts", () => {
  it("assigns the Hacklas URL when h is typed off the index", async () => {
    const user = userEvent.setup();
    const location = fakeLocation("/");
    enhance(mount("<p>home</p>"), { location });

    await user.keyboard("h");

    expect(location.assigned).toEqual(["/hacklas/"]);
  });

  it("clicks the Hacklas nav link when h is typed off the index", async () => {
    const user = userEvent.setup();
    const clicks: string[] = [];
    enhance(
      mount(`
        <nav>
          <ul data-nav-list>
            <li><a href="/hacklas/">Hacklas</a></li>
          </ul>
        </nav>
      `),
      { location: fakeLocation("/blog/") },
    );
    screen.getByRole("link", { name: "Hacklas" }).addEventListener("click", (event) => {
      event.preventDefault();
      clicks.push("hacklas");
    });

    await user.keyboard("h");

    expect(clicks).toEqual(["hacklas"]);
  });

  it("types into the search field on the Hacklas index", async () => {
    const user = userEvent.setup();
    enhance(
      mount(`
        <div data-fuzzy-find data-tag-search>
          <input type="search" data-fuzzy-input aria-label="Search notes">
        </div>
      `),
      { location: fakeLocation("/hacklas") },
    );

    await user.keyboard("nmap");

    expect(screen.getByRole("searchbox", { name: "Search notes" })).toHaveValue("nmap");
  });

  it("opens the first visible result on Enter", async () => {
    const user = userEvent.setup();
    const clicks: string[] = [];
    enhance(
      mount(`
        <ul data-fuzzy-list>
          <li style="display: none"><a href="#hidden">Hidden</a></li>
          <li><a href="#note">Visible note</a></li>
        </ul>
      `),
      { location: fakeLocation("/hacklas") },
    );
    screen.getByRole("link", { name: "Visible note" }).addEventListener("click", (event) => {
      event.preventDefault();
      clicks.push("visible");
    });

    await user.keyboard("{Enter}");

    expect(clicks).toEqual(["visible"]);
  });

  it("goes back from a note on Backspace", async () => {
    const user = userEvent.setup();
    const clicks: string[] = [];
    enhance(mount(`<a href="#index" data-back>← Back</a>`), {
      location: fakeLocation("/hacklas/note/"),
    });
    screen.getByRole("link", { name: "← Back" }).addEventListener("click", (event) => {
      event.preventDefault();
      clicks.push("back");
    });

    await user.keyboard("{Backspace}");

    expect(clicks).toEqual(["back"]);
  });

  it("uses history.back when a note has no back link", async () => {
    const user = userEvent.setup();
    const navigation = fakeHistory();
    enhance(mount("<p>note</p>"), {
      location: fakeLocation("/hacklas/note/"),
      history: navigation,
    });

    await user.keyboard("{Backspace}");

    expect(navigation.calls).toBe(1);
  });

  it.each([
    { name: "Control", down: "{Control>}", up: "{/Control}" },
    { name: "Meta", down: "{Meta>}", up: "{/Meta}" },
    { name: "Alt", down: "{Alt>}", up: "{/Alt}" },
  ])("ignores h when $name is held", async ({ down, up }) => {
    const user = userEvent.setup();
    const location = fakeLocation("/");
    enhance(mount("<p>home</p>"), { location });

    await user.keyboard(`${down}h${up}`);

    expect(location.assigned).toEqual([]);
  });

  it("ignores shortcuts when the help overlay is open", async () => {
    const user = userEvent.setup();
    const location = fakeLocation("/");
    enhance(mount(`<div data-shortcuts-modal role="dialog" aria-label="Shortcuts">Help</div>`), {
      location,
    });

    await user.keyboard("h");

    expect(location.assigned).toEqual([]);
  });

  it("ignores shortcuts from a text field", async () => {
    const user = userEvent.setup();
    const location = fakeLocation("/");
    enhance(mount(`<input aria-label="Name">`), { location });
    await user.click(screen.getByRole("textbox", { name: "Name" }));
    await user.keyboard("h");

    expect(location.assigned).toEqual([]);
  });

  it("ignores shortcuts from the search UI", async () => {
    const user = userEvent.setup();
    const location = fakeLocation("/");
    enhance(
      mount(`
        <div data-tag-search data-fuzzy-find>
          <button type="button">chip</button>
        </div>
      `),
      { location },
    );
    await user.click(screen.getByRole("button", { name: "chip" }));
    await user.keyboard("h");

    expect(location.assigned).toEqual([]);
  });

  it("is idempotent", async () => {
    const user = userEvent.setup();
    const location = fakeLocation("/");
    const root = mount("<p>home</p>");
    enhance(root, { location });
    enhance(root, { location });

    await user.keyboard("h");

    expect(location.assigned).toEqual(["/hacklas/"]);
  });

  it("stops handling keys after teardown", async () => {
    const user = userEvent.setup();
    const location = fakeLocation("/");
    const teardown = enhance(mount("<p>home</p>"), { location });
    teardown();

    await user.keyboard("h");

    expect(location.assigned).toEqual([]);
  });

  it("does nothing when init is torn down on an empty page", () => {
    expect(() => {
      enhance(mount("<p>empty</p>"))();
    }).not.toThrow();
  });

  it("only handles keys inside the inited subtree", async () => {
    const user = userEvent.setup();
    const location = fakeLocation("/");
    mount(`
      <div role="group" aria-label="scoped">
        <button type="button">Inside</button>
      </div>
      <button type="button">Outside</button>
    `);
    enhance(screen.getByRole("group", { name: "scoped" }), { location });

    await user.click(screen.getByRole("button", { name: "Outside" }));
    await user.keyboard("h");
    expect(location.assigned).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Inside" }));
    await user.keyboard("h");
    expect(location.assigned).toEqual(["/hacklas/"]);
  });

  it("strips a path prefix before deciding the page kind", async () => {
    const user = userEvent.setup();
    document.documentElement.dataset["pathPrefix"] = "/app/";
    const location = fakeLocation("/app/hacklas", "http://localhost:8080/app/hacklas");
    enhance(
      mount(`
        <div data-fuzzy-find data-tag-search>
          <input type="search" data-fuzzy-input aria-label="Search notes">
        </div>
      `),
      { location },
    );

    await user.keyboard("n");
    expect(screen.getByRole("searchbox", { name: "Search notes" })).toHaveValue("n");
  });

  it("ignores shortcuts from a checkbox and from the document body", async () => {
    const user = userEvent.setup();
    const location = fakeLocation("/");
    enhance(
      mount(`
        <input type="checkbox" aria-label="On">
        <p>body copy</p>
      `),
      { location },
    );
    await user.click(screen.getByRole("checkbox", { name: "On" }));
    await user.keyboard("h");
    expect(location.assigned).toEqual(["/hacklas/"]);
  });

  it("ignores shortcuts while a disclaimer overlay is open", async () => {
    const user = userEvent.setup();
    const location = fakeLocation("/");
    enhance(mount(`<div data-hacklas-disclaimer role="dialog" aria-label="Gate">Stay</div>`), {
      location,
    });
    await user.keyboard("h");
    expect(location.assigned).toEqual([]);
  });
});

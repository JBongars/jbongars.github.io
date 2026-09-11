/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { init, type HacklasHelpDependencies } from "./index";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
  document.documentElement.classList.remove("shortcuts-open", "disclaimer-open");
  document.body.replaceChildren();
  history.replaceState({}, "", "/");
});

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

function desktopList(): Pick<MediaQueryList, "matches" | "addEventListener"> {
  return {
    matches: true,
    addEventListener() {
      /*
       * tests inject change listeners when they need a breakpoint
       */
    },
  };
}

function enhance(
  root: ParentNode,
  dependencies: HacklasHelpDependencies = {},
  path = "/hacklas/",
): () => void {
  history.replaceState({}, "", path);
  const stop = init(root, {
    matchMediaList: desktopList,
    ...dependencies,
  });
  teardowns.push(stop);
  return stop;
}

const NAV = `
<nav>
  <ul data-nav-list>
    <li><a href="/">Home</a></li>
    <li><a href="/hacklas/">Hacklas</a></li>
  </ul>
</nav>
`;

describe("hacklas-help", () => {
  it("opens the shortcuts dialog from the help button on desktop", async () => {
    const user = userEvent.setup();
    enhance(mount(NAV));

    await user.click(screen.getByRole("button", { name: "Hacklas keyboard shortcuts" }));

    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
    expect(screen.getByText("Go to Hacklas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    expect(document.documentElement).toHaveClass("shortcuts-open");
  });

  it("closes the dialog with Escape and restores focus", async () => {
    const user = userEvent.setup();
    enhance(mount(NAV));
    const help = screen.getByRole("button", { name: "Hacklas keyboard shortcuts" });
    await user.click(help);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument();
    expect(help).toHaveFocus();
    expect(document.documentElement).not.toHaveClass("shortcuts-open");
  });

  it("closes the dialog from the Close button", async () => {
    const user = userEvent.setup();
    enhance(mount(NAV));
    await user.click(screen.getByRole("button", { name: "Hacklas keyboard shortcuts" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument();
  });

  it("does not open below the desktop breakpoint", async () => {
    const user = userEvent.setup();
    enhance(mount(NAV), {
      matchMediaList: () => ({
        matches: false,
        addEventListener() {
          /*
           * mobile viewport
           */
        },
      }),
    });

    await user.click(screen.getByRole("button", { name: "Hacklas keyboard shortcuts" }));

    expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument();
  });

  it("does not open while the disclaimer is visible", async () => {
    const user = userEvent.setup();
    enhance(
      mount(`
        ${NAV}
        <div data-hacklas-disclaimer role="dialog" aria-labelledby="disc-title">
          <h2 id="disc-title">Disclaimer</h2>
        </div>
      `),
    );

    await user.click(screen.getByRole("button", { name: "Hacklas keyboard shortcuts" }));

    expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument();
  });

  it("closes when the viewport leaves desktop", async () => {
    const user = userEvent.setup();
    const listeners: EventListener[] = [];
    const media = {
      matches: true,
      addEventListener(_type: string, listener: EventListener) {
        listeners.push(listener);
      },
    };
    enhance(mount(NAV), {
      matchMediaList: () => media,
    });
    await user.click(screen.getByRole("button", { name: "Hacklas keyboard shortcuts" }));

    media.matches = false;
    listeners[0]!(new Event("change"));

    expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument();
  });

  it("still finds a Hacklas nav item without data-nav-list", () => {
    enhance(
      mount(`
        <nav>
          <ul>
            <li><a href="/hacklas/">Hacklas</a></li>
          </ul>
        </nav>
      `),
    );

    expect(screen.getByRole("button", { name: "Hacklas keyboard shortcuts" })).toBeInTheDocument();
  });

  it("is idempotent", () => {
    const root = mount(NAV);
    enhance(root);
    enhance(root);

    expect(screen.getAllByRole("button", { name: "Hacklas keyboard shortcuts" })).toHaveLength(1);
    expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(1);
  });

  it("removes the button and modal on teardown", async () => {
    const user = userEvent.setup();
    const teardown = enhance(mount(NAV));
    await user.click(screen.getByRole("button", { name: "Hacklas keyboard shortcuts" }));
    teardown();

    expect(
      screen.queryByRole("button", { name: "Hacklas keyboard shortcuts" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass("shortcuts-open");
  });

  it("does nothing when there is no Hacklas nav item", () => {
    expect(() => {
      enhance(mount("<p>no nav</p>"))();
    }).not.toThrow();
    expect(
      screen.queryByRole("button", { name: "Hacklas keyboard shortcuts" }),
    ).not.toBeInTheDocument();
  });

  it("does nothing off Hacklas pages", () => {
    enhance(mount(NAV), {}, "/");

    expect(
      screen.queryByRole("button", { name: "Hacklas keyboard shortcuts" }),
    ).not.toBeInTheDocument();
  });

  it("only mounts the help button inside the inited subtree", async () => {
    const user = userEvent.setup();
    mount(`
      <div role="group" aria-label="scoped">${NAV}</div>
      <button type="button" data-shortcuts-help aria-label="Outside help">?</button>
    `);
    enhance(screen.getByRole("group", { name: "scoped" }));

    await user.click(screen.getByRole("button", { name: "Outside help" }));
    expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hacklas keyboard shortcuts" }));
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
  });

  it("keeps focus on Close after Tab while the dialog is open", async () => {
    const user = userEvent.setup();
    enhance(mount(NAV));
    await user.click(screen.getByRole("button", { name: "Hacklas keyboard shortcuts" }));
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
  });

  it("does nothing when matchMediaList is explicitly omitted", () => {
    history.replaceState({}, "", "/hacklas/");
    expect(() => {
      init(mount(NAV), { matchMediaList: undefined })();
    }).not.toThrow();
  });

  it("does nothing when the root is not an element", () => {
    expect(() => {
      init(document.createDocumentFragment())();
    }).not.toThrow();
  });
});

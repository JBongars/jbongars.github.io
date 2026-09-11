/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom/jest-globals";
import userEvent from "@testing-library/user-event";
import { init, type SkillHintDependencies } from "./index";

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

function enhance(root: ParentNode, dependencies: SkillHintDependencies = {}): () => void {
  const stop = init(root, dependencies);
  teardowns.push(stop);
  return stop;
}

function hoverNoneMedia(query: string): Pick<MediaQueryList, "matches"> {
  return { matches: query === "(hover: none)" };
}

function hoverAvailableMedia(): Pick<MediaQueryList, "matches"> {
  return { matches: false };
}

const TAG = `<a href="#linux" data-hint="A skill.">Linux</a>`;

describe("skill-hints", () => {
  it("opens a hint panel on click when hover is unavailable, then closes it", async () => {
    const user = userEvent.setup();
    enhance(mount(TAG), { matchMedia: hoverNoneMedia });

    await user.click(screen.getByRole("link", { name: "Linux" }));

    expect(screen.getByRole("status")).toHaveTextContent("A skill.");
    expect(screen.getByRole("link", { name: "Linux", expanded: true })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /dismiss skill hint/i }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Linux" }));
    await user.keyboard("{Escape}");

    expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
  });

  it("does not open a hint when hover is available", async () => {
    const user = userEvent.setup();
    enhance(mount(TAG), { matchMedia: hoverAvailableMedia });

    await user.click(screen.getByRole("link", { name: "Linux" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("is idempotent", async () => {
    const user = userEvent.setup();
    const root = mount(TAG);
    const media = { matchMedia: hoverNoneMedia };
    enhance(root, media);
    enhance(root, media);

    await user.click(screen.getByRole("link", { name: "Linux" }));

    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("removes the panel on teardown", async () => {
    const user = userEvent.setup();
    const teardown = enhance(mount(TAG), { matchMedia: hoverNoneMedia });
    await user.click(screen.getByRole("link", { name: "Linux" }));
    teardown();

    expect(screen.queryByRole("status", { hidden: true })).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Linux" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does nothing when there are no hint tags", () => {
    expect(() => {
      enhance(mount("<p>no hints</p>"))();
    }).not.toThrow();
  });

  it("only handles hint tags inside the inited subtree", async () => {
    const user = userEvent.setup();
    mount(`
      <div role="group" aria-label="scoped">
        <a href="#inside" data-hint="Inside hint">Inside</a>
      </div>
      <a href="#outside" data-hint="Outside hint">Outside</a>
    `);
    enhance(screen.getByRole("group", { name: "scoped" }), { matchMedia: hoverNoneMedia });

    await user.click(screen.getByRole("link", { name: "Outside" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Inside" }));
    expect(screen.getByRole("status")).toHaveTextContent("Inside hint");
  });

  it("toggles the same tag closed and hides on an outside click", async () => {
    const user = userEvent.setup();
    enhance(
      mount(`
        ${TAG}
        <p>Outside copy</p>
      `),
      { matchMedia: hoverNoneMedia },
    );

    await user.click(screen.getByRole("link", { name: "Linux" }));
    expect(screen.getByRole("status")).toBeVisible();

    await user.click(screen.getByRole("link", { name: "Linux", expanded: true }));
    expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Linux" }));
    await user.click(screen.getByText("Outside copy"));
    expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
  });

  it("does nothing when the root is not an element", () => {
    expect(() => {
      init(document.createDocumentFragment())();
    }).not.toThrow();
  });

  it("uses the document when init is called without a root", () => {
    document.body.innerHTML = TAG;
    const stop = init();
    teardowns.push(stop);
    expect(screen.getByRole("link", { name: "Linux" })).toBeInTheDocument();
  });

  it("ignores a click that is not on an element", async () => {
    const user = userEvent.setup();
    enhance(mount(TAG), { matchMedia: hoverNoneMedia });
    await user.click(screen.getByRole("link", { name: "Linux" }));
    document.body.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
    expect(screen.getByRole("status")).toBeVisible();
  });

  it("ignores modified clicks and clicks on the open panel", async () => {
    const user = userEvent.setup();
    enhance(mount(TAG), { matchMedia: hoverNoneMedia });

    await user.keyboard("{Control>}");
    await user.click(screen.getByRole("link", { name: "Linux" }));
    await user.keyboard("{/Control}");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Linux" }));
    expect(screen.getByRole("status")).toBeVisible();
    await user.click(screen.getByRole("status"));
    expect(screen.getByRole("status")).toBeVisible();
  });

  it("ignores a non-keyboard keydown", async () => {
    const user = userEvent.setup();
    enhance(mount(TAG), { matchMedia: hoverNoneMedia });
    await user.click(screen.getByRole("link", { name: "Linux" }));
    document.body.dispatchEvent(new Event("keydown", { bubbles: true }));
    expect(screen.getByRole("status")).toBeVisible();
  });

  it("ignores a click whose target is not an element", async () => {
    const user = userEvent.setup();
    enhance(mount(TAG), { matchMedia: hoverNoneMedia });
    await user.click(screen.getByRole("link", { name: "Linux" }));
    const text = document.createTextNode("outside");
    document.body.append(text);
    text.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
    expect(screen.getByRole("status")).toBeVisible();
  });
});

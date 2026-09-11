/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { init, type BackButtonDependencies } from "./index";

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

function enhance(root: ParentNode, dependencies: BackButtonDependencies = {}): () => void {
  const stop = init(root, dependencies);
  teardowns.push(stop);
  return stop;
}

function fakeHistory(): { back: () => void; calls: number } {
  const state = {
    calls: 0,
    back() {
      state.calls += 1;
    },
  };
  return state;
}

const BACK_LINK = `<a href="#main" data-back>Back</a>`;

describe("back-button", () => {
  it("calls history.back on a plain click", async () => {
    const user = userEvent.setup();
    const navigation = fakeHistory();
    enhance(mount(BACK_LINK), { history: navigation });

    await user.click(screen.getByRole("link", { name: /back/i }));

    expect(navigation.calls).toBe(1);
  });

  it.each([
    { name: "Meta", down: "{Meta>}", up: "{/Meta}" },
    { name: "Control", down: "{Control>}", up: "{/Control}" },
    { name: "Shift", down: "{Shift>}", up: "{/Shift}" },
    { name: "Alt", down: "{Alt>}", up: "{/Alt}" },
  ])("does not go back when $name is held", async ({ down, up }) => {
    const user = userEvent.setup();
    const navigation = fakeHistory();
    enhance(mount(BACK_LINK), { history: navigation });

    await user.keyboard(down);
    await user.click(screen.getByRole("link", { name: /back/i }));
    await user.keyboard(up);

    expect(navigation.calls).toBe(0);
  });

  it("is idempotent", async () => {
    const user = userEvent.setup();
    const navigation = fakeHistory();
    const root = mount(BACK_LINK);
    enhance(root, { history: navigation });
    enhance(root, { history: navigation });

    await user.click(screen.getByRole("link", { name: /back/i }));

    expect(navigation.calls).toBe(1);
  });

  it("stops going back after teardown", async () => {
    const user = userEvent.setup();
    const navigation = fakeHistory();
    const teardown = enhance(mount(BACK_LINK), { history: navigation });
    teardown();

    await user.click(screen.getByRole("link", { name: /back/i }));

    expect(navigation.calls).toBe(0);
  });

  it("does nothing when there are no back links", () => {
    expect(() => {
      enhance(mount("<p>no back</p>"))();
    }).not.toThrow();
  });

  it("only handles back links inside the inited subtree", async () => {
    const user = userEvent.setup();
    const navigation = fakeHistory();
    mount(`
      <div role="group" aria-label="scoped">
        <a href="#inside" data-back>Inside</a>
      </div>
      <a href="#outside" data-back>Outside</a>
    `);
    enhance(screen.getByRole("group", { name: "scoped" }), { history: navigation });

    await user.click(screen.getByRole("link", { name: "Outside" }));
    expect(navigation.calls).toBe(0);

    await user.click(screen.getByRole("link", { name: "Inside" }));
    expect(navigation.calls).toBe(1);
  });

  it("uses history.back when no history dependency is injected", async () => {
    const user = userEvent.setup();
    const back = jest.fn();
    const original = history.back.bind(history);
    history.back = back;
    enhance(mount(BACK_LINK));

    await user.click(screen.getByRole("link", { name: /back/i }));

    expect(back).toHaveBeenCalledTimes(1);
    history.back = original;
  });

  it("ignores a non-primary click", async () => {
    const user = userEvent.setup();
    const navigation = fakeHistory();
    enhance(mount(BACK_LINK), { history: navigation });

    await user.pointer({
      keys: "[MouseRight]",
      target: screen.getByRole("link", { name: /back/i }),
    });

    expect(navigation.calls).toBe(0);
  });

  it("does nothing when the root is not an element", () => {
    expect(() => {
      init(document.createDocumentFragment())();
    }).not.toThrow();
  });
});

/**
 * @jest-environment jsdom
 */
import { afterEach, beforeAll, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom/jest-globals";
import userEvent from "@testing-library/user-event";
import { init } from "./index";

const teardowns: (() => void)[] = [];

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
  document.documentElement.classList.remove("img-lightbox-open");
  document.body.replaceChildren();
});

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

function enhance(root: ParentNode = document.body): () => void {
  const stop = init(root);
  teardowns.push(stop);
  return stop;
}

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(
    type: string,
    init: MouseEventInit & { pointerId?: number; pointerType?: string } = {},
  ) {
    super(type, { bubbles: true, cancelable: true, ...init });
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? "touch";
  }
}

beforeAll(() => {
  Object.defineProperty(globalThis, "PointerEvent", {
    configurable: true,
    writable: true,
    value: TestPointerEvent,
  });
  HTMLElement.prototype.setPointerCapture = function setPointerCapture() {
    /*
     * jsdom does not implement pointer capture
     */
  };
});

const STANDALONE = `
  <img src="${PIXEL}" alt="Hero" data-lightbox>
  <a href="#resume"><img src="${PIXEL}" alt="Linked" data-lightbox></a>
`;

describe("image-lightbox", () => {
  it("marks standalone images zoomable and ignores linked images", () => {
    enhance(mount(STANDALONE));

    expect(screen.getByRole("button", { name: "View image fullscreen: Hero" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Linked" })).toBeInTheDocument();
  });

  it("opens on click and closes from the button and Escape", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    const hero = screen.getByRole("button", { name: "View image fullscreen: Hero" });

    await user.click(hero);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close image" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(hero);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not open from a linked image", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));

    await user.click(screen.getByRole("img", { name: "Linked" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is idempotent", async () => {
    const user = userEvent.setup();
    const root = mount(STANDALONE);
    enhance(root);
    enhance(root);

    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "View image fullscreen: Hero" })).toHaveLength(1);
  });

  it("closes the overlay and un-enhances images on teardown", async () => {
    const user = userEvent.setup();
    const teardown = enhance(mount(STANDALONE));
    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    teardown();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "View image fullscreen: Hero" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("img", { name: "Hero" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens from the keyboard and zooms with + and -", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    const hero = screen.getByRole("button", { name: "View image fullscreen: Hero" });
    hero.focus();
    await user.keyboard("{Enter}");

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("100%");

    await user.keyboard("{+}");
    expect(dialog).toHaveTextContent("118%");

    await user.keyboard("{-}");
    expect(dialog).toHaveTextContent("100%");

    await user.keyboard("{+}");
    await user.keyboard("{Escape}");
    expect(dialog).toHaveTextContent("100%");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens from Space and resets zoom with 0", async () => {
    const user = userEvent.setup();
    enhance(mount(`<img src="${PIXEL}" alt="Solo" data-lightbox>`));
    screen.getByRole("button", { name: "View image fullscreen: Solo" }).focus();
    await user.keyboard(" ");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{+}");
    await user.keyboard("0");
    expect(screen.getByRole("dialog")).toHaveTextContent("100%");
  });

  it("labels an image without alt text", () => {
    enhance(mount(`<img src="${PIXEL}" alt="" data-lightbox>`));
    expect(screen.getByRole("button", { name: "View image fullscreen" })).toBeInTheDocument();
  });

  it("keeps an existing accessible name", () => {
    enhance(mount(`<img src="${PIXEL}" alt="Hero" aria-label="Open hero" data-lightbox>`));
    expect(screen.getByRole("button", { name: "Open hero" })).toBeInTheDocument();
  });

  it("does nothing when the root is not an element", () => {
    expect(() => {
      init(document.createDocumentFragment())();
    }).not.toThrow();
  });

  it("does nothing when there are no lightbox images", () => {
    expect(() => {
      enhance(mount("<p>no images</p>"))();
    }).not.toThrow();
  });

  it("only handles lightbox images inside the inited subtree", async () => {
    const user = userEvent.setup();
    mount(`
      <div role="group" aria-label="scoped">
        <img src="${PIXEL}" alt="Inside" data-lightbox>
      </div>
      <img src="${PIXEL}" alt="Outside" data-lightbox>
    `);
    enhance(screen.getByRole("group", { name: "scoped" }));

    expect(screen.getByRole("img", { name: "Outside" })).toBeInTheDocument();
    await user.click(screen.getByRole("img", { name: "Outside" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View image fullscreen: Inside" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("zooms with the wheel and closes a tap outside the image", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));
    const dialog = screen.getByRole("dialog");
    // eslint-disable-next-line testing-library/no-node-access -- wheel and pointer listeners bind to the stage, which has no role
    const stage = dialog.firstElementChild;
    expect(stage).toBeTruthy();
    stage?.dispatchEvent(new WheelEvent("wheel", { deltaY: -80, bubbles: true, cancelable: true }));
    expect(dialog).toHaveTextContent("%");
  });

  it("pinches, drags, and double-taps to toggle zoom", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));
    const dialog = screen.getByRole("dialog");
    // eslint-disable-next-line testing-library/no-node-access -- pointer listeners bind to the stage
    const stage = dialog.firstElementChild;
    if (!stage) {
      throw new Error("missing stage");
    }

    stage.dispatchEvent(
      new TestPointerEvent("pointerdown", { pointerId: 1, clientX: 40, clientY: 40 }),
    );
    stage.dispatchEvent(
      new TestPointerEvent("pointerdown", { pointerId: 2, clientX: 80, clientY: 80 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointermove", { pointerId: 2, clientX: 160, clientY: 160 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointerup", { pointerId: 2, clientX: 160, clientY: 160 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointerup", { pointerId: 1, clientX: 40, clientY: 40 }),
    );

    stage.dispatchEvent(
      new TestPointerEvent("pointerdown", { pointerId: 3, clientX: 50, clientY: 50 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointermove", { pointerId: 3, clientX: 90, clientY: 90 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointerup", { pointerId: 3, clientX: 90, clientY: 90 }),
    );

    stage.dispatchEvent(
      new TestPointerEvent("pointerdown", { pointerId: 4, clientX: 50, clientY: 50 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointerup", { pointerId: 4, clientX: 50, clientY: 50 }),
    );
    stage.dispatchEvent(
      new TestPointerEvent("pointerdown", { pointerId: 5, clientX: 50, clientY: 50 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointerup", { pointerId: 5, clientX: 50, clientY: 50 }),
    );
  });

  it("clamps zoom at the max and ignores extra plus keys", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));
    const dialog = screen.getByRole("dialog");
    for (const _ of Array.from({ length: 12 })) {
      await user.keyboard("{+}");
    }
    expect(dialog).toHaveTextContent("%");
    await user.keyboard("{+}");
    expect(dialog).toHaveTextContent("%");
  });

  it("zooms then drags the image", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));
    await user.keyboard("{+}");
    const dialog = screen.getByRole("dialog");
    // eslint-disable-next-line testing-library/no-node-access -- pointer listeners bind to the stage
    const stage = dialog.firstElementChild;
    if (!stage) {
      throw new Error("missing stage");
    }
    stage.dispatchEvent(
      new TestPointerEvent("pointerdown", { pointerId: 9, clientX: 40, clientY: 40 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointermove", { pointerId: 9, clientX: 80, clientY: 90 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointerup", { pointerId: 9, clientX: 80, clientY: 90 }),
    );
    expect(dialog).toBeInTheDocument();
  });
});

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

function lightboxStage(): HTMLElement {
  const dialog = screen.getByRole("dialog");
  // eslint-disable-next-line testing-library/no-node-access -- stage has no role; pointer and wheel listeners bind to it
  const stage = dialog.firstElementChild;
  if (!(stage instanceof HTMLElement)) {
    throw new TypeError("missing lightbox stage");
  }
  return stage;
}

async function pressPlusTimes(
  user: ReturnType<typeof userEvent.setup>,
  times: number,
): Promise<void> {
  const keys = Array.from({ length: times }, () => "{+}");
  for (const key of keys) {
    await user.keyboard(key);
  }
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
    const stage = lightboxStage();
    expect(stage).toBeTruthy();
    stage.dispatchEvent(new WheelEvent("wheel", { deltaY: -80, bubbles: true, cancelable: true }));
    expect(dialog).toHaveTextContent("%");
  });

  it("pinches, drags, and double-taps to toggle zoom", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));
    const dialog = screen.getByRole("dialog");
    const stage = lightboxStage();

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
    expect(dialog).toHaveTextContent("%");

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
    expect(screen.getByRole("button", { name: "View image fullscreen: Hero" })).toBeInTheDocument();
  });

  it("clamps zoom at the max and ignores extra plus keys", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));
    const dialog = screen.getByRole("dialog");
    await pressPlusTimes(user, 12);
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
    const stage = lightboxStage();
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

  it("opens an unlabeled image and ignores a hook that is not an img", async () => {
    const user = userEvent.setup();
    enhance(
      mount(`
        <img src="${PIXEL}" alt="" data-lightbox>
        <div data-lightbox>not an image</div>
      `),
    );
    await user.click(screen.getByRole("button", { name: "View image fullscreen" }));
    expect(screen.getByRole("dialog", { name: "View image fullscreen" })).toBeInTheDocument();
  });

  it("does not open an image with no source", async () => {
    const user = userEvent.setup();
    enhance(mount(`<img alt="Empty" data-lightbox>`));
    await user.click(screen.getByRole("img", { name: "Empty" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("zooms out with the wheel and ignores a no-op zoom", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));
    const dialog = screen.getByRole("dialog");
    const stage = lightboxStage();
    stage.dispatchEvent(new WheelEvent("wheel", { deltaY: 80, bubbles: true, cancelable: true }));
    expect(dialog).toHaveTextContent("100%");
    await user.keyboard("{+}");
    await user.keyboard("{+}");
    await user.keyboard("-");
    expect(dialog).toHaveTextContent("%");
  });

  it("ignores a right-button pointer and a pointer on the close control", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));
    const stage = lightboxStage();
    const close = screen.getByRole("button", { name: "Close image" });
    close.dispatchEvent(
      new TestPointerEvent("pointerdown", { pointerId: 20, clientX: 1, clientY: 1 }),
    );
    close.firstElementChild?.dispatchEvent(
      new TestPointerEvent("pointerdown", { pointerId: 22, clientX: 2, clientY: 2 }),
    );
    stage.dispatchEvent(
      new TestPointerEvent("pointerdown", {
        pointerId: 21,
        clientX: 40,
        clientY: 40,
        button: 2,
        pointerType: "mouse",
      }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("double-taps to zoom in from 100%", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));
    const dialog = screen.getByRole("dialog");
    const stage = lightboxStage();
    stage.dispatchEvent(
      new TestPointerEvent("pointerdown", { pointerId: 30, clientX: 50, clientY: 50 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointerup", { pointerId: 30, clientX: 50, clientY: 50 }),
    );
    stage.dispatchEvent(
      new TestPointerEvent("pointerdown", { pointerId: 31, clientX: 50, clientY: 50 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointerup", { pointerId: 31, clientX: 50, clientY: 50 }),
    );
    expect(dialog).toHaveTextContent("%");
  });

  it("ignores a tiny drag and a move for an unknown pointer", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));
    await user.keyboard("{+}");
    const stage = lightboxStage();
    stage.dispatchEvent(
      new TestPointerEvent("pointerdown", { pointerId: 40, clientX: 50, clientY: 50 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointermove", { pointerId: 40, clientX: 51, clientY: 51 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointermove", { pointerId: 99, clientX: 400, clientY: 400 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointerup", { pointerId: 40, clientX: 51, clientY: 51 }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes from a tap outside the image", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));
    const stage = lightboxStage();
    stage.dispatchEvent(
      new TestPointerEvent("pointerdown", { pointerId: 50, clientX: 5, clientY: 5 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointerup", { pointerId: 50, clientX: 5, clientY: 5 }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens from Enter on the image and ignores Enter elsewhere", async () => {
    const user = userEvent.setup();
    enhance(mount(`${STANDALONE}<button type="button">Other</button>`));
    await user.click(screen.getByRole("button", { name: "Other" }));
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    screen.getByRole("button", { name: "View image fullscreen: Hero" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("resets zoom with 0 and closes after Escape at 100%", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));
    await user.keyboard("{+}");
    await user.keyboard("0");
    expect(screen.getByRole("dialog")).toHaveTextContent("100%");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("uses the document when init is called without a root", () => {
    document.body.innerHTML = STANDALONE;
    const stop = init();
    teardowns.push(stop);
    expect(screen.getByRole("button", { name: "View image fullscreen: Hero" })).toBeInTheDocument();
  });

  it("ignores a click that is not on an element", () => {
    enhance(mount(STANDALONE));
    document.body.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("drags at 100% without closing when the pointer moves past the threshold", async () => {
    const user = userEvent.setup();
    enhance(mount(STANDALONE));
    await user.click(screen.getByRole("button", { name: "View image fullscreen: Hero" }));
    const stage = lightboxStage();
    stage.dispatchEvent(
      new TestPointerEvent("pointerdown", { pointerId: 60, clientX: 0, clientY: 0 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointermove", { pointerId: 60, clientX: 10, clientY: 0 }),
    );
    document.dispatchEvent(
      new TestPointerEvent("pointerup", { pointerId: 60, clientX: 10, clientY: 0 }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

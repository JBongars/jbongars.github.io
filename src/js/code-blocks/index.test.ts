/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom/jest-globals";
import userEvent from "@testing-library/user-event";
import { CODE_BLOCK_HOOK, init, INLINE_CODE_HOOK, type CodeBlockDependencies } from "./index";

const teardowns: (() => void)[] = [];
const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");

afterEach(() => {
  for (const stop of teardowns) {
    stop();
  }
  teardowns.length = 0;
  document.body.replaceChildren();
  document.documentElement.className = "";
  if (originalScrollHeight) {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalScrollHeight);
  }
  jest.useRealTimers();
});

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

function enhance(root: ParentNode, dependencies: CodeBlockDependencies = {}): () => void {
  const stop = init(root, dependencies);
  teardowns.push(stop);
  return stop;
}

function fakeClipboard(): { writeText: (text: string) => Promise<void>; texts: string[] } {
  const texts: string[] = [];
  return {
    texts,
    writeText(text: string): Promise<void> {
      texts.push(text);
      return Promise.resolve();
    },
  };
}

const FENCE = `<pre data-code-block class="language-js"><code>echo hi</code></pre>`;

describe("code-blocks", () => {
  it("adds a copy button that copies the block's text", async () => {
    const user = userEvent.setup();
    const clipboard = fakeClipboard();
    enhance(mount(FENCE), { clipboard });

    await user.click(screen.getByRole("button", { name: /copy/i }));

    expect(clipboard.texts).toEqual(["echo hi"]);
  });

  it("opens and closes fullscreen with Escape", async () => {
    const user = userEvent.setup();
    enhance(mount(FENCE), { clipboard: fakeClipboard() });

    await user.click(screen.getByRole("button", { name: /open code fullscreen/i }));

    expect(screen.getByRole("dialog", { name: /code fullscreen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close fullscreen/i })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: /code fullscreen/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open code fullscreen/i })).toHaveFocus();
  });

  it("is idempotent", () => {
    const root = mount(FENCE);
    enhance(root);
    enhance(root);

    expect(screen.getAllByRole("button", { name: /copy/i })).toHaveLength(1);
  });

  it("removes its controls on teardown", async () => {
    const user = userEvent.setup();
    const teardown = enhance(mount(FENCE), { clipboard: fakeClipboard() });
    await user.click(screen.getByRole("button", { name: /open code fullscreen/i }));
    teardown();

    expect(screen.queryByRole("button", { name: /copy/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /code fullscreen/i })).not.toBeInTheDocument();
    expect(screen.getByText("echo hi")).toBeInTheDocument();
  });

  it("does nothing when there are no code blocks", () => {
    expect(() => {
      enhance(mount("<p>no code</p>"))();
    }).not.toThrow();
  });

  it("only enhances code blocks inside the inited subtree", async () => {
    const user = userEvent.setup();
    const clipboard = fakeClipboard();
    mount(`
      <div role="group" aria-label="scoped">
        <pre data-code-block><code>inside</code></pre>
      </div>
      <pre data-code-block><code>outside</code></pre>
    `);
    enhance(screen.getByRole("group", { name: "scoped" }), { clipboard });

    expect(screen.getAllByRole("button", { name: /copy/i })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /copy/i }));

    expect(clipboard.texts).toEqual(["inside"]);
  });

  it("copies inline code on click", async () => {
    const user = userEvent.setup();
    const clipboard = fakeClipboard();
    enhance(mount(`<p>Use <code data-inline-code>ready</code> in the shell.</p>`), { clipboard });

    await user.click(screen.getByRole("button", { name: "Copy ready" }));

    expect(clipboard.texts).toEqual(["ready"]);
  });

  it("exports the template hooks", () => {
    expect(CODE_BLOCK_HOOK).toBe("[data-code-block]");
    expect(INLINE_CODE_HOOK).toBe("[data-inline-code]");
  });

  it("collapses tall blocks and copies after a clipboard failure", async () => {
    const user = userEvent.setup();
    const clipboard = {
      texts: [] as string[],
      writeText(text: string): Promise<void> {
        if (this.texts.length === 0) {
          this.texts.push("fail");
          return Promise.reject(new Error("blocked"));
        }
        this.texts.push(text);
        return Promise.resolve();
      },
    };
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return 800;
      },
    });
    enhance(mount(FENCE), {
      clipboard,
      viewportHeight: () => 100,
      scrollBy() {
        /*
         * unused
         */
      },
    });

    const more = screen.getByRole("button", { name: /show more/i });
    await user.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    await user.click(more);
    expect(more).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: /copy/i }));
    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(clipboard.texts.at(-1)).toBe("echo hi");
  });

  it("treats plaintext language as unlabeled code", () => {
    enhance(mount(`<pre data-code-block class="language-text"><code>plain</code></pre>`), {
      clipboard: fakeClipboard(),
    });
    expect(screen.queryByText(/^text$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("copies inline code from the keyboard", async () => {
    const user = userEvent.setup();
    const clipboard = fakeClipboard();
    enhance(mount(`<p>Use <code data-inline-code>ready</code> in the shell.</p>`), { clipboard });
    screen.getByRole("button", { name: "Copy ready" }).focus();
    await user.keyboard("{Enter}");
    expect(clipboard.texts).toEqual(["ready"]);
  });

  it("ignores a blocked inline copy", async () => {
    const user = userEvent.setup();
    enhance(mount(`<p>Use <code data-inline-code>ready</code> in the shell.</p>`), {
      clipboard: {
        writeText() {
          return Promise.reject(new Error("blocked"));
        },
      },
    });
    await user.click(screen.getByRole("button", { name: "Copy ready" }));
    expect(screen.getByRole("button", { name: "Copy ready" })).toBeInTheDocument();
  });

  it("resets the inline copy label after the copied delay", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    enhance(mount(`<p>Use <code data-inline-code>ready</code> in the shell.</p>`), {
      clipboard: fakeClipboard(),
    });
    await user.click(screen.getByRole("button", { name: "Copy ready" }));
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    await jest.advanceTimersByTimeAsync(1600);
    expect(screen.getByRole("button", { name: "Copy ready" })).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("counts a trailing newline as a single line", () => {
    enhance(mount(`<pre data-code-block class="language-js"><code>\n</code></pre>`), {
      clipboard: fakeClipboard(),
    });
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("skips a code block that is already wrapped", () => {
    const root = mount(FENCE);
    enhance(root, { clipboard: fakeClipboard() });
    const copy = screen.getByRole("button", { name: /copy/i });
    const wrap = copy.parentElement?.parentElement?.parentElement;
    if (!wrap) {
      throw new Error("missing wrapper");
    }
    enhance(wrap, { clipboard: fakeClipboard() });
    expect(screen.getAllByRole("button", { name: /copy/i })).toHaveLength(1);
  });

  it("does not remount inline copy on a second root", async () => {
    const user = userEvent.setup();
    const clipboard = fakeClipboard();
    mount(`<p>Use <code data-inline-code>ready</code> in the shell.</p>`);
    enhance(document, { clipboard });
    enhance(screen.getByRole("button", { name: "Copy ready" }), { clipboard });
    await user.click(screen.getByRole("button", { name: "Copy ready" }));
    expect(clipboard.texts).toEqual(["ready"]);
  });

  it("closes fullscreen from the backdrop", async () => {
    const user = userEvent.setup();
    enhance(mount(FENCE), { clipboard: fakeClipboard() });
    await user.click(screen.getByRole("button", { name: /open code fullscreen/i }));
    const dialog = screen.getByRole("dialog", { name: /code fullscreen/i });

    dialog.firstElementChild?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(screen.queryByRole("dialog", { name: /code fullscreen/i })).not.toBeInTheDocument();
  });

  it("labels fullscreen plaintext as code", async () => {
    const user = userEvent.setup();
    enhance(mount(`<pre data-code-block><code>plain</code></pre>`), {
      clipboard: fakeClipboard(),
    });
    await user.click(screen.getByRole("button", { name: /open code fullscreen/i }));
    expect(screen.getByRole("dialog", { name: /code fullscreen/i })).toHaveTextContent("code");
  });

  it("skips inline code inside a link", () => {
    enhance(mount(`<p><a href="#x"><code data-inline-code>linked</code></a></p>`), {
      clipboard: fakeClipboard(),
    });
    expect(screen.queryByRole("button", { name: /copy linked/i })).not.toBeInTheDocument();
  });

  it("does nothing when the root is not an element", () => {
    expect(() => {
      init(document.createDocumentFragment())();
    }).not.toThrow();
  });

  it("enhances a root that is itself a code block", () => {
    document.body.innerHTML = FENCE;
    const block = screen.getByText("echo hi").closest("pre");
    if (!block) {
      throw new Error("missing pre");
    }
    enhance(block, { clipboard: fakeClipboard() });
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("closes fullscreen from the close button", async () => {
    const user = userEvent.setup();
    enhance(mount(FENCE), { clipboard: fakeClipboard() });
    await user.click(screen.getByRole("button", { name: /open code fullscreen/i }));
    await user.click(screen.getByRole("button", { name: /close fullscreen/i }));
    expect(screen.queryByRole("dialog", { name: /code fullscreen/i })).not.toBeInTheDocument();
  });

  it("copies an empty code block as a single line", async () => {
    const user = userEvent.setup();
    const clipboard = fakeClipboard();
    enhance(mount(`<pre data-code-block class="language-js"><code></code></pre>`), { clipboard });
    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(clipboard.texts).toEqual([""]);
  });

  it("resets the copy button after the copied delay", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: (delay) => {
        jest.advanceTimersByTime(delay);
      },
    });
    const clipboard = fakeClipboard();
    enhance(mount(FENCE), { clipboard });
    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();
    await jest.advanceTimersByTimeAsync(1600);
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    jest.useRealTimers();
  });
});

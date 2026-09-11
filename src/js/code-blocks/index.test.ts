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

function nextRectTop(tops: number[]): number {
  const top = tops.shift();
  if (top === undefined) {
    return 0;
  }
  return top;
}

function clipboardFailOnce(): { writeText: (text: string) => Promise<void>; texts: string[] } {
  const texts: string[] = [];
  return {
    texts,
    writeText(text: string): Promise<void> {
      if (texts.length === 0) {
        texts.push("fail");
        return Promise.reject(new Error("blocked"));
      }
      texts.push(text);
      return Promise.resolve();
    },
  };
}

function fencePre(): HTMLPreElement {
  const block = document.createElement("pre");
  block.dataset["codeBlock"] = "";
  block.className = "language-js";
  const code = document.createElement("code");
  code.textContent = "echo hi";
  block.append(code);
  document.body.append(block);
  return block;
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
    const clipboard = clipboardFailOnce();
    const scrolled: number[] = [];
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return 800;
      },
    });
    enhance(mount(`<header class="site-header">Site</header>${FENCE}`), {
      clipboard,
      viewportHeight: () => 100,
      scrollBy(_x, y) {
        scrolled.push(y);
      },
    });

    const more = screen.getByRole("button", { name: /show more/i });
    // eslint-disable-next-line testing-library/no-node-access -- collapse measures the wrap, which has no role
    const wrap = more.parentElement!;
    const buttonTops = [200, 40];
    Object.defineProperty(more, "getBoundingClientRect", {
      configurable: true,
      value() {
        const top = nextRectTop(buttonTops);
        return {
          x: 0,
          y: top,
          top,
          bottom: top + 20,
          left: 0,
          right: 80,
          width: 80,
          height: 20,
          toJSON() {
            return {};
          },
        };
      },
    });
    Object.defineProperty(wrap, "getBoundingClientRect", {
      configurable: true,
      value() {
        return {
          x: 0,
          y: 400,
          top: 400,
          bottom: 800,
          left: 0,
          right: 400,
          width: 400,
          height: 400,
          toJSON() {
            return {};
          },
        };
      },
    });
    await user.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    await user.click(more);
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(scrolled).toEqual([-160]);

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
    // eslint-disable-next-line testing-library/no-node-access -- .code-block wrap is presentational and has no role
    const wrap = document.querySelector(".code-block");
    expect(wrap).toBeTruthy();
    enhance(wrap!, { clipboard: fakeClipboard() });
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
    enhance(fencePre(), { clipboard: fakeClipboard() });
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

  it("uses the document when init is called without a root", () => {
    document.body.innerHTML = FENCE;
    const stop = init();
    teardowns.push(stop);
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("copies inline code from Space and ignores other keys", async () => {
    const user = userEvent.setup();
    const clipboard = fakeClipboard();
    enhance(mount(`<p>Use <code data-inline-code>ready</code> in the shell.</p>`), { clipboard });
    screen.getByRole("button", { name: "Copy ready" }).focus();
    await user.keyboard("x");
    expect(clipboard.texts).toEqual([]);
    await user.keyboard(" ");
    expect(clipboard.texts).toEqual(["ready"]);
  });

  it("ignores a non-Escape key while fullscreen is open", async () => {
    const user = userEvent.setup();
    enhance(mount(FENCE), { clipboard: fakeClipboard() });
    await user.click(screen.getByRole("button", { name: /open code fullscreen/i }));
    await user.keyboard("a");
    expect(screen.getByRole("dialog", { name: /code fullscreen/i })).toBeInTheDocument();
  });
});

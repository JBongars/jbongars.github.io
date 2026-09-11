/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { init } from "./index";

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

function enhance(root: ParentNode = document.body): () => void {
  const stop = init(root);
  teardowns.push(stop);
  return stop;
}

const NESTED = `
<ul>
  <li data-task-item>
    <input type="checkbox" data-task-checkbox aria-label="Parent">
    <ul>
      <li data-task-item>
        <input type="checkbox" data-task-checkbox aria-label="Child">
      </li>
    </ul>
  </li>
</ul>
`;

describe("hacklas-checklists", () => {
  it("checks descendants when a parent is checked", async () => {
    const user = userEvent.setup();
    enhance(mount(NESTED));

    await user.click(screen.getByRole("checkbox", { name: "Parent" }));

    expect(screen.getByRole("checkbox", { name: "Child" })).toBeChecked();
  });

  it("is idempotent", async () => {
    const user = userEvent.setup();
    const root = mount(NESTED);
    enhance(root);
    enhance(root);

    await user.click(screen.getByRole("checkbox", { name: "Parent" }));

    expect(screen.getByRole("checkbox", { name: "Child" })).toBeChecked();
  });

  it("stops toggling descendants after teardown", async () => {
    const user = userEvent.setup();
    const teardown = enhance(mount(NESTED));
    teardown();

    await user.click(screen.getByRole("checkbox", { name: "Parent" }));

    expect(screen.getByRole("checkbox", { name: "Child" })).not.toBeChecked();
  });

  it("does nothing when there are no task items", () => {
    expect(() => {
      enhance(mount("<p>no tasks</p>"))();
    }).not.toThrow();
  });

  it("only handles checkboxes inside the inited subtree", async () => {
    const user = userEvent.setup();
    mount(`
      <div role="group" aria-label="scoped">${NESTED}</div>
      <ul>
        <li data-task-item>
          <input type="checkbox" data-task-checkbox aria-label="Outside parent">
          <ul>
            <li data-task-item>
              <input type="checkbox" data-task-checkbox aria-label="Outside child">
            </li>
          </ul>
        </li>
      </ul>
    `);
    enhance(screen.getByRole("group", { name: "scoped" }));

    await user.click(screen.getByRole("checkbox", { name: "Outside parent" }));
    expect(screen.getByRole("checkbox", { name: "Outside child" })).not.toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: "Parent" }));
    expect(screen.getByRole("checkbox", { name: "Child" })).toBeChecked();
  });

  it("unchecks descendants and then syncs the parent from a child", async () => {
    const user = userEvent.setup();
    enhance(mount(NESTED));

    await user.click(screen.getByRole("checkbox", { name: "Parent" }));
    expect(screen.getByRole("checkbox", { name: "Child" })).toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: "Child" }));

    expect(screen.getByRole("checkbox", { name: "Child" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Parent" })).not.toBeChecked();
  });

  it("ignores change events from unrelated inputs", async () => {
    const user = userEvent.setup();
    enhance(
      mount(`
        ${NESTED}
        <input type="checkbox" aria-label="Other">
      `),
    );

    await user.click(screen.getByRole("checkbox", { name: "Other" }));

    expect(screen.getByRole("checkbox", { name: "Parent" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Child" })).not.toBeChecked();
  });

  it("does nothing when the root is not an element", () => {
    expect(() => {
      init(document.createDocumentFragment())();
    }).not.toThrow();
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { JSDOM, VirtualConsole } from "jsdom";

const CLIENT_JS = path.join(import.meta.dirname, "../../../src/js");

function createVirtualConsole() {
  const jsdomConsole = new VirtualConsole();
  jsdomConsole.on("jsdomError", (error) => {
    if (error.type === "unhandled-exception") {
      throw error.cause ?? error;
    }
  });
  return jsdomConsole;
}

function defaultMatchMedia(query) {
  return { matches: false, media: query };
}

export function runClientScript(fileName, html, options = {}) {
  const dom = new JSDOM(html, {
    url: options.url ?? "http://localhost:8080/",
    pretendToBeVisual: true,
    runScripts: "outside-only",
    virtualConsole: createVirtualConsole(),
  });
  dom.window.matchMedia = defaultMatchMedia;
  if (typeof options.innerHeight === "number") {
    Object.defineProperty(dom.window, "innerHeight", {
      value: options.innerHeight,
    });
  }
  if (options.setup) {
    options.setup(dom.window);
  }
  vm.runInContext(readFileSync(path.join(CLIENT_JS, fileName), "utf8"), dom.getInternalVMContext());
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  return dom;
}

export function tree(document) {
  const serialize = new document.defaultView.XMLSerializer();
  return {
    htmlClass: document.documentElement.className,
    head: serialize.serializeToString(document.head),
    body: serialize.serializeToString(document.body),
  };
}

export function click(window, element, init = {}) {
  if (!element) {
    throw new Error("click: missing element");
  }
  const event = new window.MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });
  element.dispatchEvent(event);
  return event;
}

export function keydown(window, target, key, init = {}) {
  const event = new window.KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

export function fillInput(window, element, value) {
  element.value = value;
  element.dispatchEvent(new window.Event("input", { bubbles: true }));
}

export function stubMatchMedia(window, matchesFor) {
  window.matchMedia = function matchMedia(query) {
    return { matches: matchesFor(query), media: query };
  };
}

export function stubClipboard(window) {
  const written = [];
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText(text) {
        written.push(text);
        return Promise.resolve();
      },
    },
  });
  return written;
}

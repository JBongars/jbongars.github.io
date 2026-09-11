/* Progressive enhancement: toolbar, line numbers, collapse, fullscreen.
   Hydrated only when .prose pre is present. Safe without this file. */
(function enhanceCodeBlocks() {
  "use strict";

  const MAX_VH = 20;
  const COPY_RESET_MS = 1600;
  let activeFs;

  function svgIcon(paths) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "code-block__icon");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    for (const d of paths) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("fill", "currentColor");
      path.setAttribute("d", d);
      svg.append(path);
    }
    return svg;
  }

  const ICONS = {
    copy: svgIcon([
      "M5.5 2A1.5 1.5 0 0 0 4 3.5v8A1.5 1.5 0 0 0 5.5 13h6a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 11.5 2h-6zm0 1h6a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5z",
      "M2.5 4A1.5 1.5 0 0 0 1 5.5v8A1.5 1.5 0 0 0 2.5 15h6a1.5 1.5 0 0 0 1.5-1.5V13H9v.5a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5H3V4h-.5z",
    ]),
    check: svgIcon([
      "M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z",
    ]),
    expand: svgIcon([
      "M1.5 5.5V2.75A1.25 1.25 0 0 1 2.75 1.5H5.5v1H2.75a.25.25 0 0 0-.25.25V5.5h-1zm13 0V2.75a.25.25 0 0 0-.25-.25H10.5v-1h2.75A1.25 1.25 0 0 1 14.5 2.75V5.5h-1zM1.5 10.5h1v2.75c0 .138.112.25.25.25H5.5v1H2.75A1.25 1.25 0 0 1 1.5 13.25V10.5zm13 0h-1v2.75a.25.25 0 0 1-.25.25H10.5v1h2.75a1.25 1.25 0 0 0 1.25-1.25V10.5z",
    ]),
    close: svgIcon([
      "M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z",
    ]),
  };

  function fillButton(button, icon, label) {
    const text = document.createElement("span");
    text.textContent = label;
    button.replaceChildren(icon.cloneNode(true), text);
  }

  function copyText(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-9999px";
    document.body.append(area);
    area.select();
    try {
      if (!document.execCommand("copy")) {
        throw new Error("copy failed");
      }
    } finally {
      area.remove();
    }
  }

  function maxHeightPx() {
    return (window.innerHeight * MAX_VH) / 100;
  }

  function detectLang(pre) {
    const match = String(pre.className || "").match(/(?:^|\s)language-([a-z0-9_+-]+)/i);
    if (!match) {
      return "";
    }
    const lang = match[1].toLowerCase();
    return ["text", "plain", "plaintext"].includes(lang) ? "" : lang;
  }

  function lineCount(text) {
    if (!text) {
      return 1;
    }
    const normalized = text.replace(/\n$/, "");
    if (!normalized) {
      return 1;
    }
    return normalized.split("\n").length;
  }

  function buildGutter(count) {
    const gutter = document.createElement("div");
    gutter.className = "code-block__gutter";
    gutter.setAttribute("aria-hidden", "true");
    for (let index = 1; index <= count; index++) {
      const line = document.createElement("span");
      line.className = "code-block__line-no";
      line.textContent = String(index);
      gutter.append(line);
    }
    return gutter;
  }

  function wireCopy(button, getText) {
    let resetTimer;
    button.addEventListener("click", async () => {
      try {
        copyText(getText() || "");
        // One microtask, same as the old `.then()` on a resolved copy promise.
        await Promise.resolve();
        button.classList.add("is-copied");
        button.setAttribute("aria-label", "Copied");
        fillButton(button, ICONS.check, "Copied");
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          button.classList.remove("is-copied");
          button.setAttribute("aria-label", "Copy code");
          fillButton(button, ICONS.copy, "Copy");
        }, COPY_RESET_MS);
      } catch {
        // Clipboard may be blocked.
      }
    });
  }

  function closeFullscreen() {
    if (!activeFs) {
      return;
    }
    const fs = activeFs;
    activeFs = undefined;
    document.removeEventListener("keydown", fs.onKey);
    document.documentElement.classList.remove("code-fs-open");
    if (fs.root.parentNode) {
      fs.root.remove();
    }
    if (fs.trigger && typeof fs.trigger.focus === "function") {
      fs.trigger.focus();
    }
  }

  function copyCodeButton(getText) {
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "code-block__btn";
    copyButton.setAttribute("aria-label", "Copy code");
    fillButton(copyButton, ICONS.copy, "Copy");
    wireCopy(copyButton, getText);
    return copyButton;
  }

  function cloneCode(options) {
    const code = document.createElement("code");
    code.className = options.codeClass || "";
    for (const child of options.sourceCode.childNodes) {
      code.append(child.cloneNode(true));
    }
    return code;
  }

  function openFullscreen(options) {
    closeFullscreen();

    const root = document.createElement("div");
    root.className = "code-fs";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Code fullscreen");

    const backdrop = document.createElement("div");
    backdrop.className = "code-fs__backdrop";

    const panel = document.createElement("div");
    panel.className = "code-fs__panel";

    const bar = document.createElement("div");
    bar.className = "code-fs__toolbar";

    const label = document.createElement("span");
    label.className = "code-fs__label";
    label.textContent = options.lang || "code";

    const actions = document.createElement("div");
    actions.className = "code-fs__actions";

    const copyButton = copyCodeButton(() => options.text);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "code-block__btn";
    closeButton.setAttribute("aria-label", "Close fullscreen");
    fillButton(closeButton, ICONS.close, "Close");

    actions.append(copyButton, closeButton);
    bar.append(label, actions);

    const body = document.createElement("div");
    body.className = "code-fs__body";
    const pre = document.createElement("pre");
    pre.className = options.preClass || "";
    pre.append(cloneCode(options));
    body.append(buildGutter(options.lines), pre);
    panel.append(bar, body);
    root.append(backdrop, panel);

    function onKey(event) {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      closeFullscreen();
    }

    backdrop.addEventListener("click", closeFullscreen);
    closeButton.addEventListener("click", closeFullscreen);
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("code-fs-open");
    document.body.append(root);
    closeButton.focus();

    activeFs = { root, onKey, trigger: options.trigger };
  }

  function collapseBlock(wrap, expandButton) {
    const beforeTop = expandButton.getBoundingClientRect().top;
    wrap.classList.remove("is-expanded");
    expandButton.setAttribute("aria-expanded", "false");
    expandButton.textContent = "Show more";
    const delta = expandButton.getBoundingClientRect().top - beforeTop;
    if (delta) {
      window.scrollBy(0, delta);
    }

    const header = document.querySelector(".site-header");
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const wrapTop = wrap.getBoundingClientRect().top;
    if (wrapTop < headerH + 8) {
      window.scrollBy(0, wrapTop - headerH - 8);
    }
  }

  function wireExpand(wrap) {
    const expandButton = document.createElement("button");
    expandButton.type = "button";
    expandButton.className = "code-block__expand";
    expandButton.setAttribute("aria-expanded", "false");
    expandButton.textContent = "Show more";
    wrap.append(expandButton);

    expandButton.addEventListener("click", () => {
      const willExpand = !wrap.classList.contains("is-expanded");
      if (willExpand) {
        wrap.classList.add("is-expanded");
        expandButton.setAttribute("aria-expanded", "true");
        expandButton.textContent = "Show less";
        return;
      }
      // Keep the control under the cursor so shrinking the block
      // doesn't fling the viewport down into later content.
      collapseBlock(wrap, expandButton);
    });
  }

  function enhance(pre) {
    if (pre.closest(".code-block")) {
      return;
    }

    const codeElement = pre.querySelector("code") || pre;
    const text = pre.textContent || "";
    const lines = lineCount(text);
    const lang = detectLang(pre);
    const isTall = pre.scrollHeight > maxHeightPx() + 4;

    const wrap = document.createElement("div");
    wrap.className = "code-block";
    if (isTall) {
      wrap.classList.add("is-collapsible");
    }
    pre.parentNode.insertBefore(wrap, pre);

    const toolbar = document.createElement("div");
    toolbar.className = "code-block__toolbar";

    const meta = document.createElement("span");
    meta.className = "code-block__meta";
    meta.textContent = lang || (isTall ? lines + " lines" : "code");

    const actions = document.createElement("div");
    actions.className = "code-block__actions";

    const copyButton = copyCodeButton(() => pre.textContent || "");

    const fsButton = document.createElement("button");
    fsButton.type = "button";
    fsButton.className = "code-block__btn";
    fsButton.setAttribute("aria-label", "Open code fullscreen");
    fillButton(fsButton, ICONS.expand, "Full screen");
    fsButton.addEventListener("click", () => {
      openFullscreen({
        lang,
        text: pre.textContent || "",
        sourceCode: codeElement,
        preClass: pre.className,
        codeClass: codeElement.className,
        lines,
        trigger: fsButton,
      });
    });
    actions.append(copyButton, fsButton);
    toolbar.append(meta, actions);

    const body = document.createElement("div");
    body.className = "code-block__body";
    body.append(buildGutter(lines), pre);
    wrap.append(toolbar, body);

    if (isTall) {
      wireExpand(wrap);
    }
  }

  function markInlineCopyable(code) {
    if (code.dataset.copyReady === "1") {
      return;
    }
    if (code.closest("a, button, .code-block")) {
      return;
    }
    const text = (code.textContent || "").trim();
    if (!text) {
      return;
    }

    let resetTimer;
    async function copied() {
      try {
        copyText(text);
        await Promise.resolve();
        code.classList.add("is-copied");
        code.setAttribute("aria-label", "Copied");
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          code.classList.remove("is-copied");
          code.setAttribute("aria-label", "Copy " + text);
        }, COPY_RESET_MS);
      } catch {
        // Clipboard may be blocked.
      }
    }

    code.dataset.copyReady = "1";
    code.setAttribute("tabindex", "0");
    code.setAttribute("role", "button");
    code.setAttribute("aria-label", "Copy " + text);
    code.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void copied();
    });
    code.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      void copied();
    });
  }

  function hydrateInlineCode() {
    for (const code of document.querySelectorAll(".prose :not(pre) > code")) {
      markInlineCopyable(code);
    }
  }

  function hydrateCodeBlocks() {
    closeFullscreen();
    for (const pre of document.querySelectorAll(".prose pre")) {
      enhance(pre);
    }
    hydrateInlineCode();
  }

  globalThis.hydrateCodeBlocks = hydrateCodeBlocks;
  hydrateCodeBlocks();
})();

/* Progressive enhancement: toolbar, line numbers, collapse, fullscreen.
   Hydrated only when .prose pre is present. Safe without this file. */
(function () {
  "use strict";

  var MAX_VH = 20;
  var COPY_RESET_MS = 1600;
  var activeFs = null;

  function icon(paths) {
    return (
      '<svg class="code-block__icon" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
      paths +
      "</svg>"
    );
  }

  var ICONS = {
    copy: icon(
      '<path fill="currentColor" d="M5.5 2A1.5 1.5 0 0 0 4 3.5v8A1.5 1.5 0 0 0 5.5 13h6a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 11.5 2h-6zm0 1h6a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5z"/>' +
        '<path fill="currentColor" d="M2.5 4A1.5 1.5 0 0 0 1 5.5v8A1.5 1.5 0 0 0 2.5 15h6a1.5 1.5 0 0 0 1.5-1.5V13H9v.5a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5H3V4h-.5z"/>'
    ),
    check: icon(
      '<path fill="currentColor" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>'
    ),
    expand: icon(
      '<path fill="currentColor" d="M1.5 5.5V2.75A1.25 1.25 0 0 1 2.75 1.5H5.5v1H2.75a.25.25 0 0 0-.25.25V5.5h-1zm13 0V2.75a.25.25 0 0 0-.25-.25H10.5v-1h2.75A1.25 1.25 0 0 1 14.5 2.75V5.5h-1zM1.5 10.5h1v2.75c0 .138.112.25.25.25H5.5v1H2.75A1.25 1.25 0 0 1 1.5 13.25V10.5zm13 0h-1v2.75a.25.25 0 0 1-.25.25H10.5v1h2.75a1.25 1.25 0 0 0 1.25-1.25V10.5z"/>'
    ),
    close: icon(
      '<path fill="currentColor" d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/>'
    ),
  };

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        if (!document.execCommand("copy")) throw new Error("copy failed");
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  function maxHeightPx() {
    return (window.innerHeight * MAX_VH) / 100;
  }

  function detectLang(pre) {
    var match = String(pre.className || "").match(/(?:^|\s)language-([a-z0-9_+-]+)/i);
    if (!match) return "";
    var lang = match[1].toLowerCase();
    return lang === "text" || lang === "plain" || lang === "plaintext" ? "" : lang;
  }

  function lineCount(text) {
    if (!text) return 1;
    var normalized = text.replace(/\n$/, "");
    if (!normalized) return 1;
    return normalized.split("\n").length;
  }

  function buildGutter(count) {
    var gutter = document.createElement("div");
    gutter.className = "code-block__gutter";
    gutter.setAttribute("aria-hidden", "true");
    var html = "";
    for (var i = 1; i <= count; i++) {
      html += '<span class="code-block__line-no">' + i + "</span>";
    }
    gutter.innerHTML = html;
    return gutter;
  }

  function wireCopy(btn, getText) {
    var resetTimer;
    btn.addEventListener("click", function () {
      copyText(getText() || "")
        .then(function () {
          btn.classList.add("is-copied");
          btn.setAttribute("aria-label", "Copied");
          btn.innerHTML = ICONS.check + '<span>Copied</span>';
          clearTimeout(resetTimer);
          resetTimer = setTimeout(function () {
            btn.classList.remove("is-copied");
            btn.setAttribute("aria-label", "Copy code");
            btn.innerHTML = ICONS.copy + "<span>Copy</span>";
          }, COPY_RESET_MS);
        })
        .catch(function () {});
    });
  }

  function closeFullscreen() {
    if (!activeFs) return;
    var fs = activeFs;
    activeFs = null;
    document.removeEventListener("keydown", fs.onKey);
    document.documentElement.classList.remove("code-fs-open");
    if (fs.root.parentNode) fs.root.parentNode.removeChild(fs.root);
    if (fs.trigger && typeof fs.trigger.focus === "function") {
      fs.trigger.focus();
    }
  }

  function openFullscreen(opts) {
    closeFullscreen();

    var root = document.createElement("div");
    root.className = "code-fs";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Code fullscreen");

    var backdrop = document.createElement("div");
    backdrop.className = "code-fs__backdrop";
    root.appendChild(backdrop);

    var panel = document.createElement("div");
    panel.className = "code-fs__panel";

    var bar = document.createElement("div");
    bar.className = "code-fs__toolbar";

    var label = document.createElement("span");
    label.className = "code-fs__label";
    label.textContent = opts.lang ? opts.lang : "code";
    bar.appendChild(label);

    var actions = document.createElement("div");
    actions.className = "code-fs__actions";

    var copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "code-block__btn";
    copyBtn.setAttribute("aria-label", "Copy code");
    copyBtn.innerHTML = ICONS.copy + "<span>Copy</span>";
    wireCopy(copyBtn, function () {
      return opts.text;
    });

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "code-block__btn";
    closeBtn.setAttribute("aria-label", "Close fullscreen");
    closeBtn.innerHTML = ICONS.close + "<span>Close</span>";

    actions.appendChild(copyBtn);
    actions.appendChild(closeBtn);
    bar.appendChild(actions);
    panel.appendChild(bar);

    var body = document.createElement("div");
    body.className = "code-fs__body";
    body.appendChild(buildGutter(opts.lines));

    var pre = document.createElement("pre");
    pre.className = opts.preClass || "";
    var code = document.createElement("code");
    code.className = opts.codeClass || "";
    code.innerHTML = opts.html;
    pre.appendChild(code);
    body.appendChild(pre);
    panel.appendChild(body);
    root.appendChild(panel);

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeFullscreen();
      }
    }

    backdrop.addEventListener("click", closeFullscreen);
    closeBtn.addEventListener("click", closeFullscreen);
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("code-fs-open");
    document.body.appendChild(root);
    closeBtn.focus();

    activeFs = { root: root, onKey: onKey, trigger: opts.trigger };
  }

  function enhance(pre) {
    if (pre.closest(".code-block")) return;

    var codeEl = pre.querySelector("code") || pre;
    var text = pre.textContent || "";
    var lines = lineCount(text);
    var lang = detectLang(pre);
    var tall = pre.scrollHeight > maxHeightPx() + 4;

    var wrap = document.createElement("div");
    wrap.className = "code-block";
    if (tall) wrap.classList.add("is-collapsible");
    pre.parentNode.insertBefore(wrap, pre);

    var toolbar = document.createElement("div");
    toolbar.className = "code-block__toolbar";

    var meta = document.createElement("span");
    meta.className = "code-block__meta";
    meta.textContent = lang || (tall ? lines + " lines" : "code");
    toolbar.appendChild(meta);

    var actions = document.createElement("div");
    actions.className = "code-block__actions";

    var copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "code-block__btn";
    copyBtn.setAttribute("aria-label", "Copy code");
    copyBtn.innerHTML = ICONS.copy + "<span>Copy</span>";
    wireCopy(copyBtn, function () {
      return pre.textContent || "";
    });
    actions.appendChild(copyBtn);

    var fsBtn = document.createElement("button");
    fsBtn.type = "button";
    fsBtn.className = "code-block__btn";
    fsBtn.setAttribute("aria-label", "Open code fullscreen");
    fsBtn.innerHTML = ICONS.expand + "<span>Full screen</span>";
    fsBtn.addEventListener("click", function () {
      openFullscreen({
        lang: lang,
        text: pre.textContent || "",
        html: codeEl.innerHTML,
        preClass: pre.className,
        codeClass: codeEl.className,
        lines: lines,
        trigger: fsBtn,
      });
    });
    actions.appendChild(fsBtn);

    toolbar.appendChild(actions);
    wrap.appendChild(toolbar);

    var body = document.createElement("div");
    body.className = "code-block__body";
    body.appendChild(buildGutter(lines));
    body.appendChild(pre);
    wrap.appendChild(body);

    if (tall) {
      var expandBtn = document.createElement("button");
      expandBtn.type = "button";
      expandBtn.className = "code-block__expand";
      expandBtn.setAttribute("aria-expanded", "false");
      expandBtn.textContent = "Show more";
      wrap.appendChild(expandBtn);

      expandBtn.addEventListener("click", function () {
        var willExpand = !wrap.classList.contains("is-expanded");

        if (willExpand) {
          wrap.classList.add("is-expanded");
          expandBtn.setAttribute("aria-expanded", "true");
          expandBtn.textContent = "Show less";
          return;
        }

        // Keep the control under the cursor so shrinking the block
        // doesn't fling the viewport down into later content.
        var beforeTop = expandBtn.getBoundingClientRect().top;
        wrap.classList.remove("is-expanded");
        expandBtn.setAttribute("aria-expanded", "false");
        expandBtn.textContent = "Show more";
        var delta = expandBtn.getBoundingClientRect().top - beforeTop;
        if (delta) window.scrollBy(0, delta);

        var header = document.querySelector(".site-header");
        var headerH = header ? header.getBoundingClientRect().height : 0;
        var wrapTop = wrap.getBoundingClientRect().top;
        if (wrapTop < headerH + 8) {
          window.scrollBy(0, wrapTop - headerH - 8);
        }
      });
    }
  }

  function hydrateInlineCode() {
    document.querySelectorAll(".prose :not(pre) > code").forEach(function (code) {
      var text;
      var resetTimer;
      function copied() {
        copyText(text)
          .then(function () {
            code.classList.add("is-copied");
            code.setAttribute("aria-label", "Copied");
            clearTimeout(resetTimer);
            resetTimer = setTimeout(function () {
              code.classList.remove("is-copied");
              code.setAttribute("aria-label", "Copy " + text);
            }, COPY_RESET_MS);
          })
          .catch(function () {});
      }

      if (code.getAttribute("data-copy-ready") === "1") return;
      if (code.closest("a, button, .code-block")) return;
      text = (code.textContent || "").trim();
      if (!text) return;

      code.setAttribute("data-copy-ready", "1");
      code.setAttribute("tabindex", "0");
      code.setAttribute("role", "button");
      code.setAttribute("aria-label", "Copy " + text);
      code.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        copied();
      });
      code.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        copied();
      });
    });
  }

  function hydrateCodeBlocks() {
    closeFullscreen();
    document.querySelectorAll(".prose pre").forEach(enhance);
    hydrateInlineCode();
  }

  window.hydrateCodeBlocks = hydrateCodeBlocks;
  hydrateCodeBlocks();
})();

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");

function loadContentScript() {
  const window = new EventTarget();
  vm.runInNewContext(script, { window });
  return window;
}

function browserEvent(type, properties) {
  const event = new Event(type, { cancelable: true });

  for (const [name, value] of Object.entries(properties)) {
    Object.defineProperty(event, name, { value });
  }

  return event;
}

function dispatchWithPageObserver(window, event) {
  let pageReceivedEvent = false;
  window.addEventListener(event.type, () => {
    pageReceivedEvent = true;
  });

  return {
    accepted: window.dispatchEvent(event),
    pageReceivedEvent,
  };
}

test("native text paste is canceled before the page receives it", () => {
  const window = loadContentScript();
  const event = browserEvent("paste", {
    clipboardData: { types: ["text/plain"] },
  });

  const result = dispatchWithPageObserver(window, event);

  assert.equal(result.accepted, false);
  assert.equal(result.pageReceivedEvent, false);
});

test("native image-only paste continues to the page", () => {
  const window = loadContentScript();
  const event = browserEvent("paste", {
    clipboardData: { types: ["image/png"] },
  });

  const result = dispatchWithPageObserver(window, event);

  assert.equal(result.accepted, true);
  assert.equal(result.pageReceivedEvent, true);
});

test("text paste beforeinput variants are canceled", () => {
  for (const inputType of ["insertFromPaste", "insertFromPasteAsQuotation"]) {
    const window = loadContentScript();
    const event = browserEvent("beforeinput", {
      data: "pasted text",
      inputType,
    });

    const result = dispatchWithPageObserver(window, event);

    assert.equal(result.accepted, false);
    assert.equal(result.pageReceivedEvent, false);
  }
});

test("image-only paste beforeinput continues to the page", () => {
  const window = loadContentScript();
  const event = browserEvent("beforeinput", {
    data: null,
    dataTransfer: { types: ["image/png"] },
    inputType: "insertFromPaste",
  });

  const result = dispatchWithPageObserver(window, event);

  assert.equal(result.accepted, true);
  assert.equal(result.pageReceivedEvent, true);
});

test("ordinary text input continues to the page", () => {
  const window = loadContentScript();
  const event = browserEvent("beforeinput", {
    data: "typed text",
    inputType: "insertText",
  });

  const result = dispatchWithPageObserver(window, event);

  assert.equal(result.accepted, true);
  assert.equal(result.pageReceivedEvent, true);
});

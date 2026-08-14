const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");

function loadListeners() {
  const listeners = new Map();
  const window = {
    addEventListener(type, listener, capture) {
      listeners.set(type, { listener, capture });
    },
  };

  vm.runInNewContext(script, { window });
  return listeners;
}

function fakeEvent(inputType) {
  return {
    inputType,
    prevented: false,
    stopped: false,
    preventDefault() {
      this.prevented = true;
    },
    stopImmediatePropagation() {
      this.stopped = true;
    },
  };
}

test("registers paste defenses in the capture phase", () => {
  const listeners = loadListeners();

  assert.equal(listeners.get("paste").capture, true);
  assert.equal(listeners.get("beforeinput").capture, true);
});

test("blocks paste events", () => {
  const event = fakeEvent();

  loadListeners().get("paste").listener(event);

  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
});

test("blocks beforeinput paste variants", () => {
  const listener = loadListeners().get("beforeinput").listener;

  for (const inputType of ["insertFromPaste", "insertFromPasteAsQuotation"]) {
    const event = fakeEvent(inputType);
    listener(event);
    assert.equal(event.prevented, true);
    assert.equal(event.stopped, true);
  }
});

test("does not block non-paste input", () => {
  const event = fakeEvent("insertText");

  loadListeners().get("beforeinput").listener(event);

  assert.equal(event.prevented, false);
  assert.equal(event.stopped, false);
});

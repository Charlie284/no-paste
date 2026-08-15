import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const script = fs.readFileSync(new URL("../build/content.js", import.meta.url), "utf8");

function loadContentScript(): EventTarget {
  const window = new EventTarget();
  vm.runInNewContext(script, { window });
  return window;
}

function browserEvent(type: string, properties: Record<string, unknown>): Event {
  const event = new Event(type, { cancelable: true });

  for (const [name, value] of Object.entries(properties)) {
    Object.defineProperty(event, name, { value });
  }

  return event;
}

function dispatchWithPageObserver(window: EventTarget, event: Event): {
  accepted: boolean;
  pageReceivedEvent: boolean;
} {
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

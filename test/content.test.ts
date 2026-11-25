import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { SETTINGS_RESPONSE_TYPE, SETTINGS_SNAPSHOT_TYPE, SETTINGS_REQUEST_TYPE } from "../src/settings.js";

const script = fs.readFileSync(new URL("../build/content.js", import.meta.url), "utf8");

type SettingsListener = (message: unknown) => void;

interface LoadedContentScript {
  notifySettings(blockImages: boolean): void;
  sentMessages: unknown[];
  window: EventTarget;
}

function loadContentScript(): LoadedContentScript {
  const window = new EventTarget();
  const listeners: SettingsListener[] = [];
  const sentMessages: unknown[] = [];
  const chromeMock = {
    runtime: {
      onMessage: {
        addListener(listener: SettingsListener): void {
          listeners.push(listener);
        },
      },
      sendMessage(message: unknown): Promise<unknown> {
        sentMessages.push(message);
        return Promise.resolve({ type: SETTINGS_RESPONSE_TYPE, blockImages: false });
      },
    },
  };

  vm.runInNewContext(script, { CustomEvent, chrome: chromeMock, window });

  return {
    notifySettings(blockImages: boolean): void {
      for (const listener of listeners) {
        listener({ type: SETTINGS_SNAPSHOT_TYPE, blockImages });
      }
    },
    sentMessages,
    window,
  };
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

test("requests the optional image-blocking setting at startup", () => {
  const loaded = loadContentScript();

  assert.equal(loaded.sentMessages.length, 1);
  assert.equal((loaded.sentMessages[0] as { type?: unknown }).type, SETTINGS_REQUEST_TYPE);
});

test("native text paste is canceled before the page receives it", () => {
  const { window } = loadContentScript();
  const event = browserEvent("paste", {
    clipboardData: { types: ["text/plain"] },
  });

  const result = dispatchWithPageObserver(window, event);

  assert.equal(result.accepted, false);
  assert.equal(result.pageReceivedEvent, false);
});

test("native mixed text and image paste is canceled while image blocking is off", () => {
  const { window } = loadContentScript();
  const event = browserEvent("paste", {
    clipboardData: {
      items: [{ type: "text/plain" }, { type: "image/png" }],
      types: ["text/plain", "image/png"],
    },
  });

  const result = dispatchWithPageObserver(window, event);

  assert.equal(result.accepted, false);
  assert.equal(result.pageReceivedEvent, false);
});

test("native image-only paste continues to the page by default", () => {
  const { window } = loadContentScript();
  const event = browserEvent("paste", {
    clipboardData: {
      items: [{ kind: "file", type: "image/png" }],
      types: ["Files"],
    },
  });

  const result = dispatchWithPageObserver(window, event);

  assert.equal(result.accepted, true);
  assert.equal(result.pageReceivedEvent, true);
});

test("native image-only paste is canceled after the optional setting is enabled", () => {
  const loaded = loadContentScript();
  loaded.notifySettings(true);
  const event = browserEvent("paste", {
    clipboardData: {
      items: [{ kind: "file", type: "image/png" }],
      types: ["Files"],
    },
  });

  const result = dispatchWithPageObserver(loaded.window, event);

  assert.equal(result.accepted, false);
  assert.equal(result.pageReceivedEvent, false);
});

test("native mixed paste remains canceled after the optional setting is enabled", () => {
  const loaded = loadContentScript();
  loaded.notifySettings(true);
  const event = browserEvent("paste", {
    clipboardData: {
      items: [{ type: "text/plain" }, { type: "image/png" }],
      types: ["text/plain", "image/png"],
    },
  });

  const result = dispatchWithPageObserver(loaded.window, event);

  assert.equal(result.accepted, false);
  assert.equal(result.pageReceivedEvent, false);
});

test("text paste beforeinput variants are canceled", () => {
  for (const inputType of ["insertFromPaste", "insertFromPasteAsQuotation"]) {
    const { window } = loadContentScript();
    const event = browserEvent("beforeinput", {
      data: "pasted text",
      inputType,
    });

    const result = dispatchWithPageObserver(window, event);

    assert.equal(result.accepted, false);
    assert.equal(result.pageReceivedEvent, false);
  }
});

test("mixed paste beforeinput is canceled while image blocking is off", () => {
  const { window } = loadContentScript();
  const event = browserEvent("beforeinput", {
    data: "pasted text",
    dataTransfer: {
      items: [{ type: "text/plain" }, { type: "image/png" }],
      types: ["text/plain", "image/png"],
    },
    inputType: "insertFromPaste",
  });

  const result = dispatchWithPageObserver(window, event);

  assert.equal(result.accepted, false);
  assert.equal(result.pageReceivedEvent, false);
});

test("image-only paste beforeinput continues to the page by default", () => {
  const { window } = loadContentScript();
  const event = browserEvent("beforeinput", {
    data: null,
    dataTransfer: {
      items: [{ kind: "file", type: "image/png" }],
      types: ["Files"],
    },
    inputType: "insertFromPaste",
  });

  const result = dispatchWithPageObserver(window, event);

  assert.equal(result.accepted, true);
  assert.equal(result.pageReceivedEvent, true);
});

test("image-only paste beforeinput is canceled after the optional setting is enabled", () => {
  const loaded = loadContentScript();
  loaded.notifySettings(true);
  const event = browserEvent("beforeinput", {
    data: null,
    dataTransfer: {
      items: [{ kind: "file", type: "image/png" }],
      types: ["Files"],
    },
    inputType: "insertFromPaste",
  });

  const result = dispatchWithPageObserver(loaded.window, event);

  assert.equal(result.accepted, false);
  assert.equal(result.pageReceivedEvent, false);
});

test("ordinary text input continues to the page", () => {
  const { window } = loadContentScript();
  const event = browserEvent("beforeinput", {
    data: "typed text",
    inputType: "insertText",
  });

  const result = dispatchWithPageObserver(window, event);

  assert.equal(result.accepted, true);
  assert.equal(result.pageReceivedEvent, true);
});

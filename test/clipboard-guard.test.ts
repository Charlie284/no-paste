import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { IMAGE_SETTING_EVENT } from "../src/settings.js";

const script = fs.readFileSync(new URL("../build/clipboard-guard.js", import.meta.url), "utf8");

interface TestClipboard {
  items: ClipboardItemLike[];
  read(): Promise<ClipboardItemLike[]>;
  readText(): Promise<string>;
}

interface ClipboardItemLike {
  types: string[];
}

interface GuardedClipboard {
  clipboard: TestClipboard;
  setBlockImages(blockImages: boolean): void;
}

function clipboardItem(...types: string[]): ClipboardItemLike {
  return { types };
}

function guardedClipboard(items: ClipboardItemLike[] = []): GuardedClipboard {
  const clipboard = Object.create({
    async read(this: TestClipboard): Promise<ClipboardItemLike[]> {
      return this.items;
    },
    async readText(): Promise<string> {
      return "clipboard text";
    },
  }) as TestClipboard;
  clipboard.items = items;
  const window = new EventTarget();

  vm.runInNewContext(script, {
    CustomEvent,
    DOMException,
    navigator: { clipboard },
    window,
  });

  return {
    clipboard,
    setBlockImages(blockImages: boolean): void {
      window.dispatchEvent(new CustomEvent(IMAGE_SETTING_EVENT, { detail: blockImages }));
    },
  };
}

test("blocks asynchronous clipboard text reads", async () => {
  const { clipboard } = guardedClipboard();

  await assert.rejects(clipboard.readText(), {
    name: "NotAllowedError",
    message: "Text paste is blocked by No Paste.",
  });
});

test("blocks asynchronous clipboard item reads that contain text", async () => {
  const { clipboard } = guardedClipboard([clipboardItem("image/png", "text/html")]);

  await assert.rejects(clipboard.read(), {
    name: "NotAllowedError",
    message: "Text paste is blocked by No Paste.",
  });
});

test("blocks asynchronous mixed text and image reads when image blocking is enabled", async () => {
  const { clipboard, setBlockImages } = guardedClipboard([clipboardItem("image/png", "text/html")]);
  setBlockImages(true);

  await assert.rejects(clipboard.read(), {
    name: "NotAllowedError",
    message: "Text paste is blocked by No Paste.",
  });
});

test("allows asynchronous clipboard item reads that contain only images by default", async () => {
  const items = [clipboardItem("image/png")];
  const { clipboard } = guardedClipboard(items);

  assert.deepEqual(await clipboard.read(), items);
});

test("blocks asynchronous clipboard item reads that contain only images when enabled", async () => {
  const { clipboard, setBlockImages } = guardedClipboard([clipboardItem("image/png")]);
  setBlockImages(true);

  await assert.rejects(clipboard.read(), {
    name: "NotAllowedError",
    message: "Image paste is blocked by No Paste.",
  });
});

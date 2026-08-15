import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const script = fs.readFileSync(new URL("../build/clipboard-guard.js", import.meta.url), "utf8");

interface TestClipboard {
  items: ClipboardItemLike[];
  read(): Promise<ClipboardItemLike[]>;
  readText(): Promise<string>;
}

interface ClipboardItemLike {
  types: string[];
}

function clipboardItem(...types: string[]): ClipboardItemLike {
  return { types };
}

function guardedClipboard(items: ClipboardItemLike[] = []): TestClipboard {
  const clipboard = Object.create({
    async read(this: TestClipboard): Promise<ClipboardItemLike[]> {
      return this.items;
    },
    async readText(): Promise<string> {
      return "clipboard text";
    },
  }) as TestClipboard;
  clipboard.items = items;

  vm.runInNewContext(script, {
    DOMException,
    navigator: { clipboard },
  });

  return clipboard;
}

test("blocks asynchronous clipboard text reads", async () => {
  const clipboard = guardedClipboard();

  await assert.rejects(clipboard.readText(), {
    name: "NotAllowedError",
    message: "Text paste is blocked by No Paste.",
  });
});

test("blocks asynchronous clipboard item reads that contain text", async () => {
  const clipboard = guardedClipboard([clipboardItem("image/png", "text/html")]);

  await assert.rejects(clipboard.read(), {
    name: "NotAllowedError",
    message: "Text paste is blocked by No Paste.",
  });
});

test("allows asynchronous clipboard item reads that contain only images", async () => {
  const items = [clipboardItem("image/png")];
  const clipboard = guardedClipboard(items);

  assert.deepEqual(await clipboard.read(), items);
});

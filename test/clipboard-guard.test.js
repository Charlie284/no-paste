const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "..", "clipboard-guard.js"), "utf8");

function guardedClipboard(items = []) {
  const clipboard = Object.create({
    async read() {
      return this.items;
    },
    async readText() {
      return "clipboard text";
    },
  });
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
  const clipboard = guardedClipboard([{ types: ["image/png", "text/html"] }]);

  await assert.rejects(clipboard.read(), {
    name: "NotAllowedError",
    message: "Text paste is blocked by No Paste.",
  });
});

test("allows asynchronous clipboard item reads that contain only images", async () => {
  const items = [{ types: ["image/png"] }];
  const clipboard = guardedClipboard(items);

  assert.deepEqual(await clipboard.read(), items);
});

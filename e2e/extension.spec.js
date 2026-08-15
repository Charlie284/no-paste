const { expect, test, chromium } = require("@playwright/test");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const extensionPath = path.join(__dirname, "..");
const pasteShortcut = process.platform === "darwin" ? "Meta+V" : "Control+V";

let origin;
let frameOrigin;
let frameServer;
let server;

const pageHtml = () => `<!doctype html>
<html lang="en">
  <body>
    <input id="input" aria-label="Input">
    <textarea id="textarea" aria-label="Textarea"></textarea>
    <div id="editable" contenteditable="true" aria-label="Editable"></div>
    <div id="shadow-host"></div>
    <iframe id="related-frame" srcdoc="<input id='related-input' aria-label='Related frame input'>"></iframe>
    <iframe id="data-frame" src="data:text/html,<input id='data-input' aria-label='Data frame input'>"></iframe>
    <iframe id="origin-frame" src="${frameOrigin}"></iframe>
    <script>
      const root = document.querySelector("#shadow-host").attachShadow({ mode: "open" });
      const input = document.createElement("input");
      input.setAttribute("aria-label", "Shadow input");
      root.append(input);
    </script>
  </body>
</html>`;

async function startServer() {
  frameServer = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<input id='origin-input' aria-label='Cross-origin frame input'>");
  });
  await new Promise((resolve) => frameServer.listen(0, "127.0.0.1", resolve));
  frameOrigin = `http://127.0.0.1:${frameServer.address().port}`;

  server = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(pageHtml());
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
}

async function launchContext({ withExtension }) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "no-paste-"));
  const args = withExtension
    ? [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
    : [];
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args,
  });

  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  return { context, userDataDir };
}

async function closeContext({ context, userDataDir }) {
  await context.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
}

async function openTestPage(context) {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(origin);
  return page;
}

async function putTextOnClipboard(page, text) {
  await page.evaluate((value) => navigator.clipboard.writeText(value), text);
}

test.beforeAll(startServer);
test.afterAll(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await new Promise((resolve, reject) => frameServer.close((error) => (error ? reject(error) : resolve())));
});

test("control browser can paste clipboard text", async () => {
  const launched = await launchContext({ withExtension: false });

  try {
    const page = await openTestPage(launched.context);
    await putTextOnClipboard(page, "control text");
    await page.locator("#input").press(pasteShortcut);
    await expect(page.locator("#input")).toHaveValue("control text");
  } finally {
    await closeContext(launched);
  }
});

test("blocks native text paste in webpage editing surfaces", async () => {
  const launched = await launchContext({ withExtension: true });

  try {
    const page = await openTestPage(launched.context);
    await putTextOnClipboard(page, "blocked text");

    const targets = [
      page.locator("#input"),
      page.locator("#textarea"),
      page.locator("#editable"),
      page.locator("#shadow-host input"),
      page.frameLocator("#related-frame").locator("#related-input"),
      page.frameLocator("#data-frame").locator("#data-input"),
      page.frameLocator("#origin-frame").locator("#origin-input"),
    ];

    for (const target of targets) {
      await target.press(pasteShortcut);
    }

    await expect(page.locator("#input")).toHaveValue("");
    await expect(page.locator("#textarea")).toHaveValue("");
    await expect(page.locator("#editable")).toHaveText("");
    await expect(page.locator("#shadow-host input")).toHaveValue("");
    await expect(page.frameLocator("#related-frame").locator("#related-input")).toHaveValue("");
    await expect(page.frameLocator("#data-frame").locator("#data-input")).toHaveValue("");
    await expect(page.frameLocator("#origin-frame").locator("#origin-input")).toHaveValue("");
    const notice = page.locator("[data-no-paste-notice]");
    await expect(notice).toHaveAttribute("aria-label", "Text paste blocked.");
    await expect(notice).toBeVisible();
  } finally {
    await closeContext(launched);
  }
});

test("blocks asynchronous text reads in the page world", async () => {
  const launched = await launchContext({ withExtension: true });

  try {
    const page = await openTestPage(launched.context);
    await putTextOnClipboard(page, "blocked text");

    const errors = await page.evaluate(async () => {
      const capture = async (operation) => {
        try {
          await operation();
          return null;
        } catch (error) {
          return { name: error.name, message: error.message };
        }
      };

      return {
        direct: await capture(() => navigator.clipboard.readText()),
        prototype: await capture(() => Clipboard.prototype.readText.call(navigator.clipboard)),
        itemRead: await capture(() => navigator.clipboard.read()),
      };
    });

    for (const error of Object.values(errors)) {
      expect(error).toEqual({
        name: "NotAllowedError",
        message: "Text paste is blocked by No Paste.",
      });
    }

    await expect(page.locator("[data-no-paste-notice]")).toBeVisible();
  } finally {
    await closeContext(launched);
  }
});

test("allows ordinary typing and image-only paste events", async () => {
  const launched = await launchContext({ withExtension: true });

  try {
    const page = await openTestPage(launched.context);
    await page.locator("#input").fill("typed text");
    await expect(page.locator("#input")).toHaveValue("typed text");

    const result = await page.evaluate(() => {
      let pageReceivedEvent = false;
      window.addEventListener("paste", () => {
        pageReceivedEvent = true;
      }, { once: true });

      const transfer = new DataTransfer();
      transfer.items.add(new File(["image"], "image.png", { type: "image/png" }));
      const accepted = window.dispatchEvent(new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: transfer,
        composed: true,
      }));

      return { accepted, pageReceivedEvent };
    });

    expect(result).toEqual({ accepted: true, pageReceivedEvent: true });

    const clipboardTypes = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      canvas.getContext("2d").fillRect(0, 0, 1, 1);
      const image = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": image })]);
      const items = await navigator.clipboard.read();
      return items.flatMap((item) => item.types);
    });

    expect(clipboardTypes).toEqual(["image/png"]);
  } finally {
    await closeContext(launched);
  }
});

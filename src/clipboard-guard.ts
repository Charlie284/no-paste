import { IMAGE_SETTING_EVENT } from "./settings.js";

type BlockedPasteKind = "text" | "image";

(() => {
  "use strict";

  const clipboard = navigator.clipboard;
  if (!clipboard) {
    return;
  }

  // MAIN and ISOLATED content-script worlds cannot share JavaScript globals.
  const BLOCKED_NOTICE_EVENT = "no-paste:blocked";
  let blockImages = false;

  if (typeof window !== "undefined") {
    window.addEventListener(IMAGE_SETTING_EVENT, (event) => {
      blockImages = (event as CustomEvent<boolean>).detail === true;
    }, true);
  }

  const blocked = (kind: BlockedPasteKind): Promise<never> => {
    if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
      window.dispatchEvent(new CustomEvent(BLOCKED_NOTICE_EVENT, { detail: kind }));
    }

    const object = kind === "image" ? "Image" : "Text";
    return Promise.reject(new DOMException(`${object} paste is blocked by No Paste.`, "NotAllowedError"));
  };
  const clipboardPrototype = Object.getPrototypeOf(clipboard) as object;
  const defineGuard = (name: "read" | "readText", value: unknown): void => {
    const descriptor = { value, writable: false, configurable: false };

    try {
      Object.defineProperty(clipboardPrototype, name, descriptor);
    } catch {
      Object.defineProperty(clipboard, name, descriptor);
    }
  };

  defineGuard("readText", () => blocked("text"));

  if (typeof clipboard.read === "function") {
    const originalRead = clipboard.read;
    defineGuard("read", async function guardClipboardItems(
      this: Clipboard,
      ...args: Parameters<Clipboard["read"]>
    ): Promise<ClipboardItem[]> {
      const items = await Reflect.apply(originalRead, this, args) as ClipboardItem[];
      const containsText = items.some((item) => (
        Array.from(item.types ?? []).some((type) => type.startsWith("text/"))
      ));
      const containsImage = items.some((item) => (
        Array.from(item.types ?? []).some((type) => type.startsWith("image/"))
      ));

      if (containsText) {
        return blocked("text");
      }
      if (blockImages && containsImage) {
        return blocked("image");
      }

      return items;
    });
  }
})();

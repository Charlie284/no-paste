(() => {
  "use strict";

  const clipboard = navigator.clipboard;
  if (!clipboard) {
    return;
  }

  // MAIN and ISOLATED content-script worlds cannot share JavaScript globals.
  const BLOCKED_NOTICE_EVENT = "no-paste:blocked";
  const blocked = (): Promise<never> => {
    if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
      window.dispatchEvent(new CustomEvent(BLOCKED_NOTICE_EVENT));
    }

    return Promise.reject(new DOMException("Text paste is blocked by No Paste.", "NotAllowedError"));
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

  defineGuard("readText", blocked);

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

      if (containsText) {
        return blocked();
      }

      return items;
    });
  }
})();

import {
  IMAGE_SETTING_EVENT,
  SETTINGS_REQUEST_TYPE,
  isSettingsResponse,
  isSettingsSnapshot,
} from "./settings.js";

type BlockedPasteKind = "text" | "image";

(() => {
  "use strict";

  // MAIN and ISOLATED content-script worlds cannot share JavaScript globals.
  const BLOCKED_NOTICE_EVENT = "no-paste:blocked";
  const NOTICE_DURATION_MS = 2500;
  const NOTICE_STYLE = `
    :host {
      all: initial;
      position: fixed;
      top: 16px;
      left: 50%;
      z-index: 2147483647;
      transform: translateX(-50%);
      pointer-events: none;
    }
    span {
      display: block;
      padding: 9px 13px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 8px;
      background: rgba(24, 24, 27, 0.96);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
      color: #fafafa;
      font: 600 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
  `;
  let blockImages = false;
  let hideNoticeTimer: number | undefined;
  let noticeHost: HTMLDivElement | undefined;
  let noticeMessage: HTMLSpanElement | undefined;

  const collectionHas = <T>(
    values: ArrayLike<T> | Iterable<T> | null | undefined,
    predicate: (value: T) => boolean,
  ): boolean => {
    if (!values) {
      return false;
    }

    if (Symbol.iterator in Object(values)) {
      for (const value of values as Iterable<T>) {
        if (predicate(value)) {
          return true;
        }
      }
      return false;
    }

    for (let index = 0; index < (values as ArrayLike<T>).length; index += 1) {
      if (predicate((values as ArrayLike<T>)[index]!)) {
        return true;
      }
    }
    return false;
  };

  const transferHasFormat = (
    transfer: DataTransfer | null | undefined,
    prefix: "image/" | "text/",
  ): boolean => (
    collectionHas(transfer?.types, (type) => type.startsWith(prefix))
    || collectionHas(transfer?.items, (item) => item.type.startsWith(prefix))
  );

  const noticeText = (kind: BlockedPasteKind): string => (
    kind === "image" ? "Image paste blocked." : "Text paste blocked."
  );

  const createNotice = (): HTMLDivElement => {
    const host = document.createElement("div");
    host.setAttribute("aria-live", "polite");
    host.setAttribute("data-no-paste-notice", "");
    host.setAttribute("role", "status");

    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    const message = document.createElement("span");
    style.textContent = NOTICE_STYLE;
    shadow.append(style, message);
    noticeMessage = message;
    document.documentElement.append(host);
    return host;
  };

  const showBlockedNotice = (kind: BlockedPasteKind = "text"): void => {
    if (typeof document === "undefined" || !document.documentElement) {
      return;
    }

    if (!noticeHost?.isConnected) {
      noticeHost = createNotice();
    }

    const text = noticeText(kind);
    noticeHost.setAttribute("aria-label", text);
    if (noticeMessage) {
      noticeMessage.textContent = text;
    }

    noticeHost.hidden = false;
    window.clearTimeout(hideNoticeTimer);
    hideNoticeTimer = window.setTimeout(() => {
      if (noticeHost) {
        noticeHost.hidden = true;
      }
    }, NOTICE_DURATION_MS);
  };

  const blockEvent = (event: Event, kind: BlockedPasteKind): void => {
    event.preventDefault();
    event.stopImmediatePropagation();
    showBlockedNotice(kind);
  };

  const blockPaste = (event: ClipboardEvent): void => {
    const transfer = event.clipboardData;
    const containsText = transferHasFormat(transfer, "text/");
    const containsImage = transferHasFormat(transfer, "image/");

    if (containsText) {
      blockEvent(event, "text");
    } else if (blockImages && containsImage) {
      blockEvent(event, "image");
    }
  };

  const blockPasteInput = (event: InputEvent): void => {
    const isPasteInput = event.inputType === "insertFromPaste"
      || event.inputType === "insertFromPasteAsQuotation";
    if (!isPasteInput) {
      return;
    }

    const containsText = typeof event.data === "string"
      || transferHasFormat(event.dataTransfer, "text/");
    const containsImage = transferHasFormat(event.dataTransfer, "image/");

    if (containsText) {
      blockEvent(event, "text");
    } else if (blockImages && containsImage) {
      blockEvent(event, "image");
    }
  };

  const applySettings = (nextBlockImages: boolean): void => {
    blockImages = nextBlockImages;
    window.dispatchEvent(new CustomEvent(IMAGE_SETTING_EVENT, {
      detail: blockImages,
    }));
  };

  const extensionRuntime = (globalThis as { chrome?: typeof chrome }).chrome;
  if (extensionRuntime) {
    let receivedBroadcast = false;
    extensionRuntime.runtime.onMessage.addListener((message) => {
      if (isSettingsSnapshot(message)) {
        receivedBroadcast = true;
        applySettings(message.blockImages);
      }
    });

    void extensionRuntime.runtime.sendMessage({ type: SETTINGS_REQUEST_TYPE })
      .then((message) => {
        if (!receivedBroadcast && isSettingsResponse(message)) {
          applySettings(message.blockImages);
        }
      })
      .catch(() => undefined);
  }

  window.addEventListener("paste", blockPaste, true);
  window.addEventListener("beforeinput", blockPasteInput, true);
  window.addEventListener(BLOCKED_NOTICE_EVENT, (event) => {
    const kind = (event as CustomEvent<BlockedPasteKind>).detail === "image" ? "image" : "text";
    showBlockedNotice(kind);
  }, true);
})();

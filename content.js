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
  let hideNoticeTimer;
  let noticeHost;

  const hasTextType = (types) => Array.from(types ?? []).some((type) => type.startsWith("text/"));

  const createNotice = () => {
    const host = document.createElement("div");
    host.setAttribute("aria-label", "Text paste blocked.");
    host.setAttribute("aria-live", "polite");
    host.setAttribute("data-no-paste-notice", "");
    host.setAttribute("role", "status");

    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    const message = document.createElement("span");
    style.textContent = NOTICE_STYLE;
    message.textContent = "Text paste blocked.";
    shadow.append(style, message);
    document.documentElement.append(host);
    return host;
  };

  const showBlockedNotice = () => {
    if (typeof document === "undefined" || !document.documentElement) {
      return;
    }

    if (!noticeHost?.isConnected) {
      noticeHost = createNotice();
    }

    noticeHost.hidden = false;
    window.clearTimeout(hideNoticeTimer);
    hideNoticeTimer = window.setTimeout(() => {
      noticeHost.hidden = true;
    }, NOTICE_DURATION_MS);
  };

  const blockEvent = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    showBlockedNotice();
  };

  const blockTextPaste = (event) => {
    if (hasTextType(event.clipboardData?.types)) {
      blockEvent(event);
    }
  };

  const blockPasteInput = (event) => {
    const isPasteInput = event.inputType === "insertFromPaste" || event.inputType === "insertFromPasteAsQuotation";
    const containsText = typeof event.data === "string" || hasTextType(event.dataTransfer?.types);

    if (isPasteInput && containsText) {
      blockEvent(event);
    }
  };

  window.addEventListener("paste", blockTextPaste, true);
  window.addEventListener("beforeinput", blockPasteInput, true);
  window.addEventListener(BLOCKED_NOTICE_EVENT, showBlockedNotice, true);
})();

import {
  isSettingsRequest,
  isSettingsWritten,
  settingsResponse,
  settingsSnapshot,
} from "./settings.js";
import { readBlockImages } from "./settings-store.js";

const broadcastSettings = async (blockImages: boolean): Promise<void> => {
  const snapshot = settingsSnapshot(blockImages);
  const tabs = await chrome.tabs.query({});

  await Promise.all(tabs.map(async (tab) => {
    if (tab.id === undefined) {
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, snapshot);
    } catch {
      // Tabs where Chrome or the user has not admitted the content script cannot receive settings.
    }
  }));
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (isSettingsRequest(message)) {
    void readBlockImages()
      .then((blockImages) => {
        sendResponse(settingsResponse(blockImages));
      })
      .catch(() => {
        sendResponse(settingsResponse(false));
      });
    return true;
  }

  if (isSettingsWritten(message)) {
    void broadcastSettings(message.blockImages)
      .catch(() => undefined)
      .then(() => {
        sendResponse({ ok: true });
      });
    return true;
  }

  return false;
});

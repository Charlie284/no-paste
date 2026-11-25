import { SETTINGS_WRITTEN_TYPE } from "./settings.js";
import { readBlockImages, writeBlockImages } from "./settings-store.js";

const checkbox = document.querySelector<HTMLInputElement>("#block-images");
const status = document.querySelector<HTMLElement>("#save-status");

if (!checkbox || !status) {
  throw new Error("The options page is missing its controls.");
}

const extensionRuntime = (globalThis as { chrome?: typeof chrome }).chrome;

const save = async (): Promise<void> => {
  const blockImages = checkbox.checked;
  checkbox.disabled = true;
  status.textContent = "Saving…";

  try {
    await writeBlockImages(blockImages);
  } catch {
    checkbox.checked = await readBlockImages().catch(() => !blockImages);
    status.textContent = "The setting could not be saved.";
    checkbox.disabled = false;
    return;
  }

  try {
    await extensionRuntime?.runtime.sendMessage({
      type: SETTINGS_WRITTEN_TYPE,
      blockImages,
    });
    status.textContent = "Saved.";
  } catch {
    status.textContent = "Saved. Reload open pages if they do not pick up the change.";
  } finally {
    checkbox.disabled = false;
  }
};

void readBlockImages()
  .then((blockImages) => {
    checkbox.checked = blockImages;
  })
  .catch(() => {
    status.textContent = "The saved setting could not be read; image paste remains allowed by default.";
  });

checkbox.addEventListener("change", () => {
  void save();
});

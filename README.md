# No Paste

A minimal Chrome extension that blocks paste operations on webpages. It runs at document start and covers embedded frames that Chrome permits extensions to access.

## Install

1. Open `chrome://extensions` in Google Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder.

The extension takes effect immediately on newly loaded pages. Reload tabs that were already open when you installed it.

To cover local `file://` pages, open the extension's details page and turn on **Allow access to file URLs**.

## What it blocks

- Keyboard paste shortcuts such as <kbd>Command</kbd>+<kbd>V</kbd> and <kbd>Ctrl</kbd>+<kbd>V</kbd>
- Context-menu paste
- Browser paste actions that emit `beforeinput` with a paste input type
- Paste inside accessible iframes, including matching `about:blank` and origin-fallback frames

Chrome does not allow extensions to run on protected browser pages such as `chrome://` URLs, the Chrome Web Store, or Chrome's built-in PDF viewer. The extension cannot block paste in the browser's address bar or in other applications.

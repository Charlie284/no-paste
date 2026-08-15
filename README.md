# No Paste

No Paste is a Chrome extension that blocks text from being pasted into webpages while leaving ordinary typing and image-only paste available. A small notice appears whenever text paste is blocked.

It handles native paste actions and adds a best-effort guard against webpages reading text through the asynchronous Clipboard API. Both defenses start before page content loads and run in every frame Chrome permits the extension to access.

## Install

1. Open `chrome://extensions` in Google Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder.
5. Reload tabs that were already open.

Chrome 111 or newer is required.

## Coverage and access

The extension blocks text paste from keyboard shortcuts, Chrome's context menu, `beforeinput` paste actions, and webpage calls to `navigator.clipboard.readText()` or text-bearing `navigator.clipboard.read()` results.

Chrome gives users final control over where extensions run:

- Turn on **Allow in Incognito** on the extension's details page to cover incognito windows.
- Turn on **Allow access to file URLs** to cover local `file://` pages.
- Leave site access set to **On all sites**. Selecting **On click** or specific sites disables automatic blocking elsewhere.
- Install the extension separately in every Chrome profile where it is needed.

Chrome prevents extensions from running on protected browser pages, including `chrome://` URLs, the Chrome Web Store, and the built-in PDF viewer. No extension can block paste in the address bar, other applications, or pages where Chrome or the user has denied it access.

The asynchronous Clipboard API guard runs in the webpage's JavaScript world. It raises the bar for custom paste buttons, but a hostile webpage or another extension may be able to interfere with webpage code. No Paste should not be treated as a security boundary.

## Privacy and permissions

No Paste requests automatic access to webpages through the `<all_urls>` content-script match so it can block paste without requiring a click on every site. Chrome may describe this as permission to read and change data on visited websites.

The extension does not inspect pasted text, collect browsing data, store anything, make network requests, or transmit data. It has no API permissions, background worker, analytics, or remote code.

## Development

Requirements: Node.js 20 or newer and pnpm 11.

```sh
pnpm install
pnpm exec playwright install chromium
pnpm check
pnpm package
```

`pnpm test` runs the dependency-free unit and manifest tests. `pnpm test:e2e` launches Playwright's bundled Chromium with the unpacked extension and verifies native paste, editing surfaces, frames, shadow DOM, asynchronous clipboard reads, non-text paste, typing, and the blocked-paste notice.

`pnpm package` writes a versioned, installable ZIP to `dist/`. Generated archives and test artifacts are ignored by Git.

## Contributing

Bug reports and focused pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and contribution guidelines.

## Releases

Release ZIPs contain only the extension's runtime files, icons, manifest, and MIT license. Each release is built from its matching Git tag with `pnpm package`.

See [CHANGELOG.md](CHANGELOG.md) for release notes.

## License

No Paste is available under the [MIT License](LICENSE).

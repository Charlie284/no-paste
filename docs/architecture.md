# Architecture

No Paste blocks paste with two Manifest V3 content scripts that run side
by side in every frame: one in the page's own JavaScript world, one in
Chrome's isolated extension world. They share no globals — the only
channel between them is DOM `CustomEvent`s on `window`. A tiny
permission-free service worker and options page coordinate one local
setting: whether image paste should be blocked in addition to text paste.
The setting is off by default.

```mermaid
flowchart TD
    subgraph Page["Page (MAIN world)"]
        CS[navigator.clipboard.readText / read]
        PG[clipboard-guard.js]
        CS --> PG
        PG -->|"rejects with NotAllowedError"| CS
        PG -->|"CustomEvent no-paste:blocked"| EV[window event bus]
    end
    subgraph Isolated["Extension (ISOLATED world)"]
        CT[content.js]
        EV --> CT
        PTE[paste / beforeinput events] --> CT
        CT -->|"preventDefault + stopImmediatePropagation"| PTE
        CT --> N[blocked-paste notice]
        CT -->|"CustomEvent no-paste:image-setting"| EV
    end
    subgraph Extension["Extension origin"]
        OP[options.html] -->|writes boolean| IDB[(IndexedDB)]
        BG[background.js] -->|reads boolean| IDB
        BG -->|"runtime messages"| CT
    end
```

## `clipboard-guard.js` — MAIN world

Declared first in `manifest.json` with `"world": "MAIN"`, so it executes
inside the page's JavaScript realm at `document_start`, before page
scripts run.

- Replaces `navigator.clipboard.readText` with a function that rejects
  with a `NotAllowedError` `DOMException`.
- Wraps `navigator.clipboard.read` so it still resolves for non-text
  clipboard items, but rejects when any returned `ClipboardItem` carries
  a `text/*` type. If image blocking is enabled, it also rejects when an
  item carries an `image/*` type. Only the type metadata is inspected;
  clipboard payloads are never read with `getType()`.
- The guard is defined on the `Clipboard` prototype first; if that fails
  it falls back to the `clipboard` instance itself, and is marked
  non-writable and non-configurable so page code cannot restore the
  original.
- Every rejection dispatches a `no-paste:blocked` `CustomEvent` on
  `window` so the isolated script can show the notice.

This guard is best-effort: a hostile page that captures a reference to
the original methods before `document_start` can bypass it. It raises
the bar for custom paste buttons and is not a security boundary.

## `content.js` — ISOLATED world

Runs in the extension's isolated world at `document_start`. It blocks
the native paste paths the Clipboard API guard cannot reach:

- `paste` events on `window` (capture phase) are cancelled when the
  clipboard's format metadata contains a `text/*` type. If image blocking
  is enabled, an `image/*` type on a clipboard item is also cancelled.
- `beforeinput` events with `inputType` of `insertFromPaste` or
  `insertFromPasteAsQuotation` are cancelled when they carry string data
  or a `text/*` `dataTransfer` type, with the same optional `image/*`
  handling.
- Image paste passes through while the optional setting is off. Other
  non-image, non-text paste and ordinary typing always pass through.
- Mixed text-and-image clipboard data is treated as text and is always
  blocked. Format detection uses `types` and item MIME types only, never
  clipboard contents.

Blocked events get `preventDefault()` plus `stopImmediatePropagation()`
so page listeners never see them. The same handler listens for the
`no-paste:blocked` event from the MAIN-world guard.

## Blocked-paste notice

Both paths funnel into `showBlockedNotice()`, which renders a small
fixed-position "Text paste blocked." or "Image paste blocked." banner
for 2.5 seconds. The notice lives in a closed shadow root with
`all: initial` on the host so page styles cannot leak in, and carries
`role="status"` / `aria-live="polite"` so screen readers announce it.

## Image-blocking setting

`options.html` presents the explanatory setting UI. It writes one
boolean to an IndexedDB database on the extension origin and never
stores clipboard data. IndexedDB requires no extension permission, so
the manifest can remain free of both `permissions` and
`host_permissions`.

`background.js` reads the same boolean when a content script asks at
`document_start`. When the options page saves a change, the service
worker broadcasts it with `chrome.tabs.sendMessage` to tabs that already
have the content scripts. It does not inject scripts, broaden matches,
or bypass Chrome's site-access controls; tabs where the content script
is not admitted simply cannot receive the message. The isolated script
forwards the current boolean into the MAIN world through the
`no-paste:image-setting` event so both paste defenses agree.

## Coverage

Both scripts use `run_at: "document_start"`, `all_frames: true`,
`match_about_blank: true`, and `match_origin_as_fallback: true`, so
they run in iframes, `about:blank` frames, and `srcdoc`/`data:` frames
where Chrome permits extension access. Chrome still excludes protected
pages (`chrome://`, the Web Store, the PDF viewer) and whatever the user
disables in site-access settings.

## Build and packaging

TypeScript sources compile to IIFE bundles with esbuild targeting
Chrome 111 (`pnpm build`, `scripts/build.ts`), alongside the manifest,
options page, icons, and license in `build/`. `pnpm package` (`scripts/package.ts`)
writes a versioned ZIP to `dist/` using a small dependency-free ZIP
writer (store-only entries, CRC-32 checksums computed in-process) so a
release archive never depends on system zip tooling.

# Testing

No Paste has three layers of tests. Everything is written in TypeScript
and runs through `tsx`.

```sh
pnpm test       # unit + manifest + package tests (builds first)
pnpm test:e2e   # Playwright browser tests (builds first)
pnpm check      # typecheck + unit + e2e — run before opening a PR
```

All test commands compile the extension into `build/` first, so they
always test what would actually ship.

## Unit tests (`test/`)

Run with `node --import tsx --test` (the built-in `node:test` runner).
Each file exercises one concern:

- `clipboard-guard.test.ts` — the MAIN-world Clipboard API guard:
  `readText` rejection, `read` filtering by `text/*` and optional
  `image/*` type metadata, mixed clipboard precedence, non-text
  pass-through, and the `no-paste:blocked` event dispatch.
- `content.test.ts` — the isolated-world paste/`beforeinput` blocking
  logic for text-only, image-only, and mixed clipboard formats, the
  optional image-setting message path, and ordinary-input pass-through.
- `manifest.test.ts` — the manifest stays valid: MV3, both content
  scripts present with the right `world`, `run_at`, `all_frames`, and
  match settings, required icons declared, no unexpected permissions.
- `package.test.ts` — `pnpm package` output: the ZIP exists in `dist/`,
  contains exactly the expected files, and its entries are readable.

## End-to-end tests (`e2e/`)

`e2e/extension.spec.ts` launches Playwright's bundled Chromium with the
compiled extension loaded via `--load-extension` against a local test
server. Set `NO_PASTE_CHROMIUM_EXECUTABLE` to a locally installed
Chromium-compatible browser executable when the Playwright browser is
not present. One-time setup for Playwright's own browser:

```sh
pnpm exec playwright install chromium
```

The suite covers:

- A **control browser** (extension not loaded) proving the harness
  itself can paste, so extension-side failures are real failures.
- Text paste blocked in inputs, textareas, `contenteditable`, a
  noneditable custom paste target, shadow DOM, `srcdoc`/`data:` frames,
  and a cross-origin frame.
- Asynchronous `navigator.clipboard.readText()` and `read()` rejection.
- Image-only paste passing through by default and ordinary typing still
  working.
- Mixed text-and-image clipboard paste remaining blocked because it
  contains text.
- The options page explanatory copy, immediate propagation of the
  optional image-blocking setting, and image paste blocked in editable,
  noneditable, and cross-origin frame targets.
- The "Text paste blocked." and "Image paste blocked." notices appearing
  on the corresponding blocked attempts.

Clipboard permission is granted to the test origin via
`context.grantPermissions(["clipboard-read", "clipboard-write"])`; the
paste shortcut is `Meta+V` on macOS and `Control+V` elsewhere.

## Adding tests

A behavior change in `src/` should come with a matching unit test, and
a change in observable page behavior (a new blocked surface, a new
pass-through) should also get an e2e case. Keep the manifest test in
step with any `manifest.json` edit — it is the regression net for the
wiring this architecture depends on.

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
  `readText` rejection, `read` filtering by `text/*` type, non-text
  pass-through, and the `no-paste:blocked` event dispatch.
- `content.test.ts` — the isolated-world paste/`beforeinput` blocking
  logic and the blocked-paste notice lifecycle.
- `manifest.test.ts` — the manifest stays valid: MV3, both content
  scripts present with the right `world`, `run_at`, `all_frames`, and
  match settings, required icons declared, no unexpected permissions.
- `package.test.ts` — `pnpm package` output: the ZIP exists in `dist/`,
  contains exactly the expected files, and its entries are readable.

## End-to-end tests (`e2e/`)

`e2e/extension.spec.ts` launches Playwright's bundled Chromium with the
compiled extension loaded via `--load-extension` against a local test
server. One-time setup:

```sh
pnpm exec playwright install chromium
```

The suite covers:

- A **control browser** (extension not loaded) proving the harness
  itself can paste, so extension-side failures are real failures.
- Text paste blocked in inputs, textareas, `contenteditable`, shadow
  DOM, `srcdoc`/`data:` frames, and a cross-origin frame.
- Asynchronous `navigator.clipboard.readText()` and `read()` rejection.
- Non-text paste (image data) and ordinary typing still working.
- The "Text paste blocked." notice appearing on blocked attempts.

Clipboard permission is granted to the test origin via
`context.grantPermissions(["clipboard-read", "clipboard-write"])`; the
paste shortcut is `Meta+V` on macOS and `Control+V` elsewhere.

## Adding tests

A behavior change in `src/` should come with a matching unit test, and
a change in observable page behavior (a new blocked surface, a new
pass-through) should also get an e2e case. Keep the manifest test in
step with any `manifest.json` edit — it is the regression net for the
wiring this architecture depends on.

# Releasing

There is no published Chrome Web Store listing or GitHub Release yet;
users install a development build. When a release is cut, it should be
built from its matching Git tag.

## Build the archive

```sh
pnpm install --frozen-lockfile
pnpm check          # typecheck + unit + e2e
pnpm package
```

`pnpm package` compiles the TypeScript sources, runs the package tests,
and writes `dist/no-paste-<version>.zip`. The version comes from
`package.json` / `manifest.json` — keep them identical.

## Package contents

The ZIP contains only what the unpacked extension needs:

- `background.js`, `clipboard-guard.js`, `content.js`, and `options.js` (compiled, bundled)
- `options.html`
- `manifest.json`
- `icons/icon-{16,32,48,128}.png`
- `LICENSE`

No TypeScript sources, tests, tooling, or `node_modules` are included.

## Release checklist

1. Bump `version` in `package.json` and `manifest.json` to match.
2. Add a section to `CHANGELOG.md` for the new version.
3. Run `pnpm check`, then `pnpm package`.
4. Tag the release commit (`v<version>`) and create the GitHub Release
   from that tag, attaching `dist/no-paste-<version>.zip`.
5. Update the README install section if the install steps change.

## Install verification

Extract the ZIP, load the folder at `chrome://extensions` with
Developer mode on, and reload open tabs. Verify a text paste is blocked
with the notice, an image-only paste still works by default, and the
options page image-blocking setting blocks a subsequent image-only paste
when enabled.

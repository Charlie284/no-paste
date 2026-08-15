# Contributing

Bug reports and focused pull requests are welcome.

## Development setup

No Paste requires Node.js 20.6 or newer and pnpm 11.

```sh
pnpm install
pnpm exec playwright install chromium
pnpm build
pnpm check
```

Run `pnpm package` to build and validate the installable extension archive.

## Pull requests

- Keep changes focused on blocking text paste without interfering with typing or non-text clipboard data.
- Keep source and development tooling in TypeScript; generated JavaScript belongs only in build artifacts.
- Add or update tests for behavior changes.
- Run `pnpm check` before submitting the pull request.
- Document changes to permissions, page access, data handling, or browser support.

By submitting a contribution, you agree that it may be distributed under the MIT License.

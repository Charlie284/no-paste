# Contributing

Bug reports and focused pull requests are welcome.

## Development setup

No Paste requires Node.js 20 or newer and pnpm 11.

```sh
pnpm install
pnpm exec playwright install chromium
pnpm check
```

Run `pnpm package` to build and validate the installable extension archive.

## Pull requests

- Keep changes focused on blocking text paste without interfering with typing or non-text clipboard data.
- Add or update tests for behavior changes.
- Run `pnpm check` before submitting the pull request.
- Document changes to permissions, page access, data handling, or browser support.

By submitting a contribution, you agree that it may be distributed under the MIT License.

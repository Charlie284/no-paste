# Changelog

All notable changes to No Paste are documented here.

## Unreleased

### Added

- An optional image-paste blocking setting in the extension options. It is off by default, persists locally without new permissions, and applies only where Chrome already permits the extension to run.
- Image-aware blocked-paste notices and asynchronous Clipboard API guarding when the setting is enabled.

## [1.1.0] - 2026-08-15

### Added

- Text-only paste blocking across inputs, textareas, editable content, shadow DOM, and accessible frames.
- Best-effort protection against asynchronous Clipboard API text reads.
- An accessible notice when text paste is blocked.
- Extension icons, browser-level tests, continuous integration, and versioned ZIP packaging.

### Changed

- Image-only paste and ordinary typing remain available.
- Runtime code, release tooling, and tests are now maintained in TypeScript and compiled for Chrome.
- Documentation now explains permissions, privacy, coverage, and browser limitations.

[1.1.0]: https://github.com/Charlie284/no-paste/releases/tag/v1.1.0

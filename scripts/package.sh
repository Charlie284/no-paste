#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="$(node -p "require('$project_dir/manifest.json').version")"
output_dir="$project_dir/dist"
archive="$output_dir/no-paste-$version.zip"

mkdir -p "$output_dir"
rm -f "$archive"

cd "$project_dir"
zip -q "$archive" \
  manifest.json \
  clipboard-guard.js \
  content.js \
  icons/icon-16.png \
  icons/icon-32.png \
  icons/icon-48.png \
  icons/icon-128.png

printf '%s\n' "$archive"

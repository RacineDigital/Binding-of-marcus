#!/usr/bin/env bash
# Upload the resulting zip as an HTML game on itch.io.
set -euo pipefail
cd "$(dirname "$0")/.."
LOST_MARCUS_DISTRIBUTION=itch npm run build
VERSION="$(node -p "require('./package.json').version")"
mkdir -p release-itch
ARCHIVE="Lost-Marcus-${VERSION}-web.zip"
# Delete only the archive we are regenerating; preserve other release artifacts.
rm -f "release-itch/$ARCHIVE"
(cd dist && zip -qr "../release-itch/$ARCHIVE" .)
zip -qj "release-itch/$ARCHIVE" THIRD_PARTY_NOTICES.txt
# index.html must be at the archive root, with the recorded soundtrack included.
unzip -Z1 "release-itch/$ARCHIVE" | rg -x 'index.html'
unzip -Z1 "release-itch/$ARCHIVE" | rg -x 'music/cellar.ogg'
printf 'itch.io browser upload: release-itch/%s\n' "$ARCHIVE"

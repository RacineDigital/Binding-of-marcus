#!/usr/bin/env bash
# Builds the game and packages the downloadable release files into release/.
#   bash scripts/package-release.sh v1.0.0
set -euo pipefail
VERSION="${1:-v$(node -p "require('./package.json').version")}"
cd "$(dirname "$0")/.."

npm run build
npm run build:single

rm -rf release
mkdir -p "release/Lost-Marcus"
cp dist-single/index.html "release/Lost-Marcus/Lost Marcus.html"
# the chapter soundtrack sits next to the page (the page falls back to synth music without it)
if [ -d dist-single/music ]; then cp -r dist-single/music "release/Lost-Marcus/music"; fi
cp .github/release/PLAY.txt "release/Lost-Marcus/PLAY.txt"

# 1. Zip with the standalone game + instructions (the main download)
(cd release && zip -qr "Lost-Marcus-$VERSION.zip" Lost-Marcus)
# 2. The standalone HTML on its own
cp dist-single/index.html "release/Lost-Marcus-$VERSION.html"
# 3. Multi-file web build for hosting on itch.io / Netlify / GitHub Pages
(cd dist && zip -qr "../release/Lost-Marcus-$VERSION-web.zip" .)

rm -rf "release/Lost-Marcus"
ls -lh release

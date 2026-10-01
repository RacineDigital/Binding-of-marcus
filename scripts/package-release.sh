#!/usr/bin/env bash
# Builds the game and packages the downloadable release files into release/.
#   bash scripts/package-release.sh v1.0.0
set -euo pipefail
VERSION="${1:-v$(node -p "require('./package.json').version")}"
cd "$(dirname "$0")/.."

npm run build
npm run build:single

rm -rf release
mkdir -p "release/Binding-of-Marcus"
cp dist-single/index.html "release/Binding-of-Marcus/Binding of Marcus.html"
cp .github/release/PLAY.txt "release/Binding-of-Marcus/PLAY.txt"

# 1. Zip with the standalone game + instructions (the main download)
(cd release && zip -qr "Binding-of-Marcus-$VERSION.zip" Binding-of-Marcus)
# 2. The standalone HTML on its own
cp dist-single/index.html "release/Binding-of-Marcus-$VERSION.html"
# 3. Multi-file web build for hosting on itch.io / Netlify / GitHub Pages
(cd dist && zip -qr "../release/Binding-of-Marcus-$VERSION-web.zip" .)

rm -rf "release/Binding-of-Marcus"
ls -lh release

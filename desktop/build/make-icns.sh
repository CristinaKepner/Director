#!/bin/sh
# PNG → .icns (macOS only). Run after `node desktop/build/make-icon.mjs`.
set -e
cd "$(dirname "$0")"
rm -rf icon.iconset && mkdir icon.iconset
for pair in "16 icon_16x16" "32 icon_16x16@2x" "32 icon_32x32" "64 icon_32x32@2x" \
            "128 icon_128x128" "256 icon_128x128@2x" "256 icon_256x256" "512 icon_256x256@2x" \
            "512 icon_512x512" "1024 icon_512x512@2x"; do
  set -- $pair
  sips -z "$1" "$1" icon.png --out "icon.iconset/$2.png" >/dev/null
done
iconutil -c icns icon.iconset -o icon.icns
rm -rf icon.iconset
echo "wrote $(pwd)/icon.icns"

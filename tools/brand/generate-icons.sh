#!/usr/bin/env bash
#
# Regenerates every favicon, touch icon and manifest icon for the professional portal.
#
#   ./tools/brand/generate-icons.sh
#
# SOURCE: tools/brand/brand.png — the Abofonsa BridgeCare badge, 383x383, 8-bit RGB, no alpha.
# It is a copy of docs/brand.png (md5 14942c0fc564331df825f1970c8e9dad), which is the same master
# checked into every sibling product repo. It is vendored here rather than read across the workspace
# because docs/ is a separate — and private — git repository: a relative path out of this repo would
# make the icons unreproducible for anyone who cloned only this one.
#
# tools/brand/icon.html wraps that PNG in the circle clip and navy field the icons actually need,
# and explains the two measured numbers it uses. Every size is rendered from it, 16px included; see
# docs/brand-update.md § W1 for why the small end is knowingly a smudge and what the escape hatch is.
#
# Rasterising is done by headless Google Chrome, following hc-patient. That is deliberate: this repo
# has no image tooling — no sharp, no ImageMagick, no rsvg, not even Pillow — and adding a native
# build dependency for assets regenerated once a year is a poor trade. Chrome is already a hard
# requirement for anyone deploying this stack, since every deploy ends by loading the dashboard in a
# real browser.
#
# The .ico is written by hand below because no icon tooling is available either. It embeds PNGs,
# which every current browser and Windows Vista+ understand.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."   # repo root
HERE="tools/brand"
WEB="src/main/webapp"
IMG="$WEB/content/images"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

CHROME="${CHROME:-google-chrome}"
command -v "$CHROME" >/dev/null || { echo "need $CHROME on PATH (or set CHROME=)"; exit 1; }

[ -f "$HERE/brand.png" ] || { echo "missing $HERE/brand.png"; exit 1; }

render() { # size, destination
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
            --force-device-scale-factor=1 \
            --screenshot="$2" --window-size="$1,$1" "file://$PWD/$HERE/icon.html" >/dev/null 2>&1
}

echo "rendering..."
for s in 16 32 36 48 57 60 70 72 76 96 114 120 144 150 152 180 192 256 310 384 512; do
  render "$s" "$OUT/icon-$s.png"
done

echo "building favicon.ico (16/32/48)..."
python3 - "$OUT" <<'PY'
import struct, sys, os
out = sys.argv[1]
imgs = [(s, open(os.path.join(out, f'icon-{s}.png'), 'rb').read()) for s in (16, 32, 48)]
header = struct.pack('<HHH', 0, 1, len(imgs))
offset = 6 + 16 * len(imgs)
entries = b''
for s, data in imgs:
    entries += struct.pack('<BBBBHHII', s, s, 0, 0, 1, 32, len(data), offset)
    offset += len(data)
open(os.path.join(out, 'favicon.ico'), 'wb').write(header + entries + b''.join(d for _, d in imgs))
PY

echo "installing..."
cp "$OUT/favicon.ico" "$WEB/favicon.ico"
cp "$OUT/favicon.ico" "$IMG/favicon.ico"
for s in 16 32 96; do cp "$OUT/icon-$s.png" "$IMG/favicon-${s}x${s}.png"; done
for s in 36 48 72 96 144 192; do cp "$OUT/icon-$s.png" "$IMG/android-icon-${s}x${s}.png"; done
for s in 57 60 72 76 114 120 144 152 180; do cp "$OUT/icon-$s.png" "$IMG/apple-icon-${s}x${s}.png"; done
cp "$OUT/icon-192.png" "$IMG/apple-icon.png"
cp "$OUT/icon-192.png" "$IMG/apple-icon-precomposed.png"
for s in 70 144 150 310; do cp "$OUT/icon-$s.png" "$IMG/ms-icon-${s}x${s}.png"; done
for s in 192 256 384 512; do cp "$OUT/icon-$s.png" "$IMG/icon-${s}x${s}.png"; done

# Root-level PNG favicons are NOT regenerated on purpose, and were deleted when this landed:
# angular.json's assets list copies content/, favicon.ico, manifest.webapp and robots.txt only, so a
# PNG at the webapp root never reaches a production build. index.html therefore links the
# content/images/ copies. favicon.ico is the one exception, and it is copied to both places above
# because angular.json names it explicitly and ngsw-config.json prefetches /favicon.ico.
echo "done. $(git status --short -- "$WEB" | wc -l) file(s) changed."

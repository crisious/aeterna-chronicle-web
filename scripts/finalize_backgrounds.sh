#!/bin/bash
# Finalize: copy pixel art backgrounds over originals + git commit
set -e
cd /Users/crisious_mini/Library/CloudStorage/SynologyDrive-Obsidian/게임기획/에테르나크로니클

SRC="assets/generated_pixel_art/environment/backgrounds"
DST="assets/generated/environment/backgrounds"

if [ ! -d "$SRC" ]; then
  echo "❌ Source dir not found: $SRC"
  exit 1
fi

COUNT=$(ls "$SRC"/*.png 2>/dev/null | wc -l | tr -d ' ')
echo "📁 Found $COUNT pixel art backgrounds in $SRC"

if [ "$COUNT" -lt 10 ]; then
  echo "❌ Too few files ($COUNT). Generation may not be complete."
  exit 1
fi

# Copy over
cp "$SRC"/*.png "$DST/"
echo "✅ Copied $COUNT backgrounds to $DST"

# Git commit
git add "$DST"
git commit -m "art: 배경 ${COUNT}장 픽셀아트 교체 (ComfyUI SD1.5 + LoRA)"
git push
echo "✅ Committed and pushed"

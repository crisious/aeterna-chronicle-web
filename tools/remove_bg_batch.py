#!/usr/bin/env python3
"""P18 후처리 — 배경 제거 배치 스크립트"""
import os, sys, glob, time
from PIL import Image
from rembg import remove

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)

dirs = [
    "assets/generated/characters",
    "assets/generated/monsters",
    "assets/generated/vfx",
    "assets/generated/cosmetics",
    "assets/generated/ui",
]

total = 0
ok = 0
fail = 0
errors = []
t0 = time.time()

for d in dirs:
    pngs = sorted(glob.glob(f"{d}/**/*.png", recursive=True))
    print(f"\n=== {d} ({len(pngs)} files) ===")
    for png in pngs:
        total += 1
        try:
            img = Image.open(png)
            out = remove(img)
            out.save(png)
            ok += 1
            if ok % 50 == 0:
                elapsed = time.time() - t0
                print(f"  [{ok}/{total}] {elapsed:.0f}s elapsed — {png}")
        except Exception as e:
            fail += 1
            errors.append((png, str(e)))
            print(f"  FAIL: {png} — {e}")

elapsed = time.time() - t0
print(f"\n{'='*50}")
print(f"Done in {elapsed:.0f}s | OK: {ok} | FAIL: {fail} | Total: {total}")
if errors:
    print("Failed files:")
    for f, e in errors:
        print(f"  {f}: {e}")

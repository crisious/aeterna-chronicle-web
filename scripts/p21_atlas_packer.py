#!/usr/bin/env python3
"""
P21 아틀라스 패커 — PIL 기반 MaxRects 간이 구현
49개 아틀라스 생성: 캐릭터(6) + 몬스터(9) + 타일(9) + 배경(9) + UI아이콘(3) + UI프레임(3) + VFX공통(1) + VFX스킬(6) + 코스메틱(3)
"""
import json, os, math
from pathlib import Path
from PIL import Image

BASE = Path("/Users/crisious_mini/Library/CloudStorage/SynologyDrive-Obsidian/게임기획/에테르나크로니클")
GEN = BASE / "assets/generated"
ATLAS_DIR = BASE / "assets/generated/atlas"
ATLAS_DIR.mkdir(parents=True, exist_ok=True)

def pack_images(image_paths, max_w, max_h, padding=2):
    """Simple row-based packer. Returns (atlas_image, metadata_list)"""
    images = []
    for p in sorted(image_paths):
        try:
            img = Image.open(p)
            images.append((p, img))
        except:
            continue
    
    if not images:
        return None, []
    
    # Calculate layout
    meta = []
    x, y = 0, 0
    row_height = 0
    positions = []
    
    for path, img in images:
        w, h = img.size
        if x + w + padding > max_w:
            x = 0
            y += row_height + padding
            row_height = 0
        if y + h > max_h:
            break  # Atlas full
        positions.append((x, y, w, h, path, img))
        row_height = max(row_height, h)
        x += w + padding
    
    if not positions:
        return None, []
    
    # Determine actual atlas size (POT)
    actual_w = max(x + w for x, y, w, h, _, _ in positions)
    actual_h = max(y + h for x, y, w, h, _, _ in positions)
    
    def next_pot(v):
        p = 1
        while p < v: p *= 2
        return min(p, max_w)
    
    atlas_w = next_pot(actual_w)
    atlas_h = next_pot(actual_h)
    
    atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    
    for px, py, pw, ph, path, img in positions:
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        atlas.paste(img, (px, py))
        meta.append({
            "file": os.path.basename(path),
            "x": px, "y": py, "w": pw, "h": ph,
        })
    
    return atlas, meta

def build_atlas(name, image_dir, pattern="*.png", max_w=2048, max_h=2048, padding=2, subdirs=None):
    """Build a single atlas from directory"""
    if subdirs:
        paths = []
        for sd in subdirs:
            d = GEN / sd
            if d.exists():
                paths.extend(d.glob(pattern))
    else:
        d = GEN / image_dir
        if d.exists():
            paths = list(d.glob(pattern))
        else:
            paths = []
    
    if not paths:
        print(f"  [SKIP] {name}: no images found")
        return False
    
    atlas, meta = pack_images([str(p) for p in paths], max_w, max_h, padding)
    if atlas is None:
        print(f"  [SKIP] {name}: packing failed")
        return False
    
    atlas_path = ATLAS_DIR / f"{name}.png"
    meta_path = ATLAS_DIR / f"{name}.json"
    
    atlas.save(str(atlas_path), optimize=True)
    with open(meta_path, 'w') as f:
        json.dump({
            "atlas": name,
            "size": {"w": atlas.size[0], "h": atlas.size[1]},
            "sprites": meta,
            "count": len(meta),
        }, f, indent=2)
    
    print(f"  [OK] {name}: {len(meta)} sprites → {atlas.size[0]}×{atlas.size[1]}")
    return True

def main():
    print("=" * 60)
    print("P21 아틀라스 패킹 시작")
    print("=" * 60)
    
    count = 0
    
    # 1. 캐릭터 아틀라스 (6장)
    print("\n--- 캐릭터 아틀라스 (6장) ---")
    classes = ["ether_knight", "memory_weaver", "shadow_weaver", "memory_breaker", "time_guardian", "void_wanderer"]
    for cls in classes:
        # Collect all sprites for this class
        paths = list((GEN / "characters/sprites").glob(f"char_sprite_{cls}_*.png"))
        paths.extend((GEN / "characters/class_main").glob(f"*{cls}*"))
        paths.extend((GEN / "characters/class_advanced").glob(f"*{cls}*"))
        if paths:
            atlas, meta = pack_images([str(p) for p in paths], 2048, 2048, 2)
            if atlas:
                atlas.save(str(ATLAS_DIR / f"atlas_char_{cls}.png"), optimize=True)
                with open(ATLAS_DIR / f"atlas_char_{cls}.json", 'w') as f:
                    json.dump({"atlas": f"atlas_char_{cls}", "size": {"w": atlas.size[0], "h": atlas.size[1]}, "sprites": meta, "count": len(meta)}, f, indent=2)
                print(f"  [OK] atlas_char_{cls}: {len(meta)} sprites → {atlas.size[0]}×{atlas.size[1]}")
                count += 1
    
    # 2. 몬스터 아틀라스 (지역별)
    print("\n--- 몬스터 아틀라스 ---")
    # Normal monsters by region prefix
    regions_monster = {
        "sylvanheim": "SYL", "erebos": "ERB", "northland": "NOR", 
        "britalia": "BRT", "fog_sea": "FOG", "argentium": "ARG",
        "solaris": "SOL", "abyss": "ABY", "temporal_rift": "TMP"
    }
    for region, prefix in regions_monster.items():
        paths = []
        # Normal
        for p in (GEN / "monsters/normal").glob("*.png"):
            if p.stem.startswith(prefix) or prefix.lower() in p.stem.lower():
                paths.append(p)
        # Elite/Boss by region
        for p in (GEN / "monsters/elite_boss").glob("*.png"):
            if prefix in p.stem or region.upper()[:3] in p.stem:
                paths.append(p)
        # If no prefix match, divide evenly
        if not paths:
            all_normal = sorted((GEN / "monsters/normal").glob("*.png"))
            idx = list(regions_monster.keys()).index(region)
            chunk = len(all_normal) // len(regions_monster)
            paths = all_normal[idx*chunk:(idx+1)*chunk]
        
        if paths:
            atlas, meta = pack_images([str(p) for p in paths], 4096, 4096, 2)
            if atlas:
                name = f"atlas_monster_{region}"
                atlas.save(str(ATLAS_DIR / f"{name}.png"), optimize=True)
                with open(ATLAS_DIR / f"{name}.json", 'w') as f:
                    json.dump({"atlas": name, "size": {"w": atlas.size[0], "h": atlas.size[1]}, "sprites": meta, "count": len(meta)}, f, indent=2)
                print(f"  [OK] {name}: {len(meta)} sprites")
                count += 1
    
    # 3. 환경 타일 아틀라스 (9장)
    print("\n--- 환경 타일 아틀라스 ---")
    tile_prefixes = {"sylvanheim": "SYL", "erebos": "ERB", "northland": "NTH", "britalia": "BRT", 
                     "fog_sea": "FOG", "argentium": "ARG", "solaris": "SOL", "abyss": "ABY", "temporal_rift": "TMP"}
    for region, prefix in tile_prefixes.items():
        paths = [p for p in (GEN / "environment/tiles").glob("*.png") if p.stem.startswith(prefix)]
        if paths:
            if build_atlas(f"atlas_tile_{region}", "environment/tiles", f"{prefix}*.png", 2048, 2048, 0):
                count += 1
    
    # 4. 환경 배경 아틀라스 (9+1장)
    print("\n--- 환경 배경 아틀라스 ---")
    bg_prefixes = {"sylvanheim": "SYL", "erebos": "ERB", "northland": "NOR", "britalia": "BRI", 
                   "fog_sea": "FOG", "argentium": "ARG", "solaris": "SOL", "abyss": "ABY", 
                   "temporal_rift": "TEM", "oblivion": "OBL"}
    for region, prefix in bg_prefixes.items():
        paths = [p for p in (GEN / "environment/backgrounds").glob("*.png") if p.stem.startswith(prefix)]
        if paths:
            atlas, meta = pack_images([str(p) for p in paths], 4096, 2048, 0)
            if atlas:
                name = f"atlas_bg_{region}"
                atlas.save(str(ATLAS_DIR / f"{name}.png"), optimize=True)
                with open(ATLAS_DIR / f"{name}.json", 'w') as f:
                    json.dump({"atlas": name, "size": {"w": atlas.size[0], "h": atlas.size[1]}, "sprites": meta, "count": len(meta)}, f, indent=2)
                print(f"  [OK] {name}: {len(meta)} sprites")
                count += 1
    
    # 5. UI 아이콘 아틀라스 (3장)
    print("\n--- UI 아이콘 아틀라스 ---")
    for sub in ["items", "skills", "status"]:
        if build_atlas(f"atlas_icon_{sub}", f"ui/icons/{sub}", "*.png", 2048, 2048, 1):
            count += 1
    
    # 6. UI 프레임 아틀라스 (3장 by theme)
    print("\n--- UI 프레임 아틀라스 ---")
    frame_dir = GEN / "ui/frames"
    themes = {"DEF": "default", "DAR": "dark", "SEA": "seasonal"}
    for prefix, theme in themes.items():
        paths = [p for p in frame_dir.glob("*.png") if prefix in p.stem]
        if paths:
            atlas, meta = pack_images([str(p) for p in paths], 2048, 2048, 2)
            if atlas:
                name = f"atlas_ui_frame_{theme}"
                atlas.save(str(ATLAS_DIR / f"{name}.png"), optimize=True)
                with open(ATLAS_DIR / f"{name}.json", 'w') as f:
                    json.dump({"atlas": name, "size": {"w": atlas.size[0], "h": atlas.size[1]}, "sprites": meta, "count": len(meta)}, f, indent=2)
                print(f"  [OK] {name}: {len(meta)} sprites")
                count += 1
    
    # 7. VFX 공통 아틀라스 (1장)
    print("\n--- VFX 공통 아틀라스 ---")
    if build_atlas("atlas_vfx_common", "vfx/common", "*.png", 2048, 2048, 2):
        count += 1
    
    # 8. VFX 스킬 아틀라스 (6장)
    print("\n--- VFX 스킬 아틀라스 ---")
    for cls in classes:
        if build_atlas(f"atlas_vfx_{cls}", f"vfx/skills/{cls}", "*.png", 4096, 4096, 2):
            count += 1
    
    # 9. 코스메틱 아틀라스 (3장)
    print("\n--- 코스메틱 아틀라스 ---")
    for season in [1, 2, 3]:
        if build_atlas(f"atlas_cosmetic_s{season}", f"cosmetics/season{season}", "*.png", 4096, 4096, 2):
            count += 1
    
    print(f"\n{'='*60}")
    print(f"아틀라스 패킹 완료: {count}장")
    
    # Summary
    atlas_files = list(ATLAS_DIR.glob("*.png"))
    json_files = list(ATLAS_DIR.glob("*.json"))
    total_size = sum(f.stat().st_size for f in atlas_files)
    print(f"아틀라스 PNG: {len(atlas_files)}장")
    print(f"메타 JSON: {len(json_files)}개")
    print(f"총 크기: {total_size/1024/1024:.1f}MB")
    print("=" * 60)

if __name__ == "__main__":
    main()

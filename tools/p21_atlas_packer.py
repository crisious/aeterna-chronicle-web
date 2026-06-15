#!/usr/bin/env python3
"""
P21 아틀라스 패커.

Aseprite로 생성한 개별 runtime PNG를 atlas 파생물로 다시 묶는다.
프로젝트 상대 경로를 기본값으로 사용하며, atlas에 들어가지 못한 이미지는
조용히 누락하지 않고 오류로 처리한다.
"""

import argparse
import json
import os
import shutil
from pathlib import Path

from PIL import Image


BASE = Path(__file__).resolve().parents[1]
GEN = BASE / "assets/generated"
ATLAS_DIR = GEN / "atlas"
PUBLIC_ATLAS_DIR = BASE / "client/public/assets/atlas"
NEAREST = Image.Resampling.NEAREST if hasattr(Image, "Resampling") else Image.NEAREST


def configure_paths(args):
    global BASE, GEN, ATLAS_DIR, PUBLIC_ATLAS_DIR

    BASE = Path(args.project_root).resolve()
    GEN = Path(args.generated_root).resolve() if args.generated_root else BASE / "assets/generated"
    ATLAS_DIR = Path(args.atlas_dir).resolve() if args.atlas_dir else GEN / "atlas"
    PUBLIC_ATLAS_DIR = (
        Path(args.public_atlas_dir).resolve()
        if args.public_atlas_dir
        else BASE / "client/public/assets/atlas"
    )

    ATLAS_DIR.mkdir(parents=True, exist_ok=True)
    if args.publish_public:
        PUBLIC_ATLAS_DIR.mkdir(parents=True, exist_ok=True)


def next_power_of_two(value, max_value):
    size = 1
    while size < value:
        size *= 2
    return min(size, max_value)


def read_image(path):
    with Image.open(path) as image:
        return image.convert("RGBA")


def pack_images(image_paths, max_w, max_h, padding=2, atlas_name="atlas"):
    """행 기반 deterministic packer. 모든 이미지가 들어가지 않으면 실패한다."""
    images = []
    for raw_path in sorted(image_paths):
        path = Path(raw_path)
        if not path.exists():
            continue
        images.append((path, read_image(path)))

    if not images:
        return None, []

    meta = []
    positions = []
    omitted = []
    x = 0
    y = 0
    row_height = 0

    for path, image in images:
        w, h = image.size
        if w > max_w or h > max_h:
            omitted.append(f"{path.name} ({w}x{h})")
            continue

        if x > 0 and x + w > max_w:
            x = 0
            y += row_height + padding
            row_height = 0

        if y + h > max_h:
            omitted.append(f"{path.name} ({w}x{h})")
            continue

        positions.append((x, y, w, h, path, image))
        row_height = max(row_height, h)
        x += w + padding

    if omitted:
        preview = ", ".join(omitted[:8])
        suffix = "" if len(omitted) <= 8 else f", ... +{len(omitted) - 8}"
        raise RuntimeError(
            f"{atlas_name}: {len(omitted)} image(s) did not fit inside "
            f"{max_w}x{max_h}: {preview}{suffix}"
        )

    if not positions:
        return None, []

    actual_w = max(px + pw for px, _, pw, _, _, _ in positions)
    actual_h = max(py + ph for _, py, _, ph, _, _ in positions)
    atlas_w = next_power_of_two(actual_w, max_w)
    atlas_h = next_power_of_two(actual_h, max_h)

    atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    for px, py, pw, ph, path, image in positions:
        atlas.paste(image, (px, py))
        meta.append({
            "file": os.path.basename(path),
            "x": px,
            "y": py,
            "w": pw,
            "h": ph,
        })

    return atlas, meta


def write_atlas(name, atlas, meta, publish_public):
    atlas_path = ATLAS_DIR / f"{name}.png"
    meta_path = ATLAS_DIR / f"{name}.json"

    atlas.save(str(atlas_path), optimize=True)
    with open(meta_path, "w", encoding="utf-8") as file:
        json.dump({
            "atlas": name,
            "size": {"w": atlas.size[0], "h": atlas.size[1]},
            "sprites": meta,
            "count": len(meta),
        }, file, indent=2)
        file.write("\n")

    if publish_public:
        shutil.copy2(atlas_path, PUBLIC_ATLAS_DIR / atlas_path.name)
        shutil.copy2(meta_path, PUBLIC_ATLAS_DIR / meta_path.name)


def resize_image(image, target_size):
    if image.size == target_size:
        return image
    return image.resize(target_size, NEAREST)


def load_runtime_image(relative_path, target_size=None):
    image = read_image(GEN / relative_path)
    return resize_image(image, target_size) if target_size else image


def load_strip_frame(relative_path, frame_index, frame_w, frame_h, target_size=None):
    source_path = GEN / relative_path
    image = read_image(source_path)
    left = frame_index * frame_w
    right = left + frame_w
    if right > image.size[0] or frame_h > image.size[1]:
        raise RuntimeError(
            f"{source_path}: frame {frame_index} ({frame_w}x{frame_h}) "
            f"is outside source image {image.size[0]}x{image.size[1]}"
        )
    frame = image.crop((left, 0, right, frame_h))
    return resize_image(frame, target_size) if target_size else frame


def pack_named_images(named_images, max_w, max_h, padding, atlas_name):
    if not named_images:
        raise RuntimeError(f"{atlas_name}: no alias frames configured")

    positions = []
    omitted = []
    x = 0
    y = 0
    row_height = 0

    for frame_name, image in named_images:
        w, h = image.size
        if w > max_w or h > max_h:
            omitted.append(f"{frame_name} ({w}x{h})")
            continue

        if x > 0 and x + w > max_w:
            x = 0
            y += row_height + padding
            row_height = 0

        if y + h > max_h:
            omitted.append(f"{frame_name} ({w}x{h})")
            continue

        positions.append((frame_name, x, y, w, h, image))
        row_height = max(row_height, h)
        x += w + padding

    if omitted:
        preview = ", ".join(omitted[:8])
        suffix = "" if len(omitted) <= 8 else f", ... +{len(omitted) - 8}"
        raise RuntimeError(
            f"{atlas_name}: {len(omitted)} alias frame(s) did not fit inside "
            f"{max_w}x{max_h}: {preview}{suffix}"
        )

    actual_w = max(px + pw for _, px, _, pw, _, _ in positions)
    actual_h = max(py + ph for _, _, py, _, ph, _ in positions)
    atlas_w = next_power_of_two(actual_w, max_w)
    atlas_h = next_power_of_two(actual_h, max_h)

    atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    frames = {}
    for frame_name, px, py, pw, ph, image in positions:
        atlas.paste(image, (px, py))
        frames[frame_name] = {
            "frame": {"x": px, "y": py, "w": pw, "h": ph},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": pw, "h": ph},
            "sourceSize": {"w": pw, "h": ph},
        }

    return atlas, frames


def write_texture_packer_alias(name, named_images):
    atlas, frames = pack_named_images(named_images, 1024, 1024, 2, name)
    atlas_path = PUBLIC_ATLAS_DIR / f"{name}.png"
    meta_path = PUBLIC_ATLAS_DIR / f"{name}.json"

    atlas.save(str(atlas_path), optimize=True)
    with open(meta_path, "w", encoding="utf-8") as file:
        json.dump({
            "frames": frames,
            "meta": {
                "app": "Aeterna Atlas Packer",
                "version": "2.0",
                "image": f"{name}.png",
                "format": "RGBA8888",
                "size": {"w": atlas.size[0], "h": atlas.size[1]},
                "scale": "1",
            },
        }, file, indent=2)
        file.write("\n")

    print(f"  [OK] {name}: {len(frames)} alias frames -> {atlas.size[0]}x{atlas.size[1]}")


def publish_core_aliases(publish_public):
    if not publish_public:
        return

    print("\n--- Phaser core atlas aliases ---")
    write_texture_packer_alias("characters", [
        ("erien_idle_01", load_strip_frame("characters/sprites/char_ether_knight_base.png", 0, 64, 64, (48, 64))),
        ("erien_walk_01", load_strip_frame("characters/sprites/char_ether_knight_base.png", 4, 64, 64, (48, 64))),
        ("erien_walk_02", load_strip_frame("characters/sprites/char_ether_knight_base.png", 5, 64, 64, (48, 64))),
        ("erien_attack_01", load_strip_frame("characters/sprites/char_ether_knight_base.png", 10, 64, 64, (64, 64))),
        ("seraphine_idle_01", load_runtime_image("characters/npc_sprites/05_seraphine_sprite.png", (48, 64))),
    ])
    write_texture_packer_alias("effects", [
        ("hit_slash_01", load_strip_frame("vfx/sprites/vfx_hit_slash.png", 0, 64, 64)),
        ("hit_slash_02", load_strip_frame("vfx/sprites/vfx_hit_slash.png", 1, 64, 64)),
        ("hit_blunt_01", load_strip_frame("vfx/common/VFX-CMN-001.png", 0, 64, 64)),
        ("hit_magic_01", load_strip_frame("vfx/common/VFX-CMN-002.png", 0, 64, 64)),
        ("particle_glow", load_strip_frame("vfx/common/VFX-CMN-003.png", 0, 64, 64, (32, 32))),
        ("particle_spark", load_strip_frame("vfx/common/VFX-CMN-004.png", 0, 64, 64, (16, 16))),
        ("buff_shield", load_runtime_image("ui/icons/status/status_shield.png")),
        ("buff_attack_up", load_runtime_image("ui/icons/status/status_attack_up.png")),
        ("debuff_poison", load_runtime_image("ui/icons/status/status_poison.png")),
        ("debuff_slow", load_runtime_image("ui/icons/status/status_slow.png")),
    ])
    write_texture_packer_alias("ui", [
        ("btn_normal", load_runtime_image("ui/frames/UI-BTN-001-DEF.png", (120, 40))),
        ("btn_hover", load_runtime_image("ui/frames/UI-BTN-002-DEF.png", (120, 40))),
        ("btn_pressed", load_runtime_image("ui/frames/UI-BTN-003-DEF.png", (120, 40))),
        ("icon_hp", load_runtime_image("ui/icons/status/status_shield.png", (24, 24))),
        ("icon_mp", load_runtime_image("ui/icons/status/status_haste.png", (24, 24))),
        ("slot_frame", load_runtime_image("ui/frames/UI-HUD-001-DEF.png", (48, 48))),
        ("panel_bg", load_runtime_image("ui/frames/UI-HUD-002-DEF.png", (256, 128))),
    ])


def build_atlas(name, image_dir, pattern="*.png", max_w=2048, max_h=2048, padding=2, subdirs=None, publish_public=True):
    if subdirs:
        paths = []
        for subdir in subdirs:
            directory = GEN / subdir
            if directory.exists():
                paths.extend(directory.glob(pattern))
    else:
        directory = GEN / image_dir
        paths = list(directory.glob(pattern)) if directory.exists() else []

    if not paths:
        print(f"  [SKIP] {name}: no images found")
        return 0

    atlas, meta = pack_images([str(path) for path in paths], max_w, max_h, padding, name)
    if atlas is None:
        print(f"  [SKIP] {name}: packing failed")
        return 0

    write_atlas(name, atlas, meta, publish_public)
    print(f"  [OK] {name}: {len(meta)} sprites -> {atlas.size[0]}x{atlas.size[1]}")
    return 1


def build_path_atlas(name, paths, max_w, max_h, padding, publish_public):
    if not paths:
        print(f"  [SKIP] {name}: no images found")
        return 0

    atlas, meta = pack_images([str(path) for path in paths], max_w, max_h, padding, name)
    if atlas is None:
        print(f"  [SKIP] {name}: packing failed")
        return 0

    write_atlas(name, atlas, meta, publish_public)
    print(f"  [OK] {name}: {len(meta)} sprites -> {atlas.size[0]}x{atlas.size[1]}")
    return 1


def parse_args():
    default_root = Path(os.environ.get("AETERNA_PROJECT_ROOT", Path(__file__).resolve().parents[1]))
    parser = argparse.ArgumentParser(description="Pack generated runtime PNG files into derived atlas PNG/JSON files.")
    parser.add_argument("--project-root", default=str(default_root), help="Project root. Defaults to this repository root.")
    parser.add_argument("--generated-root", default=None, help="Generated asset root. Defaults to <project-root>/assets/generated.")
    parser.add_argument("--atlas-dir", default=None, help="Atlas output directory. Defaults to <generated-root>/atlas.")
    parser.add_argument("--public-atlas-dir", default=None, help="Runtime atlas publish directory. Defaults to client/public/assets/atlas.")
    parser.add_argument(
        "--no-publish-public",
        dest="publish_public",
        action="store_false",
        help="Only write assets/generated/atlas and do not copy atlas_* files to client/public/assets/atlas.",
    )
    parser.set_defaults(publish_public=True)
    return parser.parse_args()


def main():
    args = parse_args()
    configure_paths(args)

    print("=" * 60)
    print("P21 atlas packing start")
    print("=" * 60)
    print(f"Project root: {BASE}")
    print(f"Generated root: {GEN}")
    print(f"Atlas output: {ATLAS_DIR}")
    if args.publish_public:
        print(f"Runtime publish: {PUBLIC_ATLAS_DIR}")

    count = 0
    classes = [
        "ether_knight",
        "memory_weaver",
        "shadow_weaver",
        "memory_breaker",
        "time_guardian",
        "void_wanderer",
    ]

    print("\n--- Character atlases ---")
    for class_id in classes:
        paths = list((GEN / "characters/sprites").glob(f"char_sprite_{class_id}_*.png"))
        paths.extend((GEN / "characters/class_main").glob(f"*{class_id}*"))
        paths.extend((GEN / "characters/class_advanced").glob(f"*{class_id}*"))
        count += build_path_atlas(f"atlas_char_{class_id}", paths, 2048, 2048, 2, args.publish_public)

    print("\n--- Monster atlases ---")
    regions_monster = {
        "sylvanheim": {"slugs": ["sylvanheim", "silvanhime"], "boss_codes": ["SYL"]},
        "erebos": {"slugs": ["erebos"], "boss_codes": ["ERB"]},
        "northland": {"slugs": ["northland"], "boss_codes": ["NOR"]},
        "britalia": {"slugs": ["britalia"], "boss_codes": ["BRT"]},
        "fog_sea": {"slugs": ["fog_sea"], "boss_codes": ["FOG"]},
        "argentium": {"slugs": ["argentium"], "boss_codes": ["ARG"]},
        "solaris": {"slugs": ["solaris"], "boss_codes": ["SOL"]},
        "abyss": {"slugs": ["abyss"], "boss_codes": ["ABY"]},
        "temporal_rift": {"slugs": ["temporal_rift"], "boss_codes": ["TEM", "TMP"]},
    }

    def monster_matches_region(path, region_config):
        stem = path.stem
        stem_lower = stem.lower()
        for slug in region_config["slugs"]:
            if stem_lower.startswith(f"mon_{slug}_"):
                return True
        for boss_code in region_config["boss_codes"]:
            if stem.startswith(f"BOSS-{boss_code}-"):
                return True
        return False

    for region, region_config in regions_monster.items():
        paths = []
        for path in (GEN / "monsters/normal").glob("*.png"):
            if monster_matches_region(path, region_config):
                paths.append(path)
        for path in (GEN / "monsters/elite_boss").glob("*.png"):
            if monster_matches_region(path, region_config):
                paths.append(path)
        count += build_path_atlas(f"atlas_monster_{region}", paths, 4096, 4096, 2, args.publish_public)

    print("\n--- Environment tile atlases ---")
    tile_prefixes = {
        "sylvanheim": "SYL",
        "erebos": "ERB",
        "northland": "NTH",
        "britalia": "BRT",
        "fog_sea": "FOG",
        "argentium": "ARG",
        "solaris": "SOL",
        "abyss": "ABY",
        "temporal_rift": "TMP",
    }
    for region, prefix in tile_prefixes.items():
        count += build_atlas(f"atlas_tile_{region}", "environment/tiles", f"{prefix}*.png", 4096, 2048, 0, publish_public=args.publish_public)

    print("\n--- Environment background atlases ---")
    bg_prefixes = {
        "sylvanheim": "SYL",
        "erebos": "ERB",
        "northland": "NOR",
        "britalia": "BRI",
        "fog_sea": "FOG",
        "argentium": "ARG",
        "solaris": "SOL",
        "abyss": "ABY",
        "temporal_rift": "TEM",
        "oblivion": "OBL",
    }
    for region, prefix in bg_prefixes.items():
        paths = [path for path in (GEN / "environment/backgrounds").glob("*.png") if path.stem.startswith(prefix)]
        count += build_path_atlas(f"atlas_bg_{region}", paths, 4096, 4096, 0, args.publish_public)

    print("\n--- UI icon atlases ---")
    for subdir in ["items", "skills", "status"]:
        count += build_atlas(f"atlas_icon_{subdir}", f"ui/icons/{subdir}", "*.png", 4096, 2048, 1, publish_public=args.publish_public)

    print("\n--- UI frame atlases ---")
    frame_dir = GEN / "ui/frames"
    themes = {"DEF": "default", "DAR": "dark", "SEA": "seasonal"}
    for prefix, theme in themes.items():
        paths = [path for path in frame_dir.glob("*.png") if prefix in path.stem]
        count += build_path_atlas(f"atlas_ui_frame_{theme}", paths, 8192, 4096, 2, args.publish_public)

    print("\n--- VFX common atlas ---")
    count += build_atlas("atlas_vfx_common", "vfx/common", "*.png", 4096, 2048, 2, publish_public=args.publish_public)

    print("\n--- VFX skill atlases ---")
    for class_id in classes:
        count += build_atlas(f"atlas_vfx_{class_id}", f"vfx/skills/{class_id}", "*.png", 4096, 2048, 2, publish_public=args.publish_public)

    print("\n--- Cosmetic atlases ---")
    for season in [1, 2, 3]:
        count += build_atlas(f"atlas_cosmetic_s{season}", f"cosmetics/season{season}", "*.png", 8192, 4096, 2, publish_public=args.publish_public)

    publish_core_aliases(args.publish_public)

    print(f"\n{'=' * 60}")
    print(f"Atlas packing complete: {count} atlas files")

    atlas_files = list(ATLAS_DIR.glob("atlas_*.png"))
    json_files = list(ATLAS_DIR.glob("atlas_*.json"))
    total_size = sum(path.stat().st_size for path in atlas_files)
    print(f"Atlas PNG: {len(atlas_files)}")
    print(f"Atlas JSON: {len(json_files)}")
    print(f"Total size: {total_size / 1024 / 1024:.1f}MB")
    print("=" * 60)


if __name__ == "__main__":
    main()

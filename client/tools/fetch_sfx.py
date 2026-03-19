#!/usr/bin/env python3
"""
fetch_sfx.py — Generate placeholder SFX for Aeterna Chronicle
Reads soundManifest.ts, generates audibly distinct .ogg files via ffmpeg.
"""
import re
import os
import subprocess
import sys

# ── Project root (one level up from tools/) ──
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
MANIFEST_PATH = os.path.join(PROJECT_ROOT, "src", "sound", "soundManifest.ts")
AUDIO_ROOT = os.path.join(PROJECT_ROOT, "public", "assets")


def parse_manifest(path: str) -> list[dict]:
    """Extract all SFX + ambient entries from soundManifest.ts."""
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    pattern = re.compile(
        r"\{\s*key:\s*'([^']+)'\s*,\s*path:\s*'([^']+)'\s*,\s*type:\s*'([^']+)'\s*,"
        r"\s*volume:\s*[\d.]+\s*,\s*loop:\s*(true|false)\s*,\s*category:\s*'([^']+)'\s*\}"
    )
    entries = []
    for m in pattern.finditer(text):
        t = m.group(3)
        if t in ("sfx", "ambient"):
            entries.append({
                "key": m.group(1),
                "path": m.group(2),
                "type": t,
                "category": m.group(5),
            })
    return entries


# ── ffmpeg generation recipes ──
# Each function returns an ffmpeg filter_complex string and duration.

def _combat_filter(key: str) -> tuple[str, float]:
    """Short metallic/impact sounds — each key gets unique freq/character."""
    presets = {
        "sword_slash_1":   (800, 0.15, "highpass=f=600,aecho=0.6:0.3:20:0.4"),
        "sword_slash_2":   (900, 0.13, "highpass=f=700,aecho=0.5:0.3:15:0.3"),
        "sword_slash_3":   (1000, 0.12, "highpass=f=800,aecho=0.4:0.3:10:0.3"),
        "heavy_strike":    (200, 0.3,  "lowpass=f=400,aecho=0.8:0.5:30:0.5"),
        "magic_fire":      (350, 0.5,  "tremolo=f=15:d=0.7,aecho=0.6:0.5:40:0.4"),
        "magic_ice":       (1200, 0.45, "highpass=f=900,tremolo=f=8:d=0.5,aecho=0.7:0.6:50:0.5"),
        "magic_lightning":  (2000, 0.25, "highpass=f=1500,tremolo=f=30:d=0.9"),
        "magic_heal":      (523, 0.6,  "tremolo=f=4:d=0.3,aecho=0.8:0.7:60:0.6"),
        "magic_dark":      (150, 0.5,  "lowpass=f=300,tremolo=f=6:d=0.8,aecho=0.7:0.6:50:0.5"),
        "arrow_shoot":     (1500, 0.1, "highpass=f=1200"),
        "arrow_hit":       (600, 0.08, "lowpass=f=800"),
        "critical_hit":    (400, 0.25, "aecho=0.8:0.5:15:0.6,tremolo=f=20:d=0.5"),
        "guard_block":     (500, 0.12, "highpass=f=400,aecho=0.5:0.3:10:0.4"),
        "guard_break":     (250, 0.3,  "lowpass=f=500,aecho=0.7:0.5:25:0.5"),
        "dodge_roll":      (300, 0.2,  "lowpass=f=600,tremolo=f=10:d=0.4"),
        "hit_flesh":       (180, 0.15, "lowpass=f=350"),
        "hit_metal":       (1100, 0.12, "highpass=f=800,aecho=0.6:0.4:8:0.5"),
        "hit_magic":       (700, 0.2,  "tremolo=f=12:d=0.6,aecho=0.5:0.4:20:0.4"),
        "skill_activate":  (660, 0.35, "tremolo=f=6:d=0.4,aecho=0.7:0.5:30:0.5"),
        "skill_ultimate":  (440, 0.6,  "tremolo=f=3:d=0.5,aecho=0.9:0.7:50:0.6"),
        "buff_apply":      (880, 0.3,  "tremolo=f=5:d=0.3,aecho=0.6:0.5:40:0.4"),
        "debuff_apply":    (220, 0.3,  "tremolo=f=7:d=0.6,lowpass=f=400"),
        "enemy_death":     (300, 0.4,  "aecho=0.7:0.5:30:0.5,lowpass=f=500"),
        "player_death":    (160, 0.6,  "lowpass=f=300,aecho=0.8:0.6:40:0.6"),
        "revive":          (587, 0.5,  "tremolo=f=3:d=0.3,aecho=0.8:0.7:50:0.5"),
    }
    # Extract short name from key (after sfx_)
    short = key.replace("sfx_", "")
    freq, dur, filt = presets.get(short, (440, 0.3, "aecho=0.5:0.3:20:0.4"))

    # Mix sine + noise for impact feel
    fc = (
        f"sine=frequency={freq}:duration={dur}[s];"
        f"anoisesrc=duration={dur}:color=white[n];"
        f"[n]volume=0.15[nv];"
        f"[s][nv]amix=inputs=2:duration=shortest[m];"
        f"[m]{filt},afade=t=in:d=0.005,afade=t=out:st={max(dur-0.05,0.01)}:d=0.05[out]"
    )
    return fc, dur


def _ui_filter(key: str) -> tuple[str, float]:
    """Short click/beep/chime sounds — pure tones."""
    presets = {
        "sfx_ui_click":          (1200, 0.05, None),
        "sfx_ui_hover":          (1800, 0.03, None),
        "sfx_ui_open":           (880, 0.15, "aecho=0.5:0.3:15:0.3"),
        "sfx_ui_close":          (660, 0.12, None),
        "sfx_ui_confirm":        (1047, 0.2, "aecho=0.4:0.3:10:0.3"),
        "sfx_ui_cancel":         (330, 0.15, None),
        "sfx_ui_error":          (200, 0.25, "tremolo=f=15:d=0.7"),
        "sfx_ui_level_up":       (None, 0.6, None),  # special: arpeggio
        "sfx_ui_achievement":    (None, 0.5, None),  # special: fanfare
        "sfx_ui_quest_accept":   (784, 0.25, "aecho=0.5:0.4:20:0.3"),
        "sfx_ui_quest_complete": (None, 0.4, None),  # special: ascending
        "sfx_ui_item_pickup":    (1320, 0.1, None),
        "sfx_ui_item_equip":     (600, 0.15, "aecho=0.4:0.3:10:0.3"),
        "sfx_ui_gold_gain":      (1500, 0.12, "aecho=0.3:0.2:8:0.3"),
        "sfx_ui_notification":   (940, 0.2, "aecho=0.5:0.4:15:0.3"),
    }
    freq, dur, filt = presets.get(key, (800, 0.15, None))

    if key == "sfx_ui_level_up":
        # C5 → E5 → G5 → C6 arpeggio
        fc = (
            "sine=frequency=523:duration=0.12[a];"
            "sine=frequency=659:duration=0.12[b];"
            "sine=frequency=784:duration=0.12[c];"
            "sine=frequency=1047:duration=0.2[d];"
            "[a][b][c][d]concat=n=4:v=0:a=1[m];"
            "[m]aecho=0.6:0.5:30:0.4,afade=t=out:st=0.4:d=0.16[out]"
        )
        return fc, 0.6
    elif key == "sfx_ui_achievement":
        # G4 → B4 → D5 → G5
        fc = (
            "sine=frequency=392:duration=0.1[a];"
            "sine=frequency=494:duration=0.1[b];"
            "sine=frequency=587:duration=0.1[c];"
            "sine=frequency=784:duration=0.2[d];"
            "[a][b][c][d]concat=n=4:v=0:a=1[m];"
            "[m]aecho=0.7:0.5:25:0.4,afade=t=out:st=0.3:d=0.15[out]"
        )
        return fc, 0.5
    elif key == "sfx_ui_quest_complete":
        # E5 → G5 → C6
        fc = (
            "sine=frequency=659:duration=0.1[a];"
            "sine=frequency=784:duration=0.1[b];"
            "sine=frequency=1047:duration=0.2[c];"
            "[a][b][c]concat=n=3:v=0:a=1[m];"
            "[m]aecho=0.5:0.4:20:0.3,afade=t=out:st=0.25:d=0.1[out]"
        )
        return fc, 0.4

    filt_chain = f"{filt}," if filt else ""
    fc = (
        f"sine=frequency={freq}:duration={dur}[s];"
        f"[s]{filt_chain}afade=t=in:d=0.003,afade=t=out:st={max(dur-0.02,0.005)}:d=0.02[out]"
    )
    return fc, dur


def _system_filter(key: str) -> tuple[str, float]:
    """Notification-style two-tone sounds."""
    presets = {
        "sfx_sys_login":         (880, 1047, 0.3),
        "sfx_sys_logout":        (1047, 880, 0.3),
        "sfx_sys_mail_arrive":   (1200, 1500, 0.25),
        "sfx_sys_party_invite":  (784, 988, 0.25),
        "sfx_sys_party_join":    (659, 784, 0.2),
        "sfx_sys_guild_notice":  (523, 784, 0.3),
        "sfx_sys_trade_request": (740, 988, 0.25),
        "sfx_sys_chat_whisper":  (1500, 1800, 0.15),
        "sfx_sys_screenshot":    (2000, 2400, 0.1),
        "sfx_sys_server_message":(600, 800, 0.3),
    }
    f1, f2, half = presets.get(key, (800, 1000, 0.2))
    dur = half * 2
    fc = (
        f"sine=frequency={f1}:duration={half}[a];"
        f"sine=frequency={f2}:duration={half}[b];"
        f"[a][b]concat=n=2:v=0:a=1[m];"
        f"[m]aecho=0.5:0.4:20:0.3,afade=t=in:d=0.005,afade=t=out:st={dur-0.05}:d=0.05[out]"
    )
    return fc, dur


def _memory_filter(key: str) -> tuple[str, float]:
    """Ethereal / reverb sounds with frequency sweeps."""
    presets = {
        "sfx_mem_fragment_detect":   (400, 800, 0.5),
        "sfx_mem_fragment_collect":  (600, 1200, 0.6),
        "sfx_mem_resonance_trigger": (300, 900, 0.5),
        "sfx_mem_resonance_burst":   (200, 1500, 0.4),
        "sfx_mem_memory_restore":    (500, 1000, 0.7),
        "sfx_mem_memory_dissolve":   (1000, 300, 0.6),
        "sfx_mem_oblivion_fog":      (150, 250, 0.8),
        "sfx_mem_memory_summon":     (350, 1100, 0.6),
        "sfx_mem_oblivion_arrow":    (1200, 400, 0.35),
        "sfx_mem_memory_explosion":  (250, 2000, 0.3),
    }
    f_start, f_end, dur = presets.get(key, (400, 800, 0.5))

    # Use aevalsrc for a frequency sweep
    sweep_expr = f"{f_start}+({f_end}-{f_start})*t/{dur}"
    fc = (
        f"aevalsrc='sin(2*PI*({sweep_expr})*t)':s=48000:d={dur}[s];"
        f"anoisesrc=duration={dur}:color=pink[n];"
        f"[n]volume=0.08[nv];"
        f"[s][nv]amix=inputs=2:duration=shortest[m];"
        f"[m]aecho=0.8:0.7:60:0.6,aecho=0.6:0.5:40:0.4,"
        f"afade=t=in:d=0.02,afade=t=out:st={max(dur-0.1,0.02)}:d=0.1[out]"
    )
    return fc, dur


def _ambient_filter(key: str) -> tuple[str, float]:
    """Longer looping noise textures (3 seconds each)."""
    dur = 3.0
    presets = {
        "amb_forest_day":    ("pink",  "bandpass=f=800:width_type=o:w=2,tremolo=f=0.5:d=0.3"),
        "amb_forest_night":  ("brown", "bandpass=f=500:width_type=o:w=1.5,tremolo=f=0.3:d=0.4"),
        "amb_ocean_waves":   ("brown", "bandpass=f=300:width_type=o:w=2,tremolo=f=0.15:d=0.7"),
        "amb_river_stream":  ("white", "bandpass=f=2000:width_type=o:w=3,tremolo=f=2:d=0.3"),
        "amb_cave_drip":     ("white", "bandpass=f=3000:width_type=o:w=1,tremolo=f=1.5:d=0.8"),
        "amb_cave_wind":     ("brown", "bandpass=f=200:width_type=o:w=1.5,tremolo=f=0.2:d=0.5"),
        "amb_rain_light":    ("white", "bandpass=f=4000:width_type=o:w=2,tremolo=f=3:d=0.2"),
        "amb_rain_heavy":    ("white", "bandpass=f=2500:width_type=o:w=3,tremolo=f=5:d=0.3"),
        "amb_snow_wind":     ("pink",  "bandpass=f=400:width_type=o:w=2,tremolo=f=0.3:d=0.4"),
        "amb_volcano_rumble":("brown", "bandpass=f=80:width_type=o:w=1,tremolo=f=0.5:d=0.6"),
        "amb_city_crowd":    ("pink",  "bandpass=f=1200:width_type=o:w=3,tremolo=f=1:d=0.3"),
        "amb_market_bustle": ("pink",  "bandpass=f=1500:width_type=o:w=3,tremolo=f=1.5:d=0.3"),
        "amb_dungeon_eerie": ("brown", "bandpass=f=150:width_type=o:w=1,tremolo=f=0.2:d=0.6"),
        "amb_ether_hum":     ("pink",  "bandpass=f=120:width_type=o:w=0.5,tremolo=f=4:d=0.4"),
        "amb_clockwork_tick":("white", "bandpass=f=2500:width_type=o:w=1,tremolo=f=2:d=0.9"),
    }
    color, filt = presets.get(key, ("pink", "bandpass=f=800:width_type=o:w=2"))

    fc = (
        f"anoisesrc=duration={dur}:color={color}[n];"
        f"[n]{filt},"
        f"afade=t=in:d=0.1,afade=t=out:st={dur-0.2}:d=0.2[out]"
    )
    return fc, dur


def generate_sound(entry: dict, audio_root: str) -> bool:
    """Generate a single .ogg file using ffmpeg."""
    key = entry["key"]
    rel_path = entry["path"]
    category = entry["category"]

    out_path = os.path.join(audio_root, rel_path)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    # Pick the right generator
    if category == "sfx_combat":
        fc, dur = _combat_filter(key)
    elif category == "sfx_ui":
        fc, dur = _ui_filter(key)
    elif category == "sfx_system":
        fc, dur = _system_filter(key)
    elif category == "sfx_memory":
        fc, dur = _memory_filter(key)
    elif category == "ambient":
        fc, dur = _ambient_filter(key)
    else:
        # fallback: simple beep
        fc = "sine=frequency=440:duration=0.3[out]"
        dur = 0.3

    cmd = [
        "ffmpeg", "-y",
        "-filter_complex", fc,
        "-map", "[out]",
        "-c:a", "libopus",
        "-b:a", "64k",
        "-ar", "48000",
        "-t", str(dur + 0.1),  # small margin
        out_path,
    ]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=15
        )
        if result.returncode != 0:
            print(f"  FAIL {key}: {result.stderr[-200:]}", file=sys.stderr)
            return False
        return True
    except Exception as e:
        print(f"  ERROR {key}: {e}", file=sys.stderr)
        return False


def main():
    entries = parse_manifest(MANIFEST_PATH)
    print(f"Found {len(entries)} SFX/ambient entries in manifest")

    ok = 0
    fail = 0
    for i, entry in enumerate(entries, 1):
        tag = f"[{i:2d}/{len(entries)}]"
        success = generate_sound(entry, AUDIO_ROOT)
        status = "OK" if success else "FAIL"
        print(f"  {tag} {status}  {entry['key']:40s} → {entry['path']}")
        if success:
            ok += 1
        else:
            fail += 1

    print(f"\nDone: {ok} generated, {fail} failed (total {len(entries)})")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

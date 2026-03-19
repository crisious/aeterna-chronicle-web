#!/usr/bin/env python3
"""
generate_voice.py — Aeterna Chronicle voice placeholder generator
Reads voice entries from soundManifest.ts and generates distinctive
voice-like placeholder sounds using ffmpeg synthesis (no TTS API needed).
"""

import re
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = PROJECT_ROOT / "src" / "sound" / "soundManifest.ts"
PUBLIC_DIR = PROJECT_ROOT / "public" / "assets"


def parse_voice_entries(manifest_text: str) -> list[dict]:
    """Extract all voice entries from soundManifest.ts."""
    entries = []
    # Match objects with type: 'voice'
    pattern = re.compile(
        r"\{\s*key:\s*'([^']+)',\s*path:\s*'([^']+)',\s*type:\s*'voice'"
    )
    for m in pattern.finditer(manifest_text):
        entries.append({"key": m.group(1), "path": m.group(2)})
    return entries


def run_ffmpeg(args: list[str], label: str) -> bool:
    """Run ffmpeg with given args, return success."""
    cmd = ["ffmpeg", "-y"] + args
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  FAIL {label}: {result.stderr[:200]}")
        return False
    return True


def generate_npc_voice(key: str, output: Path) -> bool:
    """Generate NPC greeting — formant-based voice simulation using filter_complex."""

    profiles = {
        "voice_npc_erien_greet": {
            "fund": 260, "f1": 700, "f2": 1800,
            "dur": 1.2, "desc": "Female companion — warm, melodic greeting",
            "vibrato_hz": 5.5, "vibrato_depth": 0.3,
        },
        "voice_npc_nuariel_greet": {
            "fund": 320, "f1": 800, "f2": 2200,
            "dur": 1.4, "desc": "Elf female — ethereal high pitch",
            "vibrato_hz": 6.0, "vibrato_depth": 0.4,
        },
        "voice_npc_mateus_greet": {
            "fund": 100, "f1": 500, "f2": 1200,
            "dur": 1.6, "desc": "Elder sage — deep gravelly",
            "vibrato_hz": 4.0, "vibrato_depth": 0.2,
        },
        "voice_npc_merchant_greet": {
            "fund": 160, "f1": 600, "f2": 1500,
            "dur": 1.0, "desc": "Male merchant — friendly mid-range",
            "vibrato_hz": 5.0, "vibrato_depth": 0.25,
        },
        "voice_npc_guard_greet": {
            "fund": 140, "f1": 550, "f2": 1300,
            "dur": 0.8, "desc": "Male guard — firm, short",
            "vibrato_hz": 3.5, "vibrato_depth": 0.15,
        },
        "voice_npc_elder_greet": {
            "fund": 85, "f1": 450, "f2": 1100,
            "dur": 1.8, "desc": "Very old elder — lowest, gravelly",
            "vibrato_hz": 3.0, "vibrato_depth": 0.35,
        },
        "voice_npc_blacksmith_greet": {
            "fund": 130, "f1": 520, "f2": 1250,
            "dur": 0.9, "desc": "Male blacksmith — rough, strong",
            "vibrato_hz": 4.5, "vibrato_depth": 0.2,
        },
        "voice_npc_innkeeper_greet": {
            "fund": 240, "f1": 680, "f2": 1700,
            "dur": 1.1, "desc": "Female innkeeper — warm mid-high",
            "vibrato_hz": 5.0, "vibrato_depth": 0.3,
        },
        "voice_npc_quest_giver_greet": {
            "fund": 170, "f1": 620, "f2": 1550,
            "dur": 1.3, "desc": "Male quest giver — authoritative",
            "vibrato_hz": 4.5, "vibrato_depth": 0.2,
        },
        "voice_npc_mysterious_greet": {
            "fund": 0, "f1": 0, "f2": 0,
            "dur": 2.0, "desc": "Mysterious — whisper-like filtered noise",
            "vibrato_hz": 0, "vibrato_depth": 0,
        },
    }

    p = profiles.get(key)
    if not p:
        print(f"  WARN: No profile for {key}")
        return False

    dur = p["dur"]

    if key == "voice_npc_mysterious_greet":
        filter_complex = (
            f"anoisesrc=d={dur}:c=pink:r=48000:a=0.15,"
            f"bandpass=f=1800:width_type=o:w=1.5,"
            f"tremolo=f=2.5:d=0.6,"
            f"highpass=f=800,"
            f"afade=t=in:d=0.3,afade=t=out:st={dur - 0.5}:d=0.5"
        )
        args = [
            "-f", "lavfi", "-i", filter_complex,
            "-c:a", "libopus", "-b:a", "48k",
            "-ar", "48000", "-ac", "1",
            str(output),
        ]
        return run_ffmpeg(args, key)

    fund = p["fund"]
    f1 = p["f1"]
    f2 = p["f2"]
    vib_hz = p["vibrato_hz"]
    vib_d = p["vibrato_depth"]
    h2 = fund * 2
    h3 = fund * 3

    # Use -filter_complex with separate sine/noise sources, then mix
    # Greeting intonation: slight pitch rise via sine frequency modulation
    # aevalsrc keeps expressions simple (one sine each)
    fc = (
        # Fundamental tone
        f"sine=f={fund}:d={dur}:r=48000[f0];"
        # 2nd harmonic
        f"sine=f={h2}:d={dur}:r=48000[f1];"
        # 3rd harmonic
        f"sine=f={h3}:d={dur}:r=48000[f2];"
        # Mix harmonics: fundamental loudest, harmonics quieter
        f"[f0][f1][f2]amix=inputs=3:weights=4 2 1:normalize=0[harmonics];"
        # Formant shaping: bandpass around f1
        f"[harmonics]bandpass=f={f1}:width_type=o:w=2.5,"
        f"equalizer=f={f2}:width_type=o:w=1.5:g=6[shaped];"
        # Breathiness: pink noise band-passed around f2
        f"anoisesrc=d={dur}:c=pink:r=48000:a=0.05,"
        f"bandpass=f={f2}:width_type=o:w=1.5[breath];"
        # Mix voice + breath
        f"[shaped][breath]amix=inputs=2:weights=1 0.3:normalize=0,"
        # Vibrato for natural feel
        f"vibrato=f={vib_hz}:d={vib_d},"
        # Tremolo for greeting rhythm
        f"tremolo=f=3:d=0.15,"
        # Envelope: fade in/out
        f"afade=t=in:d=0.05,afade=t=out:st={dur - 0.3}:d=0.3,"
        # Presence EQ
        f"equalizer=f=3000:width_type=o:w=1:g=3,"
        # Normalize volume
        f"volume=0.5"
    )

    args = [
        "-filter_complex", fc,
        "-c:a", "libopus", "-b:a", "48k",
        "-ar", "48000", "-ac", "1",
        str(output),
    ]
    return run_ffmpeg(args, key)


def generate_combat_voice(key: str, output: Path) -> bool:
    """Generate combat voice — short exclamation-style sounds."""

    profiles = {
        "voice_combat_attack_1": {
            "desc": "Sharp rising attack shout",
            "fund": 180, "end_fund": 300, "dur": 0.5,
            "noise_amt": 0.06, "style": "rising",
        },
        "voice_combat_attack_2": {
            "desc": "Forceful attack exclamation",
            "fund": 200, "end_fund": 350, "dur": 0.6,
            "noise_amt": 0.08, "style": "rising",
        },
        "voice_combat_skill_cast": {
            "desc": "Ascending magical incantation",
            "fund": 220, "end_fund": 440, "dur": 1.0,
            "noise_amt": 0.03, "style": "ascending",
        },
        "voice_combat_ultimate": {
            "desc": "Dramatic powerful shout",
            "fund": 150, "end_fund": 500, "dur": 1.5,
            "noise_amt": 0.07, "style": "dramatic",
        },
        "voice_combat_hit_1": {
            "desc": "Short pain grunt",
            "fund": 160, "end_fund": 120, "dur": 0.4,
            "noise_amt": 0.1, "style": "grunt",
        },
        "voice_combat_hit_2": {
            "desc": "Impact grunt variant",
            "fund": 180, "end_fund": 100, "dur": 0.35,
            "noise_amt": 0.12, "style": "grunt",
        },
        "voice_combat_critical": {
            "desc": "Dramatic critical hit exclamation",
            "fund": 200, "end_fund": 450, "dur": 0.8,
            "noise_amt": 0.09, "style": "dramatic",
        },
        "voice_combat_dodge": {
            "desc": "Quick evasion breath",
            "fund": 250, "end_fund": 350, "dur": 0.3,
            "noise_amt": 0.15, "style": "swift",
        },
        "voice_combat_death": {
            "desc": "Descending death cry fade",
            "fund": 200, "end_fund": 60, "dur": 1.5,
            "noise_amt": 0.08, "style": "descending",
        },
        "voice_combat_victory": {
            "desc": "Triumphant ascending shout",
            "fund": 180, "end_fund": 500, "dur": 1.2,
            "noise_amt": 0.05, "style": "triumphant",
        },
    }

    p = profiles.get(key)
    if not p:
        print(f"  WARN: No profile for {key}")
        return False

    dur = p["dur"]
    f0 = p["fund"]
    f1 = p["end_fund"]
    noise = p["noise_amt"]
    style = p["style"]

    if style == "rising":
        # Quick rising tone with harmonics — attack shout
        filter_complex = (
            f"aevalsrc='"
            f"0.4*sin(2*PI*({f0}+({f1}-{f0})*t/{dur})*t)"
            f"+0.2*sin(2*PI*2*({f0}+({f1}-{f0})*t/{dur})*t)"
            f"+0.1*sin(2*PI*3*({f0}+({f1}-{f0})*t/{dur})*t)"
            f"':d={dur}:s=48000,"
            f"vibrato=f=8:d=0.3,"
            f"amix=inputs=1[v];"
            f"anoisesrc=d={dur}:c=pink:r=48000:a={noise},"
            f"bandpass=f=2000:width_type=o:w=2[n];"
            f"[v][n]amix=inputs=2:weights=1 0.5,"
            f"afade=t=in:d=0.02,afade=t=out:st={dur - 0.1}:d=0.1,"
            f"equalizer=f=2500:width_type=o:w=1:g=4"
        )
    elif style == "grunt":
        # Short, punchy, descending — pain grunt
        filter_complex = (
            f"aevalsrc='"
            f"0.5*sin(2*PI*({f0}+({f1}-{f0})*(t/{dur})*(t/{dur}))*t)"
            f"+0.25*sin(2*PI*2*({f0}+({f1}-{f0})*(t/{dur}))*t)"
            f"':d={dur}:s=48000,"
            f"tremolo=f=15:d=0.5,"
            f"amix=inputs=1[v];"
            f"anoisesrc=d={dur}:c=pink:r=48000:a={noise},"
            f"bandpass=f=800:width_type=o:w=1.5[n];"
            f"[v][n]amix=inputs=2:weights=1 0.6,"
            f"afade=t=in:d=0.01,afade=t=out:st={dur - 0.08}:d=0.08,"
            f"lowpass=f=2000"
        )
    elif style == "ascending":
        # Smooth ascending — spell casting
        filter_complex = (
            f"aevalsrc='"
            f"0.35*sin(2*PI*({f0}+({f1}-{f0})*(t/{dur}))*t)"
            f"+0.15*sin(2*PI*1.5*({f0}+({f1}-{f0})*(t/{dur}))*t)"
            f"+0.1*sin(2*PI*3*({f0}+({f1}-{f0})*(t/{dur}))*t)"
            f"':d={dur}:s=48000,"
            f"vibrato=f=6:d=0.4,"
            f"amix=inputs=1[v];"
            f"anoisesrc=d={dur}:c=white:r=48000:a={noise},"
            f"bandpass=f=3000:width_type=o:w=1[n];"
            f"[v][n]amix=inputs=2:weights=1 0.3,"
            f"afade=t=in:d=0.1,afade=t=out:st={dur - 0.2}:d=0.2,"
            f"equalizer=f=4000:width_type=o:w=1:g=3"
        )
    elif style == "dramatic":
        # Big dynamic range — critical/ultimate
        filter_complex = (
            f"aevalsrc='"
            f"(0.3+0.2*sin(PI*t/{dur}))*("
            f"sin(2*PI*({f0}+({f1}-{f0})*pow(t/{dur},0.5))*t)"
            f"+0.3*sin(2*PI*2*({f0}+({f1}-{f0})*pow(t/{dur},0.5))*t)"
            f"+0.15*sin(2*PI*3*({f0}+({f1}-{f0})*pow(t/{dur},0.5))*t)"
            f")':d={dur}:s=48000,"
            f"vibrato=f=7:d=0.35,"
            f"amix=inputs=1[v];"
            f"anoisesrc=d={dur}:c=pink:r=48000:a={noise},"
            f"bandpass=f=2500:width_type=o:w=2[n];"
            f"[v][n]amix=inputs=2:weights=1 0.4,"
            f"afade=t=in:d=0.03,afade=t=out:st={dur - 0.3}:d=0.3,"
            f"equalizer=f=3000:width_type=o:w=1.5:g=5"
        )
    elif style == "swift":
        # Very short breathy swoosh
        filter_complex = (
            f"aevalsrc='"
            f"0.3*sin(2*PI*({f0}+({f1}-{f0})*t/{dur})*t)"
            f"':d={dur}:s=48000,"
            f"amix=inputs=1[v];"
            f"anoisesrc=d={dur}:c=pink:r=48000:a={noise},"
            f"bandpass=f=3000:width_type=o:w=2[n];"
            f"[v][n]amix=inputs=2:weights=1 0.8,"
            f"afade=t=in:d=0.01,afade=t=out:st={dur - 0.05}:d=0.05,"
            f"highpass=f=500"
        )
    elif style == "descending":
        # Long descending fade — death cry
        filter_complex = (
            f"aevalsrc='"
            f"(0.5*exp(-1.5*t/{dur}))*("
            f"sin(2*PI*({f0}+({f1}-{f0})*pow(t/{dur},1.5))*t)"
            f"+0.3*sin(2*PI*2*({f0}+({f1}-{f0})*pow(t/{dur},1.5))*t)"
            f")':d={dur}:s=48000,"
            f"vibrato=f=4:d=0.5,"
            f"amix=inputs=1[v];"
            f"anoisesrc=d={dur}:c=pink:r=48000:a={noise},"
            f"bandpass=f=1000:width_type=o:w=1.5[n];"
            f"[v][n]amix=inputs=2:weights=1 0.5,"
            f"afade=t=in:d=0.02,afade=t=out:st={dur - 0.6}:d=0.6,"
            f"lowpass=f=2500"
        )
    elif style == "triumphant":
        # Multi-stage ascending — victory
        # Two-phase: hold then rise
        mid = dur * 0.4
        filter_complex = (
            f"aevalsrc='"
            f"0.45*sin(2*PI*({f0}+({f1}-{f0})*pow(t/{dur},0.7))*t)"
            f"+0.2*sin(2*PI*2*({f0}+({f1}-{f0})*pow(t/{dur},0.7))*t)"
            f"+0.15*sin(2*PI*3*({f0}+({f1}-{f0})*pow(t/{dur},0.7))*t)"
            f"+0.08*sin(2*PI*4*({f0}+({f1}-{f0})*pow(t/{dur},0.7))*t)"
            f"':d={dur}:s=48000,"
            f"vibrato=f=6:d=0.3,"
            f"amix=inputs=1[v];"
            f"anoisesrc=d={dur}:c=pink:r=48000:a={noise},"
            f"bandpass=f=3500:width_type=o:w=1.5[n];"
            f"[v][n]amix=inputs=2:weights=1 0.3,"
            f"afade=t=in:d=0.05,afade=t=out:st={dur - 0.2}:d=0.2,"
            f"equalizer=f=3000:width_type=o:w=1:g=4,"
            f"equalizer=f=5000:width_type=o:w=1:g=2"
        )
    else:
        return False

    args = [
        "-f", "lavfi", "-i", filter_complex,
        "-c:a", "libopus", "-b:a", "48k",
        "-ar", "48000", "-ac", "1",
        str(output),
    ]
    return run_ffmpeg(args, key)


def main():
    print("=== Aeterna Chronicle Voice Placeholder Generator ===\n")

    # 1. Read manifest
    if not MANIFEST_PATH.exists():
        print(f"ERROR: Manifest not found at {MANIFEST_PATH}")
        sys.exit(1)

    manifest_text = MANIFEST_PATH.read_text(encoding="utf-8")
    entries = parse_voice_entries(manifest_text)
    print(f"Found {len(entries)} voice entries in soundManifest.ts\n")

    if len(entries) != 20:
        print(f"WARNING: Expected 20 voice entries, found {len(entries)}")

    # 2. Generate each voice file
    success = 0
    fail = 0

    for entry in entries:
        key = entry["key"]
        rel_path = entry["path"]
        output = PUBLIC_DIR / rel_path
        output.parent.mkdir(parents=True, exist_ok=True)

        is_npc = key.startswith("voice_npc_")
        is_combat = key.startswith("voice_combat_")

        if is_npc:
            ok = generate_npc_voice(key, output)
        elif is_combat:
            ok = generate_combat_voice(key, output)
        else:
            print(f"  SKIP: Unknown voice type for {key}")
            fail += 1
            continue

        if ok:
            size = output.stat().st_size
            print(f"  OK   {key:40s} -> {rel_path} ({size:,} bytes)")
            success += 1
        else:
            fail += 1

    # 3. Summary
    print(f"\n{'=' * 60}")
    print(f"Results: {success} success, {fail} fail, {len(entries)} total")
    if fail == 0:
        print("All voice placeholders generated successfully!")
    else:
        print("Some files failed — check errors above.")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

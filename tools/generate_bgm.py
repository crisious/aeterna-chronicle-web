#!/usr/bin/env python3
"""
에테르나 크로니클 — BGM 생성 파이프라인
AudioCraft MusicGen → WAV → OGG 자동화

Usage:
    python3 generate_bgm.py [--tracks all|BGM-ERB-01,BGM-SYL-01] [--duration 30] [--device cpu|mps]
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

# ─── 프로젝트 경로 ──────────────────────────────────────────────
PROJ_ROOT = Path(__file__).resolve().parent.parent
BGM_OUTPUT_DIR = PROJ_ROOT / "assets" / "generated" / "audio" / "bgm"
RAW_DIR = BGM_OUTPUT_DIR / "raw_wav"

# ─── BGM 트랙 정의 (프롬프트 + 메타데이터) ──────────────────────
BGM_TRACKS = [
    # === 지역 탐색 BGM (12곡) ===
    {
        "id": "BGM-ERB-01",
        "name": "streets_of_oblivion",
        "title": "망각의 거리",
        "prompt": "Dark fantasy exploration BGM for a ruined ghost city, 72 BPM, D minor, sparse music box motif with distant cello and low drone, cold foggy atmosphere, subtle memory-echo shimmer, minimal percussion, seamless loop for field exploration, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-SYL-01",
        "name": "forest_of_growing_memory",
        "title": "기억이 자라는 숲",
        "prompt": "Daytime enchanted forest exploration track, 84 BPM, G minor, wooden flute lead with soft harp arpeggio and warm strings, mystical but calm, organic ambience, gentle pulse for long traversal, seamless loop, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-SYL-02",
        "name": "night_of_bioluminescence",
        "title": "발광균의 밤",
        "prompt": "Night forest ambient exploration BGM, 76 BPM, E minor, glassy bells and airy synth pad with light ethnic percussion, bioluminescent magical feeling, dreamy and slightly melancholic tone, loop-friendly, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-SOL-01",
        "name": "land_of_flames",
        "title": "불꽃의 땅",
        "prompt": "Desert daytime exploration track, 96 BPM, A minor, oud-like plucked motif with frame drum groove and warm brass accents, heat haze atmosphere, adventurous and tense, suitable for long walking loop, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-SOL-02",
        "name": "ether_crystal_desert_night",
        "title": "에테르 결정 사막의 밤",
        "prompt": "Desert night exploration BGM with glowing crystals, 82 BPM, C minor, shimmering mallet synth, soft choir pad and low pulse bass, mysterious cosmic beauty, wide stereo ambience, seamless looping, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-BOR-01",
        "name": "land_where_time_stopped",
        "title": "시간이 멈춘 땅",
        "prompt": "Frozen north exploration BGM, 70 BPM, D minor, slow bowed strings with icy bell textures and deep wind drone, time-slowing sensation, solemn and spacious mix, minimal rhythm, seamless loop, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-BOR-02",
        "name": "memories_in_the_ice",
        "title": "빙정 속의 기억",
        "prompt": "Aurora event exploration music, 78 BPM, F# minor, crystalline plucks, soft female-like choir pad wordless, distant horn swells, memory-reversal wonder and sadness, long evolving loop, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-ARG-01",
        "name": "golden_spire",
        "title": "황금 첨탑",
        "prompt": "Imperial capital upper district exploration, 92 BPM, E minor, elegant chamber strings with clockwork percussion and subtle brass, steampunk aristocratic mood, polished and controlled tension, loop-friendly, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-ARG-02",
        "name": "shadows_below_the_spire",
        "title": "탑 아래의 그림자",
        "prompt": "Lower district and slum exploration BGM, 88 BPM, C minor, muted piano motif with gritty percussion and low synth drone, noir stealth feeling, urban despair under imperial light, seamless loop, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-BRT-01",
        "name": "morning_fog_free_harbor",
        "title": "자유항의 아침 안개",
        "prompt": "Harbor exploration morning theme, 86 BPM, G minor, accordion and light fiddle over brushed percussion, misty sea breeze ambience, bustling yet suspicious free-port mood, loopable field track, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-BRT-02",
        "name": "night_at_rusty_compass",
        "title": "녹슨 나침반의 밤",
        "prompt": "Tavern and information-gathering BGM, 90 BPM, D minor, upright bass groove, muted trumpet, smoky jazz-dungeon hybrid texture, warm but dangerous undertone, conversation-friendly mix, loop-friendly, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-PLT-01",
        "name": "plateau_of_oblivion",
        "title": "망각의 고원",
        "prompt": "Final chapter pre-boss exploration music, 74 BPM, C minor, ritualistic low drum pulse, dissonant strings and distant choir haze, impending apocalypse atmosphere, heavy reverb space, seamless loop, no vocals",
        "duration": 30,
    },
    # === 보스 BGM (7곡) ===
    {
        "id": "BGM-ERB-03",
        "name": "memory_golem",
        "title": "기억의 골렘",
        "prompt": "Chapter 1 boss music, 128 BPM, C# minor, heavy low strings, metallic impacts, ancient stone golem rhythm motif, dramatic brass swells with restrained choir, phase-ready structure with clear loop point, no vocals",
        "duration": 45,
    },
    {
        "id": "BGM-SYL-03",
        "name": "malatus_thousand_years",
        "title": "말라투스 — 천년의 기억",
        "prompt": "Chapter 2 boss theme, 122 BPM, F minor, primal drum ostinato, deep choir textures, distorted wood resonance and string tremolo, ancient tree guardian identity, escalating mid-boss intensity, clean loop end, no vocals",
        "duration": 45,
    },
    {
        "id": "BGM-SOL-03",
        "name": "lawar_3000_years",
        "title": "라와르 — 3천 년의 배회",
        "prompt": "Chapter 3 boss theme, 130 BPM, B minor, regal but broken orchestral motif, aggressive percussion, lamenting solo cello phrases, fallen king tragedy energy, high-intensity combat loop with distinct cadence, no vocals",
        "duration": 45,
    },
    {
        "id": "BGM-ARG-03",
        "name": "kain_grief_turned_to_ice",
        "title": "케인 — 굳어버린 슬픔",
        "prompt": "Chapter 4 boss track, 132 BPM, C# minor, hard-hitting hybrid drums, sharp string ostinato, tragic villain leitmotif on solo violin, relentless pursuit energy, boss loop with dramatic break section, no vocals",
        "duration": 45,
    },
    {
        "id": "BGM-PLT-02",
        "name": "lethe_god_of_oblivion",
        "title": "레테 — 망각의 신",
        "prompt": "Final boss phase 1-2 theme, 138 BPM, C minor, massive hybrid orchestra with dark choir and sub impacts, cosmic dread and divine scale, aggressive rhythm with clear phase transition markers, boss loop, no vocals",
        "duration": 60,
    },
    {
        "id": "BGM-PLT-03",
        "name": "i_wanted_to_be_remembered",
        "title": "기억되고 싶었어",
        "prompt": "Final boss phase 3 emotional climax, 96 BPM, A minor to C major lift, solo piano and cello opening into full bittersweet orchestral swell, redemption and sorrow blend, cinematic ending-combat cue with loop-capable tail, no vocals",
        "duration": 60,
    },
    # === 전투/시스템 BGM (추가 6곡) ===
    {
        "id": "BGM-BTL-01",
        "name": "battle_generic",
        "title": "일반 전투",
        "prompt": "Generic RPG battle music, 120 BPM, D minor, driving percussion with staccato strings, brass accents, energetic but not overwhelming, suitable for repeated encounters, clean loop, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-BTL-02",
        "name": "boss_generic",
        "title": "범용 보스 전투",
        "prompt": "Epic boss battle theme, 134 BPM, E minor, heavy orchestral hits with choir, aggressive drums, tension building brass fanfare, dark fantasy intensity, loopable boss combat track, no vocals",
        "duration": 45,
    },
    {
        "id": "BGM-PVP-01",
        "name": "pvp_arena",
        "title": "PvP 아레나",
        "prompt": "Competitive PvP arena music, 140 BPM, A minor, electronic hybrid with orchestral elements, intense rhythmic drive, adrenaline pumping combat energy, clean loop for arena battles, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-SYS-01",
        "name": "main_theme",
        "title": "메인 테마",
        "prompt": "Dark fantasy RPG main theme, 88 BPM, D minor, grand orchestral opening with solo piano motif, building to full ensemble with choir, heroic yet melancholic, memory and oblivion duality, cinematic game theme, no vocals",
        "duration": 60,
    },
    {
        "id": "BGM-SYS-02",
        "name": "title_screen",
        "title": "타이틀 스크린",
        "prompt": "Title screen ambient music, 72 BPM, A minor, ethereal pad with gentle piano arpeggios and distant strings, mysterious and inviting atmosphere, elegant simplicity, seamless loop, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-ERB-02",
        "name": "memory_phantom_assault",
        "title": "기억 유령의 습격",
        "prompt": "Combat cue in a forgotten city, 118 BPM, D minor, urgent staccato strings and taiko-lite hits, spectral choir pad in background, rising tension but medium intensity for repeat battles, loopable 90s structure, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-SYS-03",
        "name": "village_peace",
        "title": "마을 평화",
        "prompt": "Peaceful village BGM, 80 BPM, G major, warm acoustic guitar with light flute melody, gentle pizzicato strings, cozy and safe atmosphere, suitable for rest areas, seamless loop, no vocals",
        "duration": 30,
    },
    {
        "id": "BGM-SYS-04",
        "name": "guild_hall",
        "title": "길드 홀",
        "prompt": "Guild hall interior music, 84 BPM, C major, warm chamber ensemble with prominent cello, light harpsichord accents, dignified community gathering mood, subtle clockwork undertone, seamless loop, no vocals",
        "duration": 30,
    },
]


def generate_bgm(tracks_to_gen, device="cpu", model_size="small"):
    """AudioCraft MusicGen으로 BGM 생성"""
    from audiocraft.models import MusicGen
    import torch
    import torchaudio

    BGM_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Loading MusicGen-{model_size} on {device}...")
    model = MusicGen.get_pretrained(f"facebook/musicgen-{model_size}", device=device)

    results = []
    for i, track in enumerate(tracks_to_gen):
        track_id = track["id"]
        filename = track["name"]
        duration = track["duration"]
        prompt = track["prompt"]

        raw_path = RAW_DIR / f"{filename}.wav"
        ogg_path = BGM_OUTPUT_DIR / f"{filename}.ogg"

        if ogg_path.exists():
            print(f"[{i+1}/{len(tracks_to_gen)}] SKIP {track_id} — already exists")
            results.append({"id": track_id, "status": "skip", "path": str(ogg_path)})
            continue

        print(f"[{i+1}/{len(tracks_to_gen)}] Generating {track_id}: {track['title']} ({duration}s)...")
        t0 = time.time()

        model.set_generation_params(duration=duration)
        wav = model.generate([prompt], progress=True)

        # Save raw WAV — use temp path to avoid Korean char issues with soundfile/ffmpeg
        import tempfile, shutil
        import soundfile as sf
        audio_np = wav[0].cpu().numpy()
        if audio_np.ndim == 2:
            audio_np = audio_np.T
        tmp_wav = os.path.join(tempfile.gettempdir(), f"{filename}.wav")
        sf.write(tmp_wav, audio_np, model.sample_rate)
        shutil.copy2(tmp_wav, str(raw_path))
        elapsed = time.time() - t0
        print(f"  Raw WAV saved ({elapsed:.1f}s generation time)")

        # Convert to OGG Opus via temp paths (avoid Korean char issues)
        try:
            tmp_ogg = os.path.join(tempfile.gettempdir(), f"{filename}.ogg")
            subprocess.run([
                "ffmpeg", "-y", "-i", tmp_wav,
                "-ar", "48000",
                "-ac", "2",
                "-c:a", "libopus",
                "-b:a", "128k",
                tmp_ogg
            ], check=True, capture_output=True)
            shutil.copy2(tmp_ogg, str(ogg_path))
            try:
                os.remove(tmp_ogg)
                os.remove(tmp_wav)
            except OSError:
                pass
            size_kb = ogg_path.stat().st_size / 1024
            print(f"  OGG saved: {ogg_path.name} ({size_kb:.0f} KB)")
            results.append({"id": track_id, "status": "ok", "path": str(ogg_path), "size_kb": size_kb})
        except subprocess.CalledProcessError as e:
            print(f"  FFmpeg error: {e.stderr.decode()[:200]}")
            results.append({"id": track_id, "status": "ffmpeg_error"})

    return results


def main():
    parser = argparse.ArgumentParser(description="에테르나 크로니클 BGM 생성")
    parser.add_argument("--tracks", default="all", help="all 또는 쉼표 구분 ID (BGM-ERB-01,BGM-SYL-01)")
    parser.add_argument("--duration", type=int, default=None, help="Duration override (seconds)")
    parser.add_argument("--device", default="cpu", choices=["cpu", "mps"], help="Device")
    parser.add_argument("--model", default="small", choices=["small", "medium", "large"], help="Model size")
    args = parser.parse_args()

    if args.tracks == "all":
        tracks = BGM_TRACKS
    else:
        ids = set(args.tracks.split(","))
        tracks = [t for t in BGM_TRACKS if t["id"] in ids]
        if not tracks:
            print(f"No matching tracks for: {args.tracks}")
            sys.exit(1)

    if args.duration:
        for t in tracks:
            t["duration"] = args.duration

    print(f"=== BGM Generation Pipeline ===")
    print(f"Tracks: {len(tracks)}, Device: {args.device}, Model: musicgen-{args.model}")
    print()

    results = generate_bgm(tracks, device=args.device, model_size=args.model)

    # Summary
    ok = sum(1 for r in results if r["status"] == "ok")
    skip = sum(1 for r in results if r["status"] == "skip")
    fail = sum(1 for r in results if r["status"] not in ("ok", "skip"))
    print(f"\n=== 완료: {ok} 생성, {skip} 스킵, {fail} 실패 ===")

    # Save results log
    log_path = BGM_OUTPUT_DIR / "generation_log.json"
    with open(log_path, "w") as f:
        json.dump({"timestamp": time.strftime("%Y-%m-%d %H:%M:%S"), "results": results}, f, indent=2, ensure_ascii=False)
    print(f"Log: {log_path}")


if __name__ == "__main__":
    main()

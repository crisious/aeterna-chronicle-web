#!/usr/bin/env python3
"""
Generate remaining BGM tracks (30s cap for M4 16GB).
Skips already-generated .ogg files in subfolders.
"""

import os
import sys
import json
import time
import logging
import subprocess
import shutil

sys.path.insert(0, os.path.dirname(__file__))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'generation_remaining.log'))
    ]
)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
PROMPTS_DIR = os.path.join(BASE_DIR, 'assets', 'prompts', 'audio', 'bgm')
# Use local temp dir to avoid Synology Drive sync deletions
OUTPUT_DIR = '/tmp/etherna_bgm'
AUDIO_DIR = os.path.join(BASE_DIR, 'audio', 'bgm')

MAX_DURATION = 30  # Cap for M4 16GB


def wav_to_ogg(wav_path, ogg_path):
    """Convert WAV to OGG Opus via ffmpeg"""
    cmd = [
        'ffmpeg', '-y', '-i', wav_path,
        '-c:a', 'libopus', '-b:a', '128k',
        '-ar', '48000',
        ogg_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        logger.error(f"ffmpeg wav_to_ogg stderr: {result.stderr[-200:]}")
    return result.returncode == 0


def add_loop_fade(ogg_path, fade_sec=2):
    """Add fade-in/fade-out for seamless looping"""
    tmp = ogg_path + '.tmp.ogg'
    cmd = [
        'ffmpeg', '-y', '-i', ogg_path,
        '-af', f'afade=t=in:st=0:d={fade_sec},afade=t=out:st={MAX_DURATION - fade_sec}:d={fade_sec}',
        '-c:a', 'libopus', '-b:a', '128k',
        tmp
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode == 0:
        os.replace(tmp, ogg_path)
        return True
    else:
        if os.path.exists(tmp):
            os.remove(tmp)
        return False


def main():
    # Lazy-load model
    logger.info("Loading MusicGen model...")
    from audiocraft.models import MusicGen
    model = MusicGen.get_pretrained('facebook/musicgen-small')
    model.set_generation_params(duration=MAX_DURATION, temperature=1.0, top_k=250)
    logger.info("Model loaded.")

    # Load all prompt files
    categories = ['exploration', 'combat', 'system', 'ending', 'dungeon', 'event']
    all_tracks = []

    for cat in categories:
        json_path = os.path.join(PROMPTS_DIR, f'{cat}.json')
        if os.path.exists(json_path):
            with open(json_path) as f:
                tracks = json.load(f)
                all_tracks.extend(tracks)
                logger.info(f"Loaded {len(tracks)} tracks from {cat}.json")

    logger.info(f"Total tracks in prompts: {len(all_tracks)}")

    results = {'total': 0, 'success': 0, 'failed': 0, 'skipped': 0, 'tracks': []}
    start_time = time.time()

    for i, track in enumerate(all_tracks, 1):
        track_id = track['id']
        prompt = track['prompt']
        subfolder = track.get('subfolder', '')
        filename = track.get('filename', track_id.lower().replace('-', '_'))

        gen_dir = os.path.join(OUTPUT_DIR, subfolder) if subfolder else OUTPUT_DIR
        os.makedirs(gen_dir, exist_ok=True)

        ogg_path = os.path.join(gen_dir, f"{filename}.ogg")
        wav_path = os.path.join(gen_dir, f"{filename}.wav")

        results['total'] += 1

        # Skip existing
        if os.path.exists(ogg_path):
            logger.info(f"[{i}/{len(all_tracks)}] SKIP {track_id}: {ogg_path}")
            results['skipped'] += 1
            results['tracks'].append({'id': track_id, 'status': 'skipped'})
            continue

        elapsed = time.time() - start_time
        generated = results['success'] + results['failed']
        avg = elapsed / generated if generated > 0 else 90
        remaining_count = len(all_tracks) - i
        eta = avg * remaining_count

        logger.info(f"\n[{i}/{len(all_tracks)}] GEN {track_id}: {track.get('title','')} | ETA: {eta/60:.1f}min")

        try:
            # Generate 30s clip
            model.set_generation_params(duration=MAX_DURATION)
            wav_tensor = model.generate([prompt])
            audio = wav_tensor[0].cpu().numpy().squeeze()

            import soundfile as sf
            sf.write(wav_path, audio, 32000)

            # Convert to OGG
            if wav_to_ogg(wav_path, ogg_path):
                # Add loop fades
                add_loop_fade(ogg_path)

                # Clean up WAV
                os.remove(wav_path)

                size = os.path.getsize(ogg_path)
                results['success'] += 1
                results['tracks'].append({'id': track_id, 'status': 'success', 'size': size})
                logger.info(f"  ✓ {track_id} → {ogg_path} ({size:,} bytes)")
            else:
                results['failed'] += 1
                results['tracks'].append({'id': track_id, 'status': 'failed', 'error': 'ogg_conversion'})
                logger.error(f"  ✗ {track_id}: OGG conversion failed")
        except Exception as e:
            results['failed'] += 1
            results['tracks'].append({'id': track_id, 'status': 'failed', 'error': str(e)})
            logger.error(f"  ✗ {track_id}: {e}")

        # Clean up WAV if still exists
        if os.path.exists(wav_path):
            os.remove(wav_path)

    total_time = time.time() - start_time
    logger.info(f"\n{'='*60}")
    logger.info(f"Done: {results['success']}/{results['total']} success, "
                f"{results['failed']} failed, {results['skipped']} skipped")
    logger.info(f"Time: {total_time:.0f}s ({total_time/60:.1f}min)")

    # Save results
    results_path = os.path.join(OUTPUT_DIR, 'generation_remaining_results.json')
    results['total_time_sec'] = round(total_time)
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    return results


if __name__ == '__main__':
    results = main()
    sys.exit(0 if results['failed'] == 0 else 1)

#!/usr/bin/env python3
"""
Generate remaining BGM tracks with 30-second duration cap for M4 16GB.
Skips already-generated tracks. Outputs to category subfolders.
"""

import os
import sys
import json
import time
import logging
import subprocess

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
OUTPUT_DIR = os.path.join(BASE_DIR, 'assets', 'generated', 'audio', 'bgm')

MAX_DURATION = 30  # M4 16GB safe limit


def wav_to_ogg(wav_path, ogg_path):
    """Convert WAV to OGG Opus via ffmpeg"""
    cmd = [
        'ffmpeg', '-y', '-i', wav_path,
        '-c:a', 'libopus', '-b:a', '128k',
        '-ar', '48000',
        ogg_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        logger.error(f"ffmpeg error: {result.stderr[-200:]}")
    return result.returncode == 0


def add_loop_fade(ogg_path):
    """Add fade-in/fade-out for seamless looping"""
    tmp = ogg_path + '.tmp.ogg'
    cmd = [
        'ffmpeg', '-y', '-i', ogg_path,
        '-af', 'afade=t=in:st=0:d=1,afade=t=out:st=28:d=2',
        '-c:a', 'libopus', '-b:a', '128k',
        tmp
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode == 0:
        os.replace(tmp, ogg_path)
        return True
    if os.path.exists(tmp):
        os.remove(tmp)
    return False


def main():
    # Lazy load model
    logger.info("Loading MusicGen model...")
    from audiocraft.models import MusicGen
    model = MusicGen.get_pretrained('facebook/musicgen-small')
    model.set_generation_params(duration=MAX_DURATION)
    logger.info("Model loaded.")

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

    results = {'success': 0, 'skipped': 0, 'failed': 0, 'tracks': []}
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

        if os.path.exists(ogg_path):
            logger.info(f"[{i}/{len(all_tracks)}] SKIP {track_id} (exists)")
            results['skipped'] += 1
            results['tracks'].append({'id': track_id, 'status': 'skipped'})
            continue

        elapsed = time.time() - start_time
        generated = results['success'] + results['failed']
        avg = elapsed / generated if generated > 0 else 180
        remaining = len(all_tracks) - i
        eta_min = (avg * remaining) / 60

        logger.info(f"[{i}/{len(all_tracks)}] Generating {track_id}: {track.get('title','')} | 30s | ETA: {eta_min:.1f}min")

        try:
            model.set_generation_params(duration=MAX_DURATION)
            wav = model.generate([prompt])
            audio = wav[0].cpu().numpy().squeeze()

            import soundfile as sf
            os.makedirs(os.path.dirname(wav_path) or '.', exist_ok=True)
            sf.write(wav_path, audio, 32000)

            if wav_to_ogg(wav_path, ogg_path):
                add_loop_fade(ogg_path)
                os.remove(wav_path)
                size = os.path.getsize(ogg_path)
                results['success'] += 1
                results['tracks'].append({'id': track_id, 'status': 'success', 'size': size})
                logger.info(f"  ✓ {track_id} → {ogg_path} ({size} bytes)")
            else:
                results['failed'] += 1
                results['tracks'].append({'id': track_id, 'status': 'failed', 'error': 'ogg_convert'})
                logger.error(f"  ✗ {track_id}: OGG conversion failed")

            # Clean up WAV
            if os.path.exists(wav_path):
                os.remove(wav_path)

        except Exception as e:
            results['failed'] += 1
            results['tracks'].append({'id': track_id, 'status': 'failed', 'error': str(e)})
            logger.error(f"  ✗ {track_id}: {e}")

    total_time = time.time() - start_time
    logger.info(f"\n{'='*60}")
    logger.info(f"DONE: {results['success']} success, {results['skipped']} skipped, {results['failed']} failed")
    logger.info(f"Total time: {total_time:.0f}s ({total_time/60:.1f}min)")

    results_path = os.path.join(OUTPUT_DIR, 'generation_results_remaining.json')
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    return results


if __name__ == '__main__':
    results = main()
    sys.exit(0 if results['failed'] == 0 else 1)

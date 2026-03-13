#!/usr/bin/env python3
"""
Generate all BGM tracks from prompt JSONs.
Runs all categories sequentially.
"""

import os
import sys
import json
import time
import logging

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from musicgen_engine import MusicGenEngine

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'generation.log'))
    ]
)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
PROMPTS_DIR = os.path.join(BASE_DIR, 'assets', 'prompts', 'audio', 'bgm')
OUTPUT_DIR = os.path.join(BASE_DIR, 'assets', 'generated', 'audio', 'bgm')
AUDIO_DIR = os.path.join(BASE_DIR, 'audio', 'bgm')


def main():
    engine = MusicGenEngine()

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

    logger.info(f"Total tracks to generate: {len(all_tracks)}")

    results = {
        'total': len(all_tracks),
        'success': 0,
        'failed': 0,
        'skipped': 0,
        'errors': [],
        'tracks': []
    }

    start_time = time.time()

    for i, track in enumerate(all_tracks, 1):
        track_id = track['id']
        prompt = track['prompt']
        duration = track['duration']
        subfolder = track.get('subfolder', '')
        filename = track.get('filename', track_id.lower().replace('-', '_'))

        # Output paths
        gen_dir = os.path.join(OUTPUT_DIR, subfolder) if subfolder else OUTPUT_DIR
        audio_out_dir = os.path.join(AUDIO_DIR)
        os.makedirs(gen_dir, exist_ok=True)
        os.makedirs(audio_out_dir, exist_ok=True)

        wav_path = os.path.join(gen_dir, f"{filename}.wav")
        ogg_gen_path = os.path.join(gen_dir, f"{filename}.ogg")
        ogg_audio_path = os.path.join(audio_out_dir, f"{filename}.ogg")

        # Progress
        elapsed = time.time() - start_time
        avg_per_track = elapsed / i if i > 1 else 0
        eta = avg_per_track * (len(all_tracks) - i)
        logger.info(f"\n[{i}/{len(all_tracks)}] {track_id}: {track.get('title', '')} | {duration}s | ETA: {eta/60:.1f}min")

        # Skip if OGG already exists
        if os.path.exists(ogg_gen_path):
            logger.info(f"  Skipping (exists): {ogg_gen_path}")
            results['skipped'] += 1
            results['tracks'].append({'id': track_id, 'status': 'skipped'})
            continue

        try:
            success = engine.generate_bgm(prompt, duration, wav_path)
            if success:
                ogg_ok = engine.wav_to_ogg(wav_path, ogg_gen_path)
                if ogg_ok:
                    # Copy to audio/bgm/ for game use
                    import shutil
                    shutil.copy2(ogg_gen_path, ogg_audio_path)

                    # Remove WAV
                    if os.path.exists(wav_path):
                        os.remove(wav_path)

                    file_size = os.path.getsize(ogg_gen_path)
                    results['success'] += 1
                    results['tracks'].append({
                        'id': track_id,
                        'status': 'success',
                        'path': ogg_gen_path,
                        'size': file_size
                    })
                    logger.info(f"  ✓ {track_id} → {ogg_gen_path} ({file_size} bytes)")
                else:
                    results['failed'] += 1
                    results['errors'].append({'id': track_id, 'error': 'OGG conversion failed'})
                    results['tracks'].append({'id': track_id, 'status': 'failed', 'error': 'ogg_conversion'})
            else:
                results['failed'] += 1
                results['errors'].append({'id': track_id, 'error': 'Generation failed'})
                results['tracks'].append({'id': track_id, 'status': 'failed', 'error': 'generation'})
        except Exception as e:
            results['failed'] += 1
            results['errors'].append({'id': track_id, 'error': str(e)})
            results['tracks'].append({'id': track_id, 'status': 'failed', 'error': str(e)})
            logger.error(f"  ✗ {track_id}: {e}")

    total_time = time.time() - start_time
    logger.info(f"\n{'='*60}")
    logger.info(f"Batch complete: {results['success']}/{results['total']} success, "
                f"{results['failed']} failed, {results['skipped']} skipped")
    logger.info(f"Total time: {total_time:.0f}s ({total_time/60:.1f}min)")

    # Save results
    results_path = os.path.join(OUTPUT_DIR, 'generation_results.json')
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    logger.info(f"Results saved: {results_path}")

    return results


if __name__ == '__main__':
    results = main()
    sys.exit(0 if results['failed'] == 0 else 1)

#!/usr/bin/env python3
"""
Audio Batch Runner — 프롬프트 JSON 배치 처리
P19-02: 배치 러너 스크립트

Usage:
    python audio_batch_runner.py --input prompts.json --output-dir ./output/
    python audio_batch_runner.py --input-dir assets/prompts/audio/bgm/ --output-dir assets/generated/audio/bgm/
"""

import argparse
import json
import os
import sys
import time
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('batch_runner.log')
    ]
)
logger = logging.getLogger(__name__)


def load_prompts(input_path: str) -> list:
    """Load prompt JSON file(s)"""
    prompts = []
    path = Path(input_path)

    if path.is_file():
        with open(path) as f:
            data = json.load(f)
            if isinstance(data, list):
                prompts.extend(data)
            else:
                prompts.append(data)
    elif path.is_dir():
        for json_file in sorted(path.glob('*.json')):
            with open(json_file) as f:
                data = json.load(f)
                if isinstance(data, list):
                    prompts.extend(data)
                else:
                    prompts.append(data)
    else:
        raise FileNotFoundError(f"Input not found: {input_path}")

    return prompts


def run_batch(prompts: list, output_dir: str, skip_existing: bool = True) -> dict:
    """
    Run batch generation from prompt list.

    Each prompt dict should have:
        - id: str (e.g., "BGM-ERB-01")
        - prompt: str (MusicGen text prompt)
        - duration: int (seconds)
        - subfolder: str (optional, e.g., "exploration")
        - filename: str (optional, output filename without extension)
    """
    from musicgen_engine import MusicGenEngine
    engine = MusicGenEngine()

    results = {
        'total': len(prompts),
        'success': 0,
        'failed': 0,
        'skipped': 0,
        'errors': []
    }

    total = len(prompts)
    start_time = time.time()

    for i, item in enumerate(prompts, 1):
        track_id = item.get('id', f'track_{i:03d}')
        prompt = item.get('prompt', '')
        duration = item.get('duration', 60)
        subfolder = item.get('subfolder', '')
        filename = item.get('filename', track_id.lower().replace('-', '_'))

        # Build output paths
        out_dir = os.path.join(output_dir, subfolder) if subfolder else output_dir
        wav_path = os.path.join(out_dir, f"{filename}.wav")
        ogg_path = os.path.join(out_dir, f"{filename}.ogg")

        # Progress
        elapsed = time.time() - start_time
        eta = (elapsed / i * (total - i)) if i > 0 else 0
        logger.info(f"[{i}/{total}] {track_id} | {duration}s | ETA: {eta:.0f}s")

        # Skip if exists
        if skip_existing and os.path.exists(ogg_path):
            logger.info(f"  Skipping (exists): {ogg_path}")
            results['skipped'] += 1
            continue

        # Generate
        try:
            success = engine.generate_bgm(prompt, duration, wav_path)
            if success:
                # Convert to OGG
                ogg_ok = engine.wav_to_ogg(wav_path, ogg_path)
                if ogg_ok:
                    # Remove WAV to save space
                    os.remove(wav_path)
                    results['success'] += 1
                    logger.info(f"  ✓ {track_id} → {ogg_path}")
                else:
                    results['failed'] += 1
                    results['errors'].append({
                        'id': track_id,
                        'error': 'OGG conversion failed',
                        'wav_kept': wav_path
                    })
            else:
                results['failed'] += 1
                results['errors'].append({
                    'id': track_id,
                    'error': 'Generation failed'
                })
        except Exception as e:
            results['failed'] += 1
            results['errors'].append({
                'id': track_id,
                'error': str(e)
            })
            logger.error(f"  ✗ {track_id}: {e}")

    total_time = time.time() - start_time
    logger.info(f"\n{'='*60}")
    logger.info(f"Batch complete: {results['success']}/{total} success, "
                f"{results['failed']} failed, {results['skipped']} skipped")
    logger.info(f"Total time: {total_time:.0f}s ({total_time/60:.1f}min)")

    if results['errors']:
        logger.warning("Errors:")
        for err in results['errors']:
            logger.warning(f"  {err['id']}: {err['error']}")

    return results


def main():
    parser = argparse.ArgumentParser(description='Audio Batch Runner')
    parser.add_argument('--input', '-i', help='Input JSON file')
    parser.add_argument('--input-dir', help='Input directory with JSON files')
    parser.add_argument('--output-dir', '-o', required=True, help='Output directory')
    parser.add_argument('--no-skip', action='store_true', help='Regenerate existing files')
    args = parser.parse_args()

    input_path = args.input or args.input_dir
    if not input_path:
        parser.error("Either --input or --input-dir required")

    prompts = load_prompts(input_path)
    logger.info(f"Loaded {len(prompts)} prompts")

    results = run_batch(prompts, args.output_dir, skip_existing=not args.no_skip)

    # Save results
    results_path = os.path.join(args.output_dir, 'batch_results.json')
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    sys.exit(0 if results['failed'] == 0 else 1)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
MusicGen Engine — AudioCraft API 래퍼
P19-02: 사운드 생성 엔진 스크립트

Usage:
    from musicgen_engine import MusicGenEngine
    engine = MusicGenEngine()
    engine.generate_bgm("dark fantasy ambient", 60, "output.wav")
"""

import os
import sys
import time
import logging
import numpy as np
import soundfile as sf

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# Lazy-load heavy imports
_model = None
_model_name = 'facebook/musicgen-small'


def _get_model():
    """Lazy-load MusicGen model (singleton)"""
    global _model
    if _model is None:
        logger.info(f"Loading MusicGen model: {_model_name}")
        from audiocraft.models import MusicGen
        _model = MusicGen.get_pretrained(_model_name)
        logger.info("Model loaded successfully")
    return _model


class MusicGenEngine:
    """MusicGen API wrapper for BGM/SFX generation"""

    def __init__(self, model_name: str = 'facebook/musicgen-small'):
        global _model_name
        _model_name = model_name
        self.sample_rate = 32000  # MusicGen default

    def generate_bgm(self, prompt: str, duration_sec: int, output_path: str,
                     temperature: float = 1.0, top_k: int = 250) -> bool:
        """
        Generate a BGM track from a text prompt.

        Args:
            prompt: Text description of the desired music
            duration_sec: Duration in seconds
            output_path: Output WAV file path
            temperature: Sampling temperature (higher = more random)
            top_k: Top-k sampling parameter

        Returns:
            True if successful, False otherwise
        """
        try:
            model = _get_model()
            model.set_generation_params(
                duration=duration_sec,
                temperature=temperature,
                top_k=top_k
            )

            logger.info(f"Generating BGM: {duration_sec}s | {prompt[:80]}...")
            start = time.time()

            # MusicGen generates in chunks for long durations
            # For tracks > 30s, generate in segments and concatenate
            if duration_sec <= 30:
                wav = model.generate([prompt])
                audio = wav[0].cpu().numpy().squeeze()
            else:
                # Generate in 30-second segments with overlap for continuity
                segments = []
                remaining = duration_sec
                segment_len = 30
                overlap = 2  # seconds overlap for crossfade

                while remaining > 0:
                    gen_len = min(segment_len, remaining + overlap)
                    model.set_generation_params(
                        duration=gen_len,
                        temperature=temperature,
                        top_k=top_k
                    )
                    wav = model.generate([prompt])
                    seg = wav[0].cpu().numpy().squeeze()

                    if segments and overlap > 0:
                        # Crossfade with previous segment
                        overlap_samples = int(overlap * self.sample_rate)
                        fade_out = np.linspace(1, 0, overlap_samples)
                        fade_in = np.linspace(0, 1, overlap_samples)

                        # Apply crossfade
                        prev_tail = segments[-1][-overlap_samples:]
                        curr_head = seg[:overlap_samples]
                        crossfaded = prev_tail * fade_out + curr_head * fade_in

                        segments[-1] = segments[-1][:-overlap_samples]
                        segments.append(crossfaded)
                        segments.append(seg[overlap_samples:])
                    else:
                        segments.append(seg)

                    remaining -= (gen_len - overlap) if segments else gen_len
                    if remaining <= overlap:
                        break

                audio = np.concatenate(segments)
                # Trim to exact duration
                target_samples = duration_sec * self.sample_rate
                audio = audio[:target_samples]

            elapsed = time.time() - start
            logger.info(f"Generated in {elapsed:.1f}s | Shape: {audio.shape}")

            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)

            # Save as WAV
            sf.write(output_path, audio, self.sample_rate)
            logger.info(f"Saved: {output_path} ({os.path.getsize(output_path)} bytes)")
            return True

        except Exception as e:
            logger.error(f"Generation failed: {e}")
            return False

    def generate_sfx(self, prompt: str, duration_sec: int, output_path: str,
                     temperature: float = 1.0, top_k: int = 250) -> bool:
        """Generate SFX (same engine, different default params)"""
        # SFX uses shorter duration and slightly different prompt style
        sfx_prompt = f"sound effect, {prompt}, short, clean"
        return self.generate_bgm(sfx_prompt, duration_sec, output_path,
                                 temperature=temperature, top_k=top_k)

    def wav_to_ogg(self, wav_path: str, ogg_path: str = None) -> bool:
        """Convert WAV to OGG Vorbis using ffmpeg"""
        if ogg_path is None:
            ogg_path = wav_path.replace('.wav', '.ogg')
        try:
            import subprocess
            cmd = [
                'ffmpeg', '-y', '-i', wav_path,
                '-c:a', 'libopus', '-b:a', '128k',
                '-ar', '48000',
                ogg_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if result.returncode == 0:
                logger.info(f"Converted: {ogg_path}")
                return True
            else:
                logger.error(f"ffmpeg error: {result.stderr}")
                return False
        except Exception as e:
            logger.error(f"Conversion failed: {e}")
            return False


if __name__ == '__main__':
    engine = MusicGenEngine()
    # Quick test
    success = engine.generate_bgm(
        "dark fantasy RPG ambient, orchestral, mysterious, no vocals",
        10,
        "/tmp/musicgen_test.wav"
    )
    if success:
        engine.wav_to_ogg("/tmp/musicgen_test.wav")
        print("✓ Engine test passed")
    else:
        print("✗ Engine test failed")
        sys.exit(1)

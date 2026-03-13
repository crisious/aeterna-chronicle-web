#!/usr/bin/env python3
"""
AudioGen Engine — SFX 생성 래퍼
P19-08: AudioCraft AudioGen API wrapper for SFX generation
"""

import os
import sys
import time
import logging
import subprocess
import numpy as np
import soundfile as sf

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

_model = None
_model_name = 'facebook/audiogen-medium'


def _get_model():
    global _model
    if _model is None:
        logger.info(f"Loading AudioGen model: {_model_name}")
        from audiocraft.models import AudioGen
        _model = AudioGen.get_pretrained(_model_name)
        logger.info("AudioGen model loaded")
    return _model


class AudioGenEngine:
    """AudioGen wrapper for SFX/ambient generation"""

    def __init__(self, model_name: str = 'facebook/audiogen-medium'):
        global _model_name
        _model_name = model_name
        self.sample_rate = 16000  # AudioGen default

    def generate(self, prompt: str, duration_sec: float, output_wav: str,
                 temperature: float = 1.0, top_k: int = 250) -> bool:
        try:
            model = _get_model()
            model.set_generation_params(
                duration=min(duration_sec, 10),  # AudioGen max ~10s per chunk
                temperature=temperature,
                top_k=top_k
            )
            logger.info(f"Generating: {duration_sec}s | {prompt[:60]}...")
            start = time.time()

            if duration_sec <= 10:
                wav = model.generate([prompt])
                audio = wav[0].cpu().numpy().squeeze()
            else:
                # For ambient (>10s): generate multiple chunks and crossfade
                segments = []
                generated = 0
                chunk_len = 10
                overlap_sec = 1
                overlap_samples = int(overlap_sec * self.sample_rate)

                while generated < duration_sec:
                    remaining = duration_sec - generated
                    gen_len = min(chunk_len, remaining + overlap_sec)
                    model.set_generation_params(duration=gen_len, temperature=temperature, top_k=top_k)
                    wav = model.generate([prompt])
                    seg = wav[0].cpu().numpy().squeeze()

                    if segments and overlap_samples > 0 and len(seg) > overlap_samples:
                        fade_out = np.linspace(1, 0, overlap_samples)
                        fade_in = np.linspace(0, 1, overlap_samples)
                        prev_tail = segments[-1][-overlap_samples:]
                        curr_head = seg[:overlap_samples]
                        crossfaded = prev_tail * fade_out + curr_head * fade_in
                        segments[-1] = segments[-1][:-overlap_samples]
                        segments.append(crossfaded)
                        segments.append(seg[overlap_samples:])
                        generated += gen_len - overlap_sec
                    else:
                        segments.append(seg)
                        generated += gen_len

                audio = np.concatenate(segments)
                target_samples = int(duration_sec * self.sample_rate)
                audio = audio[:target_samples]

            elapsed = time.time() - start
            logger.info(f"Generated in {elapsed:.1f}s | Samples: {len(audio)}")

            os.makedirs(os.path.dirname(output_wav) or '.', exist_ok=True)
            sf.write(output_wav, audio, self.sample_rate)
            logger.info(f"Saved WAV: {output_wav}")
            return True

        except Exception as e:
            logger.error(f"Generation failed: {e}")
            return False

    @staticmethod
    def wav_to_ogg(wav_path: str, ogg_path: str = None) -> bool:
        if ogg_path is None:
            ogg_path = wav_path.replace('.wav', '.ogg')
        try:
            cmd = ['ffmpeg', '-y', '-i', wav_path, '-c:a', 'libopus', '-b:a', '128k', '-ar', '48000', ogg_path]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if result.returncode == 0:
                logger.info(f"Converted: {ogg_path}")
                return True
            else:
                logger.error(f"ffmpeg error: {result.stderr[:200]}")
                return False
        except Exception as e:
            logger.error(f"Conversion failed: {e}")
            return False


if __name__ == '__main__':
    engine = AudioGenEngine()
    ok = engine.generate("sword clashing metal impact", 2, "/tmp/audiogen_test.wav")
    if ok:
        engine.wav_to_ogg("/tmp/audiogen_test.wav")
        print("✓ AudioGen test passed")
    else:
        print("✗ AudioGen test failed")
        sys.exit(1)

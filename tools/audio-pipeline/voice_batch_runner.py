#!/usr/bin/env python3
"""
Voice Batch Runner — P19-15~17: 전투 보이스 10개 + NPC 보이스 10개
gTTS 기반 (Bark 대비 가볍고 안정적)
- 전투 보이스: 짧은 감탄사/기합 스타일
- NPC 보이스: 간단한 인사말
"""

import os
import sys
import json
import time
import logging
import subprocess

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ASSETS_BASE = os.path.join(PROJECT_ROOT, 'assets', 'generated', 'audio')

# P19-16: 전투 보이스 10개
COMBAT_VOICES = [
    ("attack_1", "하아!", "ko"),
    ("attack_2", "받아라!", "ko"),
    ("skill_cast", "에테르의 힘이여!", "ko"),
    ("ultimate", "기억의 폭풍이여, 깨어나라!", "ko"),
    ("hit_1", "윽!", "ko"),
    ("hit_2", "크윽!", "ko"),
    ("critical", "치명타!", "ko"),
    ("dodge", "빗나갔지!", "ko"),
    ("death", "이런... 기억이... 사라진다...", "ko"),
    ("victory", "기억은 영원히 남는다.", "ko"),
]

# P19-17: NPC 보이스 10개 (카엘→마테우스 SSOT 반영)
NPC_VOICES = [
    ("erien_greet", "어서 오세요, 모험가여. 당신의 기억이 이곳으로 이끌었군요.", "ko"),
    ("nuariel_greet", "숲의 기억이 당신을 환영합니다.", "ko"),
    ("matheus_greet", "카엘의 뜻을 이어, 제가 당신을 돕겠습니다.", "ko"),
    ("merchant_greet", "좋은 물건 많이 있습니다! 구경해 보세요.", "ko"),
    ("guard_greet", "성문을 지키는 것이 나의 임무. 무슨 일인가?", "ko"),
    ("elder_greet", "오래된 기억 속에 진실이 숨어 있느니라.", "ko"),
    ("blacksmith_greet", "좋은 무기를 원한다면 제대로 찾아왔군.", "ko"),
    ("innkeeper_greet", "피곤하시죠? 여기서 쉬어 가세요.", "ko"),
    ("quest_giver_greet", "중요한 임무가 있습니다. 들어보시겠습니까?", "ko"),
    ("mysterious_greet", "기억의 파편이... 당신에게 속삭이고 있군요...", "ko"),
]


def generate_voice_gtts(text: str, lang: str, output_path: str) -> bool:
    """Generate voice using gTTS"""
    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang=lang, slow=False)
        mp3_path = output_path.replace('.ogg', '.mp3')
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        tts.save(mp3_path)
        
        # Convert mp3 → ogg
        cmd = ['ffmpeg', '-y', '-i', mp3_path, '-c:a', 'libopus', '-b:a', '128k', '-ar', '48000', output_path]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        try:
            os.remove(mp3_path)
        except:
            pass
        
        if result.returncode == 0:
            logger.info(f"OK: {output_path}")
            return True
        else:
            logger.error(f"ffmpeg fail: {result.stderr[:100]}")
            return False
    except Exception as e:
        logger.error(f"gTTS fail: {e}")
        return False


def generate_voice_pyttsx3(text: str, output_path: str) -> bool:
    """Fallback: generate voice using pyttsx3"""
    try:
        import pyttsx3
        engine = pyttsx3.init()
        wav_path = output_path.replace('.ogg', '.wav')
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        engine.save_to_file(text, wav_path)
        engine.runAndWait()
        
        cmd = ['ffmpeg', '-y', '-i', wav_path, '-c:a', 'libopus', '-b:a', '128k', '-ar', '48000', output_path]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        try:
            os.remove(wav_path)
        except:
            pass
        
        return result.returncode == 0
    except Exception as e:
        logger.error(f"pyttsx3 fail: {e}")
        return False


def generate_voice_macos_say(text: str, output_path: str, voice: str = "Yuna") -> bool:
    """macOS say command fallback — uses built-in Korean voice"""
    try:
        aiff_path = output_path.replace('.ogg', '.aiff')
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        
        cmd_say = ['say', '-v', voice, '-o', aiff_path, text]
        result = subprocess.run(cmd_say, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            logger.error(f"say fail: {result.stderr[:100]}")
            return False
        
        cmd_ffmpeg = ['ffmpeg', '-y', '-i', aiff_path, '-c:a', 'libopus', '-b:a', '128k', '-ar', '48000', output_path]
        result = subprocess.run(cmd_ffmpeg, capture_output=True, text=True, timeout=30)
        
        try:
            os.remove(aiff_path)
        except:
            pass
        
        if result.returncode == 0:
            logger.info(f"OK (say): {output_path}")
            return True
        return False
    except Exception as e:
        logger.error(f"say fail: {e}")
        return False


def main():
    results = {"success": 0, "fail": 0, "details": []}
    
    # Determine TTS engine
    tts_method = None
    try:
        from gtts import gTTS
        tts_method = "gtts"
        logger.info("Using gTTS engine")
    except ImportError:
        logger.info("gTTS not available, trying macOS say...")
        # Check if macOS 'say' has Korean voice
        check = subprocess.run(['say', '-v', '?'], capture_output=True, text=True)
        if 'Yuna' in check.stdout or 'ko_KR' in check.stdout:
            tts_method = "macos_say"
            logger.info("Using macOS say (Yuna)")
        else:
            logger.warning("No Korean voice available, will try pyttsx3")
            tts_method = "pyttsx3"
    
    all_voices = [
        ("P19-16 전투 보이스", COMBAT_VOICES, os.path.join(ASSETS_BASE, 'voice', 'combat')),
        ("P19-17 NPC 보이스", NPC_VOICES, os.path.join(ASSETS_BASE, 'voice', 'npc')),
    ]
    
    for cat_name, voice_list, output_dir in all_voices:
        logger.info(f"\n{'='*60}\n  {cat_name} ({len(voice_list)} files)\n{'='*60}")
        os.makedirs(output_dir, exist_ok=True)
        
        for filename, text, lang in voice_list:
            ogg_path = os.path.join(output_dir, f"{filename}.ogg")
            
            if os.path.exists(ogg_path):
                logger.info(f"SKIP: {ogg_path}")
                results["details"].append({"file": filename, "status": "skip"})
                continue
            
            if tts_method == "gtts":
                ok = generate_voice_gtts(text, lang, ogg_path)
            elif tts_method == "macos_say":
                ok = generate_voice_macos_say(text, ogg_path)
            else:
                ok = generate_voice_pyttsx3(text, ogg_path)
            
            if ok:
                results["success"] += 1
                results["details"].append({"file": filename, "status": "ok", "text": text})
            else:
                results["fail"] += 1
                results["details"].append({"file": filename, "status": "fail"})
    
    # Save log
    log_path = os.path.join(ASSETS_BASE, 'voice', 'generation_log.json')
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    with open(log_path, 'w') as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "tts_engine": tts_method,
            "summary": {k: v for k, v in results.items() if k != "details"},
            "details": results["details"]
        }, f, indent=2, ensure_ascii=False)
    
    logger.info(f"\nDONE: {results['success']} ok / {results['fail']} fail")
    return results['fail'] == 0


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

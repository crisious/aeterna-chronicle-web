#!/bin/bash
# 에테르나 크로니클 — AudioCraft 환경 설정 스크립트
# Mac Mini M4 16GB 대응

set -e

VENV_DIR="$HOME/audiocraft_venv"
PYTHON="/opt/homebrew/bin/python3.12"

echo "=== AudioCraft 환경 설정 ==="

# 1. Homebrew 의존성
echo "[1/4] Homebrew 의존성 확인..."
brew list ffmpeg &>/dev/null || brew install ffmpeg
brew list pkg-config &>/dev/null || brew install pkg-config
echo "  ✓ ffmpeg, pkg-config 확인"

# 2. Python 가상환경
if [ -d "$VENV_DIR" ]; then
    echo "[2/4] 기존 venv 발견: $VENV_DIR"
else
    echo "[2/4] Python venv 생성..."
    $PYTHON -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
pip install --upgrade pip -q

# 3. PyTorch + AudioCraft
echo "[3/4] PyTorch + AudioCraft 설치..."
pip install torch torchaudio numpy scipy av soundfile sentencepiece protobuf \
    transformers huggingface_hub encodec einops flashy julius lameenc demucs \
    num2words librosa torchmetrics -q 2>&1 | tail -2

pip install --no-deps audiocraft -q 2>&1 | tail -1

# 4. Patch xformers/spacy (macOS 호환)
SITE="$VENV_DIR/lib/python3.12/site-packages/audiocraft"
echo "[4/4] macOS 호환 패치 적용..."

python3 -c "
path = '$SITE/modules/transformer.py'
with open(path, 'r') as f:
    c = f.read()
if 'ops = None' not in c:
    c = c.replace('from xformers import ops',
        'try:\\n    from xformers import ops\\nexcept ImportError:\\n    ops = None')
    c = c.replace('        from xformers.profiler import profiler',
        '        try:\\n            from xformers.profiler import profiler\\n        except ImportError:\\n            return False')
    with open(path, 'w') as f:
        f.write(c)
    print('  ✓ transformer.py 패치 완료')
else:
    print('  ✓ transformer.py 이미 패치됨')
"

python3 -c "
path = '$SITE/modules/conditioners.py'
with open(path, 'r') as f:
    c = f.read()
if 'spacy = None' not in c:
    c = c.replace('import spacy', 'try:\\n    import spacy\\nexcept ImportError:\\n    spacy = None')
    with open(path, 'w') as f:
        f.write(c)
    print('  ✓ conditioners.py 패치 완료')
else:
    print('  ✓ conditioners.py 이미 패치됨')
"

# 5. 검증
echo ""
echo "=== 검증 ==="
python3 -c "
import torch
print(f'  PyTorch: {torch.__version__}')
print(f'  MPS: {torch.backends.mps.is_available()}')
from audiocraft.models import MusicGen
print('  MusicGen: import OK')
print('  ✅ 설정 완료!')
"

echo ""
echo "사용법:"
echo "  source $VENV_DIR/bin/activate"
echo "  python3 scripts/generate_bgm.py --tracks all --device cpu"

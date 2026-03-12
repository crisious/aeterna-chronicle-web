#!/usr/bin/env python3
"""
에테르나 크로니클 — 배경 제거 스크립트
티켓: P13-16
의존성: rembg, Pillow
사용법: python remove_bg.py input.png output.png [--model u2net]
"""

import argparse
import sys
from pathlib import Path

try:
    from rembg import remove
    from PIL import Image
except ImportError:
    print("[ERROR] 필수 패키지 미설치. pip install rembg Pillow 실행 필요.")
    sys.exit(1)


# ── 지원 모델 ──────────────────────────────────────────────
SUPPORTED_MODELS = [
    "u2net",           # 범용 (기본)
    "u2netp",          # 경량 버전
    "u2net_human_seg", # 인물 특화
    "isnet-general-use",  # 일반 오브젝트
    "isnet-anime",     # 애니메이션/일러스트 특화
]
DEFAULT_MODEL = "isnet-anime"  # 픽셀아트/일러스트에 최적


def remove_background(
    input_path: str,
    output_path: str,
    model: str = DEFAULT_MODEL,
    alpha_matting: bool = False,
    post_process_mask: bool = True,
) -> dict:
    """
    이미지 배경을 제거하고 투명 PNG로 저장.

    Args:
        input_path: 입력 이미지 경로
        output_path: 출력 이미지 경로 (PNG)
        model: rembg 모델명
        alpha_matting: 알파 매팅 활성화 (경계 부드럽게)
        post_process_mask: 마스크 후처리 (노이즈 제거)

    Returns:
        dict: 처리 결과 (input, output, size, alpha_ratio)
    """
    input_img = Image.open(input_path)
    original_size = input_img.size

    # 배경 제거
    output_img = remove(
        input_img,
        session=None,
        model_name=model,
        alpha_matting=alpha_matting,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10,
        post_process_mask=post_process_mask,
    )

    # RGBA 변환 보장
    if output_img.mode != "RGBA":
        output_img = output_img.convert("RGBA")

    # 저장
    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    output_img.save(str(out_path), "PNG")

    # 알파 채널 통계
    alpha = output_img.split()[-1]
    pixels = list(alpha.getdata())
    transparent_ratio = sum(1 for p in pixels if p < 10) / len(pixels)

    return {
        "input": str(input_path),
        "output": str(output_path),
        "size": original_size,
        "output_size": output_img.size,
        "transparent_ratio": round(transparent_ratio, 4),
        "model": model,
    }


def batch_remove(
    input_dir: str,
    output_dir: str,
    model: str = DEFAULT_MODEL,
    extensions: tuple = (".png", ".jpg", ".jpeg", ".webp"),
) -> list:
    """디렉터리 내 모든 이미지 배경 일괄 제거."""
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    results = []
    files = [f for f in input_path.iterdir() if f.suffix.lower() in extensions]
    total = len(files)

    for i, f in enumerate(sorted(files), 1):
        out_file = output_path / f"{f.stem}_nobg.png"
        print(f"  [{i}/{total}] {f.name} → {out_file.name}")
        try:
            result = remove_background(str(f), str(out_file), model=model)
            result["status"] = "ok"
        except Exception as e:
            result = {"input": str(f), "status": "error", "error": str(e)}
        results.append(result)

    return results


# ── CLI ────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="에테르나 크로니클 — 배경 제거 (rembg)"
    )
    parser.add_argument("input", help="입력 이미지 또는 디렉터리")
    parser.add_argument("output", help="출력 이미지 또는 디렉터리")
    parser.add_argument(
        "--model", default=DEFAULT_MODEL, choices=SUPPORTED_MODELS,
        help=f"rembg 모델 (기본: {DEFAULT_MODEL})"
    )
    parser.add_argument(
        "--alpha-matting", action="store_true",
        help="알파 매팅 활성화 (경계 부드럽게)"
    )
    parser.add_argument(
        "--batch", action="store_true",
        help="디렉터리 배치 모드"
    )

    args = parser.parse_args()

    if args.batch:
        print(f"[배치 모드] {args.input} → {args.output} (모델: {args.model})")
        results = batch_remove(args.input, args.output, model=args.model)
        ok = sum(1 for r in results if r["status"] == "ok")
        print(f"\n완료: {ok}/{len(results)} 성공")
    else:
        print(f"[단일 모드] {args.input} → {args.output} (모델: {args.model})")
        result = remove_background(
            args.input, args.output,
            model=args.model,
            alpha_matting=args.alpha_matting,
        )
        print(f"  크기: {result['size']} → {result['output_size']}")
        print(f"  투명 비율: {result['transparent_ratio']:.1%}")
        print("  완료.")


if __name__ == "__main__":
    main()

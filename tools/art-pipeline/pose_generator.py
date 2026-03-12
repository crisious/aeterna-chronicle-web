#!/usr/bin/env python3
"""
에테르나 크로니클 — P15-01: ControlNet 포즈 스켈레톤 라이브러리
OpenPose JSON 형식 포즈 생성 + 미러링 + 배치 출력

사용법:
  python pose_generator.py --output assets/controlnet-poses/
  python pose_generator.py --type character --motion idle --direction D
  python pose_generator.py --type monster --output assets/controlnet-poses/monsters/
  python pose_generator.py --list          # 전체 포즈 목록 출력
  python pose_generator.py --validate      # 생성된 포즈 검증
"""

import argparse
import json
import os
import copy
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ── OpenPose 18-키포인트 인덱스 ────────────────────────────
KEYPOINT_NAMES = [
    "nose", "neck", "right_shoulder", "right_elbow", "right_wrist",
    "left_shoulder", "left_elbow", "left_wrist", "right_hip", "right_knee",
    "right_ankle", "left_hip", "left_knee", "left_ankle", "right_eye",
    "left_eye", "right_ear", "left_ear"
]

# ── 캐릭터 방향 정의 (5제작 + 3미러) ──────────────────────
CHARACTER_DIRECTIONS = {
    "D":  {"name": "아래(정면)", "mirror_of": None},
    "DL": {"name": "아래왼쪽",   "mirror_of": None},
    "L":  {"name": "왼쪽",       "mirror_of": None},
    "UL": {"name": "위왼쪽",     "mirror_of": None},
    "U":  {"name": "위(뒷면)",   "mirror_of": None},
    "UR": {"name": "위오른쪽",   "mirror_of": "UL"},
    "R":  {"name": "오른쪽",     "mirror_of": "L"},
    "DR": {"name": "아래오른쪽", "mirror_of": "DL"},
}

# 실제 제작 방향 (미러링 원본만)
CHARACTER_PRODUCE_DIRS = ["D", "DL", "L", "UL", "U"]

# ── 몬스터 방향 정의 (3제작 + 1미러) ──────────────────────
MONSTER_DIRECTIONS = {
    "D":  {"name": "아래(정면)", "mirror_of": None},
    "L":  {"name": "왼쪽",       "mirror_of": None},
    "U":  {"name": "위(뒷면)",   "mirror_of": None},
    "R":  {"name": "오른쪽",     "mirror_of": "L"},
}

MONSTER_PRODUCE_DIRS = ["D", "L", "U"]

# ── 캐릭터 모션 정의 ──────────────────────────────────────
CHARACTER_MOTIONS = {
    "idle":         {"frames": 4, "fps": 5,  "loop": True,  "name": "대기"},
    "walk":         {"frames": 6, "fps": 10, "loop": True,  "name": "이동"},
    "attack_melee": {"frames": 6, "fps": 12, "loop": False, "name": "근접 공격"},
    "attack_ranged":{"frames": 6, "fps": 12, "loop": False, "name": "원거리 공격"},
    "cast":         {"frames": 5, "fps": 10, "loop": False, "name": "스킬 시전"},
    "hit":          {"frames": 3, "fps": 12, "loop": False, "name": "피격"},
    "death":        {"frames": 5, "fps": 8,  "loop": False, "name": "사망"},
}

# ── 몬스터 모션 정의 ──────────────────────────────────────
MONSTER_MOTIONS = {
    "idle":   {"frames": 4, "fps": 5,  "loop": True,  "name": "대기"},
    "walk":   {"frames": 4, "fps": 8,  "loop": True,  "name": "이동"},
    "attack": {"frames": 5, "fps": 12, "loop": False, "name": "공격"},
    "hit":    {"frames": 3, "fps": 12, "loop": False, "name": "피격"},
    "death":  {"frames": 4, "fps": 8,  "loop": False, "name": "사망"},
}

# ── 캔버스 크기 (64×64 스프라이트 기준) ───────────────────
CANVAS_W, CANVAS_H = 64, 64
CENTER_X = CANVAS_W / 2  # 32
GROUND_Y = CANVAS_H * 0.9  # 57.6 (피벗)


def _base_skeleton(facing: str = "front") -> List[List[float]]:
    """기본 스탠딩 포즈 스켈레톤 (정면 기준, 2.5등신 픽셀아트 비율)"""
    # 각 키포인트: [x, y, confidence]
    # 2.5등신: 머리 ~20px, 몸통 ~18px, 다리 ~20px = 총 ~58px (64px 내)
    cx = CENTER_X  # 32

    if facing == "front":  # D
        return [
            [cx, 10, 1.0],       # 0 nose
            [cx, 16, 1.0],       # 1 neck
            [cx-8, 18, 1.0],     # 2 right_shoulder
            [cx-10, 28, 1.0],    # 3 right_elbow
            [cx-8, 36, 1.0],     # 4 right_wrist
            [cx+8, 18, 1.0],     # 5 left_shoulder
            [cx+10, 28, 1.0],    # 6 left_elbow
            [cx+8, 36, 1.0],     # 7 left_wrist
            [cx-5, 36, 1.0],     # 8 right_hip
            [cx-5, 46, 1.0],     # 9 right_knee
            [cx-5, 56, 1.0],     # 10 right_ankle
            [cx+5, 36, 1.0],     # 11 left_hip
            [cx+5, 46, 1.0],     # 12 left_knee
            [cx+5, 56, 1.0],     # 13 left_ankle
            [cx-3, 8, 1.0],      # 14 right_eye
            [cx+3, 8, 1.0],      # 15 left_eye
            [cx-6, 9, 1.0],      # 16 right_ear
            [cx+6, 9, 1.0],      # 17 left_ear
        ]
    elif facing == "back":  # U
        # 동일 구조, 눈/코 confidence 0 (안 보임)
        skel = _base_skeleton("front")
        skel[0][2] = 0.0   # nose 안 보임
        skel[14][2] = 0.0   # right_eye
        skel[15][2] = 0.0   # left_eye
        return skel
    elif facing == "left":  # L (왼쪽을 바라봄)
        return [
            [cx-2, 10, 1.0],     # 0 nose (약간 좌측)
            [cx, 16, 1.0],       # 1 neck
            [cx+3, 18, 1.0],     # 2 right_shoulder (뒤)
            [cx+5, 28, 0.5],     # 3 right_elbow (부분 가림)
            [cx+3, 36, 0.3],     # 4 right_wrist (가림)
            [cx-3, 18, 1.0],     # 5 left_shoulder (앞)
            [cx-8, 28, 1.0],     # 6 left_elbow
            [cx-10, 36, 1.0],    # 7 left_wrist
            [cx+2, 36, 0.5],     # 8 right_hip (뒤)
            [cx+2, 46, 0.5],     # 9 right_knee
            [cx+2, 56, 0.5],     # 10 right_ankle
            [cx-2, 36, 1.0],     # 11 left_hip (앞)
            [cx-2, 46, 1.0],     # 12 left_knee
            [cx-2, 56, 1.0],     # 13 left_ankle
            [cx-4, 8, 0.0],      # 14 right_eye (가림)
            [cx-1, 8, 1.0],      # 15 left_eye
            [cx+4, 9, 0.0],      # 16 right_ear (가림)
            [cx-5, 9, 1.0],      # 17 left_ear
        ]
    elif facing == "down_left":  # DL
        skel = _base_skeleton("front")
        # 약간 좌측 회전
        for kp in skel:
            kp[0] -= 2
        skel[2][0] += 1   # right_shoulder 약간 가림
        skel[3][2] = 0.7
        skel[4][2] = 0.5
        return skel
    elif facing == "up_left":  # UL
        skel = _base_skeleton("back")
        for kp in skel:
            kp[0] -= 2
        skel[5][0] -= 2
        skel[6][0] -= 3
        return skel
    else:
        return _base_skeleton("front")


def _apply_motion(skeleton: List[List[float]], motion: str, frame: int,
                   total_frames: int, direction: str) -> List[List[float]]:
    """모션별 키프레임 변형 적용"""
    s = copy.deepcopy(skeleton)
    t = frame / max(total_frames - 1, 1)  # 0.0~1.0 정규화

    if motion == "idle":
        # 미세한 호흡 효과: 어깨/머리 약간 상하
        offset = 0.5 * (1 if frame % 2 == 0 else -1)
        s[0][1] += offset   # nose
        s[1][1] += offset   # neck
        s[2][1] += offset * 0.5
        s[5][1] += offset * 0.5

    elif motion == "walk":
        # 다리 교차 보행 사이클
        import math
        phase = math.sin(t * 2 * math.pi)
        s[9][1] += phase * 3    # right_knee
        s[10][1] += phase * 2   # right_ankle
        s[12][1] -= phase * 3   # left_knee (반대)
        s[13][1] -= phase * 2   # left_ankle
        # 팔 스윙
        s[3][1] -= phase * 2    # right_elbow
        s[6][1] += phase * 2    # left_elbow

    elif motion == "attack_melee":
        # 프레임 0-1: 준비, 2-3: 스윙, 4-5: 복귀
        if frame <= 1:
            s[6][1] -= 4   # 왼팔 들어올림
            s[7][1] -= 8
            s[7][0] -= 4
        elif frame <= 3:
            s[6][1] += 2   # 스윙 다운
            s[7][1] += 6
            s[7][0] += 8
            s[1][1] += 1   # 몸 기울임
        else:
            s[6][1] -= 1
            s[7][1] -= 2

    elif motion == "attack_ranged":
        # 프레임 0-1: 조준, 2-3: 발사, 4-5: 복귀
        if frame <= 1:
            s[6][0] -= 6   # 왼팔 앞으로
            s[7][0] -= 10
        elif frame <= 3:
            s[7][0] -= 14  # 발사 (팔 최대 신장)
            s[6][0] -= 8
        else:
            s[6][0] -= 3
            s[7][0] -= 5

    elif motion == "cast":
        # 양손 들어올림 → 에너지 집중 → 발사
        if frame <= 1:
            for arm in [3, 4, 6, 7]:
                s[arm][1] -= 4 * (frame + 1)
        elif frame <= 3:
            s[4][1] -= 12; s[4][0] += 4
            s[7][1] -= 12; s[7][0] -= 4
        else:
            s[4][1] -= 8; s[7][1] -= 8

    elif motion == "hit":
        # 뒤로 밀림
        offset = 3 * (frame + 1) / total_frames
        for kp in s:
            kp[0] += offset
        s[1][1] += 2  # 몸 살짝 구부림

    elif motion == "death":
        # 점진적 쓰러짐
        fall_progress = t
        for kp in s:
            kp[1] += fall_progress * 15
            kp[0] += fall_progress * 5
        # 최종 프레임: 바닥에 눕기
        if frame >= total_frames - 1:
            for kp in s:
                kp[1] = min(kp[1], GROUND_Y)

    # 좌표 클램핑 (캔버스 내)
    for kp in s:
        kp[0] = max(0, min(CANVAS_W, kp[0]))
        kp[1] = max(0, min(CANVAS_H, kp[1]))

    return s


def mirror_skeleton(skeleton: List[List[float]], canvas_w: float = CANVAS_W) -> List[List[float]]:
    """수평 미러링: x → canvas_w - x, 좌/우 스왑"""
    s = copy.deepcopy(skeleton)
    # 좌우 반전
    for kp in s:
        kp[0] = canvas_w - kp[0]

    # 좌우 키포인트 스왑 (OpenPose 규칙)
    swap_pairs = [(2, 5), (3, 6), (4, 7), (8, 11), (9, 12), (10, 13), (14, 15), (16, 17)]
    for a, b in swap_pairs:
        s[a], s[b] = s[b], s[a]

    return s


def _dir_to_facing(direction: str) -> str:
    """방향 코드 → 스켈레톤 facing 매핑"""
    mapping = {"D": "front", "DL": "down_left", "L": "left", "UL": "up_left", "U": "back"}
    return mapping.get(direction, "front")


def generate_pose(entity_type: str, direction: str, motion: str,
                  frame: int) -> Dict:
    """단일 포즈 JSON 생성"""
    if entity_type == "character":
        motions = CHARACTER_MOTIONS
        dirs = CHARACTER_DIRECTIONS
    else:
        motions = MONSTER_MOTIONS
        dirs = MONSTER_DIRECTIONS

    motion_info = motions[motion]
    dir_info = dirs[direction]
    total_frames = motion_info["frames"]

    # 미러링 방향이면 원본 생성 후 미러
    source_dir = dir_info["mirror_of"] or direction
    facing = _dir_to_facing(source_dir)
    skeleton = _base_skeleton(facing)
    skeleton = _apply_motion(skeleton, motion, frame, total_frames, source_dir)

    if dir_info["mirror_of"]:
        skeleton = mirror_skeleton(skeleton)

    return {
        "version": "1.0",
        "entity_type": entity_type,
        "direction": direction,
        "direction_name": dir_info["name"],
        "motion": motion,
        "motion_name": motion_info["name"],
        "frame": frame,
        "total_frames": total_frames,
        "fps": motion_info["fps"],
        "loop": motion_info["loop"],
        "canvas": {"width": CANVAS_W, "height": CANVAS_H},
        "mirrored_from": dir_info["mirror_of"],
        "keypoints": {
            "format": "openpose_18",
            "points": skeleton,
            "names": KEYPOINT_NAMES
        }
    }


def generate_all_poses(entity_type: str, output_dir: Path) -> int:
    """엔티티 타입별 전체 포즈 생성"""
    if entity_type == "character":
        motions = CHARACTER_MOTIONS
        produce_dirs = CHARACTER_PRODUCE_DIRS
        all_dirs = CHARACTER_DIRECTIONS
    else:
        motions = MONSTER_MOTIONS
        produce_dirs = MONSTER_PRODUCE_DIRS
        all_dirs = MONSTER_DIRECTIONS

    count = 0
    # 1) 원본 방향 포즈 생성
    for d in produce_dirs:
        for m, minfo in motions.items():
            for f in range(minfo["frames"]):
                pose = generate_pose(entity_type, d, m, f)
                fname = f"{entity_type}_{d}_{m}_f{f:02d}.json"
                fpath = output_dir / fname
                fpath.write_text(json.dumps(pose, indent=2, ensure_ascii=False))
                count += 1

    # 2) 미러링 방향 생성
    for d, dinfo in all_dirs.items():
        if dinfo["mirror_of"] is None:
            continue
        for m, minfo in motions.items():
            for f in range(minfo["frames"]):
                pose = generate_pose(entity_type, d, m, f)
                fname = f"{entity_type}_{d}_{m}_f{f:02d}.json"
                fpath = output_dir / fname
                fpath.write_text(json.dumps(pose, indent=2, ensure_ascii=False))
                count += 1

    return count


def validate_poses(output_dir: Path) -> Tuple[int, int, List[str]]:
    """생성된 포즈 파일 검증"""
    ok = 0
    fail = 0
    errors = []

    for fpath in sorted(output_dir.rglob("*.json")):
        try:
            data = json.loads(fpath.read_text())
            pts = data["keypoints"]["points"]
            assert len(pts) == 18, f"키포인트 수 {len(pts)} != 18"
            for i, pt in enumerate(pts):
                assert len(pt) == 3, f"키포인트 {i} 차원 오류"
                assert 0 <= pt[0] <= CANVAS_W, f"키포인트 {i} x={pt[0]} 범위 초과"
                assert 0 <= pt[1] <= CANVAS_H, f"키포인트 {i} y={pt[1]} 범위 초과"
                assert 0 <= pt[2] <= 1.0, f"키포인트 {i} conf={pt[2]} 범위 초과"

            # 미러링 일관성 검증
            if data.get("mirrored_from"):
                src_dir = data["mirrored_from"]
                src_name = fpath.name.replace(f"_{data['direction']}_", f"_{src_dir}_")
                src_path = fpath.parent / src_name
                if src_path.exists():
                    src_data = json.loads(src_path.read_text())
                    src_pts = src_data["keypoints"]["points"]
                    mirrored = mirror_skeleton(src_pts)
                    for i in range(18):
                        if abs(pts[i][0] - mirrored[i][0]) > 0.01 or \
                           abs(pts[i][1] - mirrored[i][1]) > 0.01:
                            errors.append(f"{fpath.name}: 미러링 불일치 keypoint {i}")
                            break
            ok += 1
        except Exception as e:
            fail += 1
            errors.append(f"{fpath.name}: {str(e)}")

    return ok, fail, errors


def list_all_poses():
    """전체 포즈 목록 출력"""
    print("=== 캐릭터 포즈 (5제작방향 × 7모션) ===")
    total_produced = 0
    total_mirrored = 0
    for d in CHARACTER_PRODUCE_DIRS:
        for m, minfo in CHARACTER_MOTIONS.items():
            print(f"  {d:3s} / {m:15s} : {minfo['frames']} frames")
            total_produced += minfo["frames"]
    for d, dinfo in CHARACTER_DIRECTIONS.items():
        if dinfo["mirror_of"]:
            for m, minfo in CHARACTER_MOTIONS.items():
                total_mirrored += minfo["frames"]
    print(f"  → 제작: {total_produced} 포즈, 미러링: {total_mirrored} 포즈")
    print(f"  → 합계: {total_produced + total_mirrored} 포즈 JSON")

    print("\n=== 몬스터 포즈 (3제작방향 × 5모션) ===")
    total_produced = 0
    total_mirrored = 0
    for d in MONSTER_PRODUCE_DIRS:
        for m, minfo in MONSTER_MOTIONS.items():
            print(f"  {d:3s} / {m:15s} : {minfo['frames']} frames")
            total_produced += minfo["frames"]
    for d, dinfo in MONSTER_DIRECTIONS.items():
        if dinfo["mirror_of"]:
            for m, minfo in MONSTER_MOTIONS.items():
                total_mirrored += minfo["frames"]
    print(f"  → 제작: {total_produced} 포즈, 미러링: {total_mirrored} 포즈")
    print(f"  → 합계: {total_produced + total_mirrored} 포즈 JSON")


def main():
    parser = argparse.ArgumentParser(description="ControlNet 포즈 스켈레톤 생성기")
    parser.add_argument("--output", "-o", type=str, default="assets/controlnet-poses/",
                        help="출력 디렉터리")
    parser.add_argument("--type", "-t", choices=["character", "monster", "all"],
                        default="all", help="엔티티 타입")
    parser.add_argument("--motion", "-m", type=str, help="특정 모션만 생성")
    parser.add_argument("--direction", "-d", type=str, help="특정 방향만 생성")
    parser.add_argument("--list", "-l", action="store_true", help="포즈 목록 출력")
    parser.add_argument("--validate", "-v", action="store_true", help="생성된 포즈 검증")

    args = parser.parse_args()
    base_dir = Path(args.output)

    if args.list:
        list_all_poses()
        return

    if args.validate:
        ok, fail, errors = validate_poses(base_dir)
        print(f"검증 결과: {ok} 통과, {fail} 실패")
        for e in errors[:20]:
            print(f"  ❌ {e}")
        return

    total = 0
    if args.type in ("character", "all"):
        char_dir = base_dir / "characters"
        char_dir.mkdir(parents=True, exist_ok=True)
        n = generate_all_poses("character", char_dir)
        print(f"캐릭터 포즈: {n}개 생성 → {char_dir}")
        total += n

    if args.type in ("monster", "all"):
        mon_dir = base_dir / "monsters"
        mon_dir.mkdir(parents=True, exist_ok=True)
        n = generate_all_poses("monster", mon_dir)
        print(f"몬스터 포즈: {n}개 생성 → {mon_dir}")
        total += n

    print(f"\n총 {total}개 포즈 JSON 생성 완료")

    # 검증
    ok, fail, errors = validate_poses(base_dir)
    print(f"검증: {ok} 통과, {fail} 실패")
    if errors:
        for e in errors[:5]:
            print(f"  ⚠️ {e}")


if __name__ == "__main__":
    main()

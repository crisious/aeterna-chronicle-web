#!/usr/bin/env python3
"""
P2-06 / P3-11 엔딩 분기 회귀 자동화 러너 (시뮬레이션/계약 검증용)

목표:
- 분기 우선순위 D -> C -> A -> B -> DEFEAT 검증
- 패배 루트(망각의 세계) 분기 검증
- 세이브 플래그 조합 기반 자동 판정

P3-11 추가:
- 히든 엔딩(sacred_artifacts=12) 서버 판정 엔진 호환 케이스
- 패배 엔딩(fragment < 3) 서버 판정 엔진 호환 케이스
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List


@dataclass
class EndingCase:
    case_id: str
    description: str
    flags: Dict[str, object]
    expected: str


def resolve_ending(flags: Dict[str, object]) -> str:
    """
    현재 기획 기준 우선순위:
    1) 패배 루트: fail_final_boss = True
    2) 엔딩 D: hidden_d_ready = True
    3) 엔딩 C: ending_c_progress >= 80 and chose_surrender = True
    4) 엔딩 A: used_memory_resonance_5 = True and chose_you_existed = True
    5) 엔딩 B: final_boss_hp_zero = True and chose_seal_ritual = True
    6) fallback: unresolved
    """

    if bool(flags.get("fail_final_boss", False)):
        return "DEFEAT"

    if bool(flags.get("hidden_d_ready", False)):
        return "D"

    if int(flags.get("ending_c_progress", 0)) >= 80 and bool(flags.get("chose_surrender", False)):
        return "C"

    if bool(flags.get("used_memory_resonance_5", False)) and bool(flags.get("chose_you_existed", False)):
        return "A"

    if bool(flags.get("final_boss_hp_zero", False)) and bool(flags.get("chose_seal_ritual", False)):
        return "B"

    return "UNRESOLVED"


def resolve_ending_server(flags: Dict[str, object]) -> str:
    """
    서버 판정 엔진(endingJudge.ts) 호환 판정 로직 (P3-11 추가)

    우선순위 (멀티엔딩_플래그_설계.md SSOT 기준):
    1) sacred_artifacts === 12       → DIVINE_RETURN
    2) betrayal_score >= 70          → BETRAYAL
    3) fragment === 4 && all_party   → TRUE_GUARDIAN
    4) fragment >= 3                 → LAST_WITNESS
    5) else                          → DEFEAT
    """
    sacred = int(flags.get("sacred_artifacts", 0))
    betrayal = int(flags.get("betrayal_score", 0))
    fragment = int(flags.get("fragment_count", 0))
    all_party = bool(flags.get("all_party_alive", False))

    if sacred == 12:
        return "DIVINE_RETURN"
    if betrayal >= 70:
        return "BETRAYAL"
    if fragment == 4 and all_party:
        return "TRUE_GUARDIAN"
    if fragment >= 3:
        return "LAST_WITNESS"
    return "DEFEAT"


def default_cases() -> List[EndingCase]:
    return [
        # ── P2-06 기존 5케이스 (클라이언트 판정 기준) ────────
        EndingCase(
            case_id="REG-D-001",
            description="히든 D 우선 적용",
            flags={
                "hidden_d_ready": True,
                "ending_c_progress": 95,
                "chose_surrender": True,
                "used_memory_resonance_5": True,
                "chose_you_existed": True,
                "final_boss_hp_zero": True,
                "chose_seal_ritual": True,
            },
            expected="D",
        ),
        EndingCase(
            case_id="REG-C-001",
            description="C 조건 충족",
            flags={
                "hidden_d_ready": False,
                "ending_c_progress": 80,
                "chose_surrender": True,
                "final_boss_hp_zero": True,
                "chose_seal_ritual": True,
            },
            expected="C",
        ),
        EndingCase(
            case_id="REG-A-001",
            description="A 조건 충족",
            flags={
                "hidden_d_ready": False,
                "ending_c_progress": 40,
                "chose_surrender": False,
                "used_memory_resonance_5": True,
                "chose_you_existed": True,
                "final_boss_hp_zero": True,
                "chose_seal_ritual": True,
            },
            expected="A",
        ),
        EndingCase(
            case_id="REG-B-001",
            description="B 조건 충족",
            flags={
                "hidden_d_ready": False,
                "ending_c_progress": 20,
                "chose_surrender": False,
                "used_memory_resonance_5": False,
                "chose_you_existed": False,
                "final_boss_hp_zero": True,
                "chose_seal_ritual": True,
            },
            expected="B",
        ),
        EndingCase(
            case_id="REG-FAIL-001",
            description="패배 루트 강제",
            flags={
                "fail_final_boss": True,
                "hidden_d_ready": True,
                "ending_c_progress": 90,
                "chose_surrender": True,
            },
            expected="DEFEAT",
        ),
    ]


def p3_server_cases() -> List[EndingCase]:
    """P3-11 서버 판정 엔진 호환 테스트 케이스"""
    return [
        # ── P3-11 신규 2케이스 (서버 판정 엔진 기준) ─────────
        EndingCase(
            case_id="REG-P3-DIVINE-001",
            description="[P3] 히든 엔딩: sacred_artifacts=12 최우선 적용",
            flags={
                "sacred_artifacts": 12,
                "betrayal_score": 90,
                "fragment_count": 4,
                "all_party_alive": True,
            },
            expected="DIVINE_RETURN",
        ),
        EndingCase(
            case_id="REG-P3-DEFEAT-001",
            description="[P3] 패배 엔딩: fragment < 3, 조건 미충족",
            flags={
                "sacred_artifacts": 2,
                "betrayal_score": 30,
                "fragment_count": 1,
                "all_party_alive": False,
            },
            expected="DEFEAT",
        ),
        # ── P3 추가 검증: 배신 엔딩 ──────────────────────────
        EndingCase(
            case_id="REG-P3-BETRAY-001",
            description="[P3] 배신 엔딩: betrayal_score=70 임계값",
            flags={
                "sacred_artifacts": 5,
                "betrayal_score": 70,
                "fragment_count": 4,
                "all_party_alive": True,
            },
            expected="BETRAYAL",
        ),
        # ── P3 추가 검증: 트루 엔딩 ──────────────────────────
        EndingCase(
            case_id="REG-P3-TRUE-001",
            description="[P3] 트루 엔딩: fragment=4 + 전원 생존",
            flags={
                "sacred_artifacts": 5,
                "betrayal_score": 30,
                "fragment_count": 4,
                "all_party_alive": True,
            },
            expected="TRUE_GUARDIAN",
        ),
        # ── P3 추가 검증: 기본 엔딩 ──────────────────────────
        EndingCase(
            case_id="REG-P3-WITNESS-001",
            description="[P3] 기본 엔딩: fragment=3, 파티 사망 존재",
            flags={
                "sacred_artifacts": 3,
                "betrayal_score": 40,
                "fragment_count": 3,
                "all_party_alive": False,
            },
            expected="LAST_WITNESS",
        ),
    ]


def run(cases: List[EndingCase], resolver=resolve_ending) -> Dict[str, object]:
    rows = []
    pass_count = 0

    for c in cases:
        actual = resolver(c.flags)
        ok = actual == c.expected
        if ok:
            pass_count += 1
        rows.append(
            {
                "caseId": c.case_id,
                "description": c.description,
                "expected": c.expected,
                "actual": actual,
                "result": "PASS" if ok else "FAIL",
            }
        )

    return {
        "total": len(cases),
        "pass": pass_count,
        "fail": len(cases) - pass_count,
        "rows": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--out",
        default="/Users/crisious_mini/Library/CloudStorage/SynologyDrive-Obsidian/게임기획/에테르나크로니클/04_검증_P0/P3/P3-11_regression_result.json",
    )
    parser.add_argument(
        "--p2-out",
        default="/Users/crisious_mini/Library/CloudStorage/SynologyDrive-Obsidian/게임기획/에테르나크로니클/04_검증_P0/P2/P2-06_regression_result.json",
    )
    args = parser.parse_args()

    # ── P2 기존 5케이스 (클라이언트 판정) ─────────────────────
    p2_result = run(default_cases(), resolver=resolve_ending)

    p2_path = Path(args.p2_out)
    p2_path.parent.mkdir(parents=True, exist_ok=True)
    p2_path.write_text(json.dumps(p2_result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("=== P2-06 클라이언트 판정 ===")
    print(f"total={p2_result['total']} pass={p2_result['pass']} fail={p2_result['fail']}")
    for row in p2_result["rows"]:
        print(f"  [{row['result']}] {row['caseId']} expected={row['expected']} actual={row['actual']}")

    # ── P3 서버 판정 엔진 케이스 ──────────────────────────────
    p3_result = run(p3_server_cases(), resolver=resolve_ending_server)

    p3_path = Path(args.out)
    p3_path.parent.mkdir(parents=True, exist_ok=True)
    p3_path.write_text(json.dumps(p3_result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("\n=== P3-11 서버 판정 엔진 ===")
    print(f"total={p3_result['total']} pass={p3_result['pass']} fail={p3_result['fail']}")
    for row in p3_result["rows"]:
        print(f"  [{row['result']}] {row['caseId']} expected={row['expected']} actual={row['actual']}")

    # ── 통합 요약 ────────────────────────────────────────────
    total = int(p2_result["total"]) + int(p3_result["total"])
    passed = int(p2_result["pass"]) + int(p3_result["pass"])
    failed = int(p2_result["fail"]) + int(p3_result["fail"])
    print(f"\n=== 통합 결과: total={total} pass={passed} fail={failed} ===")


if __name__ == "__main__":
    main()

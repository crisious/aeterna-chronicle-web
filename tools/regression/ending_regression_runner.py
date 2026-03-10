#!/usr/bin/env python3
"""
P2-06 엔딩 분기 회귀 자동화 러너 (시뮬레이션/계약 검증용)

목표:
- 분기 우선순위 D -> C -> A -> B 검증
- 패배 루트(망각의 세계) 분기 검증
- 세이브 플래그 조합 기반 자동 판정
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


def default_cases() -> List[EndingCase]:
    return [
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


def run(cases: List[EndingCase]) -> Dict[str, object]:
    rows = []
    pass_count = 0

    for c in cases:
        actual = resolve_ending(c.flags)
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
        default="/Users/crisious_mini/Library/CloudStorage/SynologyDrive-Obsidian/게임기획/에테르나크로니클/04_검증_P0/P2/P2-06_regression_result.json",
    )
    args = parser.parse_args()

    result = run(default_cases())
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"total={result['total']} pass={result['pass']} fail={result['fail']}")
    for row in result["rows"]:
        print(f"[{row['result']}] {row['caseId']} expected={row['expected']} actual={row['actual']}")


if __name__ == "__main__":
    main()

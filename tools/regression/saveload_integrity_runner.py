#!/usr/bin/env python3
"""
P2-07 Save/Load 무결성 점검 러너 (모의 스냅샷 기반)
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Dict, List


KEYS = [
    "story.fragment_count",
    "story.party_alive",
    "story.betrayal_score",
    "story.artifact_count",
    "story.seal_visited",
    "story.ending_a_score",
    "story.emperor_saved",
    "story.lethe_understood",
]


def build_sample_state() -> Dict[str, object]:
    return {
        "story.fragment_count": 4,
        "story.party_alive": 63,
        "story.betrayal_score": 42,
        "story.artifact_count": 11,
        "story.seal_visited": 31,
        "story.ending_a_score": 68,
        "story.emperor_saved": True,
        "story.lethe_understood": True,
    }


def save_state(state: Dict[str, object], path: Path) -> None:
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_state(path: Path) -> Dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def compare(a: Dict[str, object], b: Dict[str, object]) -> List[str]:
    diffs = []
    for k in KEYS:
        if a.get(k) != b.get(k):
            diffs.append(k)
    return diffs


def run(iterations: int = 20) -> Dict[str, object]:
    tmp = Path("/tmp/aeterna_saveload_integrity_state.json")
    base = build_sample_state()
    save_state(base, tmp)

    rows = []
    pass_count = 0

    for i in range(1, iterations + 1):
        loaded = load_state(tmp)
        diffs = compare(base, loaded)
        ok = len(diffs) == 0
        if ok:
            pass_count += 1
        rows.append({"iteration": i, "result": "PASS" if ok else "FAIL", "diffKeys": diffs})

        # save again without mutation (roundtrip)
        save_state(loaded, tmp)

    return {
        "iterations": iterations,
        "pass": pass_count,
        "fail": iterations - pass_count,
        "rows": rows,
    }


def main() -> None:
    result = run(20)
    out = Path(
        "/Users/crisious_mini/Library/CloudStorage/SynologyDrive-Obsidian/게임기획/에테르나크로니클/04_검증_P0/P2/P2-07_saveload_result.json"
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"iterations={result['iterations']} pass={result['pass']} fail={result['fail']}")


if __name__ == "__main__":
    main()

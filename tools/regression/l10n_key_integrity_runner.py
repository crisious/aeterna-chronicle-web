#!/usr/bin/env python3
"""
P2-08 로컬라이제이션 키 정합성 점검 러너

기능:
- 프로젝트 내 키 패턴 스캔/수집
- 정의(Definition) 키 중복 탐지
- 참조(Reference)만 있고 정의 없는 키 탐지(가능한 범위)
- 결과 JSON 출력
"""

from __future__ import annotations

import argparse
import json
import re
import time
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path("/Users/crisious_mini/Library/CloudStorage/SynologyDrive-Obsidian/게임기획/에테르나크로니클")
DEFAULT_OUTPUT = ROOT / "04_검증_P0/P2/P2-08_l10n_integrity_result.json"

INCLUDE_DIRS = [
    "시나리오",
    "03_데이터테이블",
    "01_코어기획",
    "02_UI_UX",
    "04_검증_P0",
    "client/src",
    "server/src",
    "unity_ui_toolkit",
    "ue5_umg",
]

INCLUDE_EXTS = {
    ".md",
    ".txt",
    ".json",
    ".yml",
    ".yaml",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".cs",
    ".cpp",
    ".h",
    ".hpp",
    ".uxml",
}

SKIP_DIR_NAMES = {"node_modules", ".git", "dist", ".idea", ".sync_state", "obj", "bin"}

# 점 표기형 키: dialogue.c4.n3.choice.a / npc.seraphine.greeting.01 등
# 최소 2개 세그먼트(prefix 뒤) 요구: hud.update 같은 메서드 호출 노이즈 감소
DOT_KEY_RE = re.compile(
    r"\b(?:dialogue|npc|quest|ui|story|system|item|monster|ending|combat|hud)(?:\.[a-z0-9_-]+){2,}\b",
    re.IGNORECASE,
)

# 대문자 스네이크형 키: STR_CH1_PROLOGUE_001, UI_HUD_HP_LABEL
SNAKE_KEY_RE = re.compile(
    r"\b(?:LOC|L10N|STR|TEXT|UI|NPC|DIALOG|QUEST|ITEM|SYSTEM|HUD|ENDING)_[A-Z0-9]+(?:_[A-Z0-9]+){1,}\b"
)

# 라인 내 문자열 리터럴/마크다운 코드 span
QUOTED_CHUNK_RE = re.compile(r"`([^`]+)`|\"([^\"]+)\"|'([^']+)'")

# 정의 패턴(휴리스틱)
JSON_KEY_DEF_TEMPLATE = r"[\"']{k}[\"']\s*:"
ASSIGN_DEF_TEMPLATE = r"\b(?:key|locKey|l10nKey|localeKey|stringId|choiceTextKey|textKey|id)\b\s*[:=]\s*[\"']{k}[\"']"
RAW_KEY_VALUE_DEF_TEMPLATE = r"\b{k}\b\s*:"


@dataclass
class Hit:
    key: str
    kind: str  # definition | reference
    file: str
    line: int
    text: str


def safe_read_text(path: Path, retry: int = 8) -> str:
    last_err = None
    for i in range(retry):
        try:
            return path.read_text(encoding="utf-8", errors="ignore")
        except OSError as e:
            last_err = e
            if getattr(e, "errno", None) == 11:  # Synology lock
                time.sleep(0.15 * (i + 1))
                continue
            break
    raise RuntimeError(f"read failed: {path} ({last_err})")


def safe_write_text(path: Path, content: str, retry: int = 8) -> None:
    last_err = None
    path.parent.mkdir(parents=True, exist_ok=True)
    for i in range(retry):
        try:
            path.write_text(content, encoding="utf-8")
            return
        except OSError as e:
            last_err = e
            if getattr(e, "errno", None) == 11:
                time.sleep(0.15 * (i + 1))
                continue
            break
    raise RuntimeError(f"write failed: {path} ({last_err})")


def iter_files(root: Path) -> List[Path]:
    targets: List[Path] = []
    for rel in INCLUDE_DIRS:
        d = root / rel
        if not d.exists():
            continue
        for p in d.rglob("*"):
            if not p.is_file():
                continue
            if p.suffix.lower() not in INCLUDE_EXTS:
                continue
            if any(part in SKIP_DIR_NAMES for part in p.parts):
                continue
            if p.name in {"l10n_key_integrity_runner.py", "P2-08_l10n_integrity_result.json"}:
                continue
            targets.append(p)
    return sorted(set(targets))


def _extract_from_chunk(chunk: str) -> List[str]:
    keys = set()
    keys.update(k.lower() for k in DOT_KEY_RE.findall(chunk))
    keys.update(k for k in SNAKE_KEY_RE.findall(chunk))
    return sorted(keys)


def collect_keys(line: str) -> List[str]:
    """문자열 리터럴/마크다운 코드 스팬 기반으로만 키를 추출한다."""
    keys = set()

    for m in QUOTED_CHUNK_RE.finditer(line):
        chunk = next((g for g in m.groups() if g is not None), "")
        for k in _extract_from_chunk(chunk):
            keys.add(k)

    return sorted(keys)


def classify_hit(key: str, line: str) -> str:
    escaped = re.escape(key)
    json_def_re = re.compile(JSON_KEY_DEF_TEMPLATE.format(k=escaped), re.IGNORECASE)
    assign_def_re = re.compile(ASSIGN_DEF_TEMPLATE.format(k=escaped), re.IGNORECASE)
    raw_def_re = re.compile(RAW_KEY_VALUE_DEF_TEMPLATE.format(k=escaped), re.IGNORECASE)

    if json_def_re.search(line):
        return "definition"
    if assign_def_re.search(line):
        return "definition"
    if raw_def_re.search(line):
        return "definition"
    return "reference"


def run(root: Path) -> Dict[str, object]:
    files = iter_files(root)

    hits: List[Hit] = []
    file_scan_errors: List[Dict[str, str]] = []

    for f in files:
        try:
            text = safe_read_text(f)
        except Exception as e:  # noqa: BLE001
            file_scan_errors.append({"file": str(f), "error": str(e)})
            continue

        for line_no, line in enumerate(text.splitlines(), start=1):
            line_keys = collect_keys(line)
            for key in line_keys:
                kind = classify_hit(key, line)
                hits.append(
                    Hit(
                        key=key,
                        kind=kind,
                        file=str(f.relative_to(root)),
                        line=line_no,
                        text=line.strip()[:300],
                    )
                )

    defs_by_key: Dict[str, List[Hit]] = defaultdict(list)
    refs_by_key: Dict[str, List[Hit]] = defaultdict(list)

    for h in hits:
        if h.kind == "definition":
            defs_by_key[h.key].append(h)
        else:
            refs_by_key[h.key].append(h)

    duplicate_definition_keys = {
        k: v for k, v in defs_by_key.items() if len(v) >= 2
    }

    referenced_without_definition = {
        k: v for k, v in refs_by_key.items() if len(v) >= 1 and len(defs_by_key.get(k, [])) == 0
    }

    conflict_keys = []
    for k, def_hits in duplicate_definition_keys.items():
        snippets = sorted(set(h.text for h in def_hits))
        if len(snippets) >= 2:
            conflict_keys.append(
                {
                    "key": k,
                    "definitionCount": len(def_hits),
                    "distinctDefinitionLines": snippets[:20],
                    "locations": [
                        {"file": h.file, "line": h.line}
                        for h in def_hits[:20]
                    ],
                }
            )

    def to_occ(rows: List[Hit], limit: int = 20) -> List[Dict[str, object]]:
        return [
            {"file": h.file, "line": h.line, "text": h.text}
            for h in rows[:limit]
        ]

    duplicate_entries = [
        {
            "key": k,
            "definitionCount": len(v),
            "locations": to_occ(v),
        }
        for k, v in sorted(duplicate_definition_keys.items())
    ]

    missing_entries = [
        {
            "key": k,
            "referenceCount": len(v),
            "references": to_occ(v),
        }
        for k, v in sorted(referenced_without_definition.items())
    ]

    files_with_hits = len({h.file for h in hits})
    total_defs = sum(len(v) for v in defs_by_key.values())
    total_refs = sum(len(v) for v in refs_by_key.values())

    result = {
        "task": "P2-08_l10n_key_integrity",
        "scannedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "root": str(root),
        "scanConfig": {
            "includeDirs": INCLUDE_DIRS,
            "includeExts": sorted(INCLUDE_EXTS),
            "dotPattern": DOT_KEY_RE.pattern,
            "snakePattern": SNAKE_KEY_RE.pattern,
        },
        "summary": {
            "scannedFileCount": len(files),
            "filesWithKeyHits": files_with_hits,
            "totalHitCount": len(hits),
            "definitionHitCount": total_defs,
            "referenceHitCount": total_refs,
            "uniqueDefinitionKeyCount": len(defs_by_key),
            "uniqueReferenceKeyCount": len(refs_by_key),
            "duplicateDefinitionKeyCount": len(duplicate_entries),
            "missingDefinitionKeyCount": len(missing_entries),
            "conflictKeyCount": len(conflict_keys),
            "scanErrorCount": len(file_scan_errors),
        },
        "duplicateDefinitionKeys": duplicate_entries,
        "referencedWithoutDefinition": missing_entries,
        "conflictKeys": conflict_keys,
        "scanErrors": file_scan_errors,
    }

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="P2-08 l10n key integrity runner")
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    root = Path(args.root).resolve()
    out = Path(args.out).resolve()

    result = run(root)
    safe_write_text(out, json.dumps(result, ensure_ascii=False, indent=2) + "\n")

    summary = result["summary"]
    print(
        "scanned={scanned} hits={hits} defs={defs} refs={refs} dupKeys={dup} missingDefs={missing} conflicts={conf}".format(
            scanned=summary["scannedFileCount"],
            hits=summary["totalHitCount"],
            defs=summary["definitionHitCount"],
            refs=summary["referenceHitCount"],
            dup=summary["duplicateDefinitionKeyCount"],
            missing=summary["missingDefinitionKeyCount"],
            conf=summary["conflictKeyCount"],
        )
    )
    print(f"out={out}")


if __name__ == "__main__":
    main()

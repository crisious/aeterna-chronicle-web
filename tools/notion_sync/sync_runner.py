#!/usr/bin/env python3
"""
Aeterna Chronicle Obsidian -> Notion sync runner
- full sync: scan markdown files and upsert whole body to Notion pages
- incremental sync: sync only files changed since last run (mtime 기준)

Optimized:
  1. Page cache: list all child pages once at startup → title→page_id dict
  2. Block merging: consecutive text lines → single paragraph (≤2000 chars),
     headings → heading_1/2/3, fenced code → code block
  3. Aggressive merging when total blocks > 500
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

DEFAULT_VAULT_ROOT = Path(
    "/Users/crisious_mini/Library/CloudStorage/SynologyDrive-Obsidian/게임기획/에테르나크로니클"
)
DEFAULT_PARENT_PAGE_ID = "30f70bd1-67e9-8107-a3e8-c89f7ead9d4f"
DEFAULT_STATE_FILE = DEFAULT_VAULT_ROOT / ".sync_state/notion_sync_state.json"
NOTION_VERSION = "2025-09-03"
MAX_RICH_TEXT = 2000  # Notion rich_text content limit
AGGRESSIVE_BLOCK_THRESHOLD = 500

EXCLUDE_DIR_NAMES = {
    ".git",
    ".idea",
    "node_modules",
    "dist",
    ".sync_state",
    "tools",
}


@dataclass
class SyncResult:
    path: Path
    action: str  # created|updated|dry-run|skipped
    page_id: str
    block_count: int


class NotionClient:
    def __init__(self, token: str, notion_version: str = NOTION_VERSION):
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Notion-Version": notion_version,
            "Content-Type": "application/json; charset=utf-8",
        }

    def request(self, method: str, url: str, body: Optional[dict] = None, retry: int = 5) -> dict:
        data = None
        if body is not None:
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")

        last_err = None
        for i in range(retry):
            try:
                req = urllib.request.Request(url, data=data, headers=self.headers, method=method)
                with urllib.request.urlopen(req, timeout=120) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                last_err = e
                resp_body = ""
                try:
                    resp_body = e.read().decode("utf-8", errors="replace")
                except Exception:
                    pass
                if e.code == 429:
                    retry_after = float(e.headers.get("Retry-After", 1))
                    print(f"  [rate-limit] sleeping {retry_after}s ...")
                    time.sleep(retry_after)
                    continue
                if e.code == 409:
                    time.sleep(0.5 * (i + 1))
                    continue
                # For 400 errors, print details and don't retry
                if e.code == 400:
                    print(f"  [400 error] {resp_body[:300]}")
                    raise RuntimeError(f"Notion API 400: {resp_body[:300]}")
                time.sleep(0.4 * (i + 1))
            except Exception as e:  # noqa: BLE001
                last_err = e
                time.sleep(0.4 * (i + 1))
        raise RuntimeError(f"Notion API failed after {retry} retries: {last_err}")

    # ── Page cache: build title→page dict from parent's children ──

    def build_page_cache(self, parent_page_id: str) -> Dict[str, dict]:
        """Recursively list all child *pages* under parent_page_id and return {title: page_dict}."""
        cache: Dict[str, dict] = {}
        self._build_cache_recursive(parent_page_id, cache, depth=0)
        print(f"[cache] {len(cache)} child pages loaded (recursive)")
        return cache

    def _build_cache_recursive(self, page_id: str, cache: Dict[str, dict], depth: int) -> None:
        if depth > 3:
            return
        children = self.list_children(page_id)
        for child in children:
            if child.get("type") != "child_page":
                continue
            title = child.get("child_page", {}).get("title", "")
            child_id = child["id"]
            if title:
                cache[title] = {"id": child_id, "object": "block"}
            # Recurse into folder pages
            time.sleep(0.15)
            self._build_cache_recursive(child_id, cache, depth + 1)

    def find_page_under_parent(self, parent_page_id: str, title: str) -> Optional[dict]:
        """Fallback search – only used if cache misses (shouldn't happen often)."""
        cursor = None
        while True:
            body = {
                "query": title,
                "filter": {"value": "page", "property": "object"},
                "page_size": 100,
            }
            if cursor:
                body["start_cursor"] = cursor

            resp = self.request("POST", "https://api.notion.com/v1/search", body)
            for item in resp.get("results", []):
                parent = item.get("parent", {})
                if parent.get("type") != "page_id" or parent.get("page_id") != parent_page_id:
                    continue
                t = "".join(
                    x.get("plain_text", "")
                    for x in item.get("properties", {}).get("title", {}).get("title", [])
                )
                if t == title:
                    return item

            if not resp.get("has_more"):
                return None
            cursor = resp.get("next_cursor")

    def create_page_under_parent(self, parent_page_id: str, title: str) -> dict:
        body = {
            "parent": {"type": "page_id", "page_id": parent_page_id},
            "properties": {
                "title": {
                    "title": [{"type": "text", "text": {"content": title}}]
                }
            },
        }
        return self.request("POST", "https://api.notion.com/v1/pages", body)

    def list_children(self, page_id: str) -> List[dict]:
        all_children: List[dict] = []
        cursor = None
        while True:
            url = f"https://api.notion.com/v1/blocks/{page_id}/children?page_size=100"
            if cursor:
                url += "&start_cursor=" + urllib.parse.quote(cursor)
            resp = self.request("GET", url)
            all_children.extend(resp.get("results", []))
            if not resp.get("has_more"):
                break
            cursor = resp.get("next_cursor")
        return all_children

    def archive_children(self, page_id: str) -> int:
        children = self.list_children(page_id)
        for c in children:
            self.request("DELETE", f"https://api.notion.com/v1/blocks/{c['id']}")
        return len(children)

    def append_children(self, page_id: str, blocks: List[dict]) -> None:
        for i in range(0, len(blocks), 100):
            chunk = blocks[i : i + 100]
            self.request(
                "PATCH",
                f"https://api.notion.com/v1/blocks/{page_id}/children",
                {"children": chunk},
            )


def safe_read_text(path: Path, retry: int = 10) -> str:
    last_err = None
    for i in range(retry):
        try:
            return path.read_text(encoding="utf-8", errors="ignore")
        except OSError as e:
            last_err = e
            if getattr(e, "errno", None) == 11:
                time.sleep(0.2 * (i + 1))
                continue
            break
    raise RuntimeError(f"파일 읽기 실패: {path} ({last_err})")


# ── Block building helpers ──

def _make_paragraph(text: str) -> dict:
    """Create a paragraph block, splitting rich_text segments at MAX_RICH_TEXT."""
    segments: List[dict] = []
    while text:
        chunk = text[:MAX_RICH_TEXT]
        segments.append({"type": "text", "text": {"content": chunk}})
        text = text[MAX_RICH_TEXT:]
    return {
        "object": "block",
        "type": "paragraph",
        "paragraph": {"rich_text": segments},
    }


def _make_heading(level: int, text: str) -> dict:
    htype = f"heading_{level}"
    return {
        "object": "block",
        "type": htype,
        htype: {
            "rich_text": [{"type": "text", "text": {"content": text[:MAX_RICH_TEXT]}}],
        },
    }


def _make_code(code_text: str, language: str = "plain text") -> dict:
    """Create a code block. Notion code blocks have a 2000 char limit per rich_text."""
    segments: List[dict] = []
    remaining = code_text
    while remaining:
        chunk = remaining[:MAX_RICH_TEXT]
        segments.append({"type": "text", "text": {"content": chunk}})
        remaining = remaining[MAX_RICH_TEXT:]
    return {
        "object": "block",
        "type": "code",
        "code": {
            "rich_text": segments,
            "language": language,
        },
    }


_HEADING_RE = re.compile(r"^(#{1,3})\s+(.+)$")
_CODE_FENCE_RE = re.compile(r"^```(\w*)$")

# Map common markdown language tags to Notion's accepted language values
_LANG_MAP = {
    "": "plain text",
    "py": "python",
    "python": "python",
    "js": "javascript",
    "javascript": "javascript",
    "ts": "typescript",
    "typescript": "typescript",
    "json": "json",
    "yaml": "yaml",
    "yml": "yaml",
    "bash": "bash",
    "sh": "shell",
    "shell": "shell",
    "css": "css",
    "html": "html",
    "sql": "sql",
    "c": "c",
    "cpp": "c++",
    "java": "java",
    "rust": "rust",
    "go": "go",
    "lua": "lua",
    "markdown": "markdown",
    "md": "markdown",
    "xml": "xml",
    "toml": "toml",
    "ini": "ini",
    "csv": "csv",
    "r": "r",
    "ruby": "ruby",
    "swift": "swift",
    "kotlin": "kotlin",
    "dart": "dart",
    "php": "php",
    "perl": "perl",
    "scala": "scala",
}


def _flush_text_buffer(buf: List[str], blocks: List[dict]) -> None:
    """Merge buffered lines into paragraph blocks (≤ MAX_RICH_TEXT each)."""
    if not buf:
        return
    merged = "\n".join(buf)
    # Split into chunks that fit in a single rich_text segment
    while merged:
        chunk = merged[:MAX_RICH_TEXT]
        # Try to break at newline if possible
        if len(merged) > MAX_RICH_TEXT:
            nl = chunk.rfind("\n")
            if nl > MAX_RICH_TEXT // 2:
                chunk = merged[:nl]
        blocks.append(_make_paragraph(chunk))
        merged = merged[len(chunk):].lstrip("\n")
    buf.clear()


def markdown_to_blocks(md_text: str, source: Path, aggressive: bool = False) -> List[dict]:
    blocks: List[dict] = [
        _make_heading(2, "Obsidian 전체 본문 동기화"),
        _make_paragraph(f"Source: {source.as_posix()}"),
        {"object": "block", "type": "divider", "divider": {}},
    ]

    lines = md_text.splitlines()
    text_buf: List[str] = []
    in_code = False
    code_lines: List[str] = []
    code_lang = "plain text"

    for line in lines:
        # ── Code fence handling ──
        fence_match = _CODE_FENCE_RE.match(line.strip())
        if fence_match and not in_code:
            _flush_text_buffer(text_buf, blocks)
            in_code = True
            code_lines = []
            raw_lang = fence_match.group(1).lower()
            code_lang = _LANG_MAP.get(raw_lang, "plain text")
            continue
        if in_code:
            if line.strip() == "```":
                in_code = False
                blocks.append(_make_code("\n".join(code_lines), code_lang))
                code_lines = []
                continue
            code_lines.append(line)
            continue

        # ── Heading ──
        heading_match = _HEADING_RE.match(line)
        if heading_match:
            _flush_text_buffer(text_buf, blocks)
            level = len(heading_match.group(1))
            blocks.append(_make_heading(level, heading_match.group(2).strip()))
            continue

        # ── Regular text → buffer ──
        text_buf.append(line)

    # Flush remaining
    if in_code and code_lines:
        blocks.append(_make_code("\n".join(code_lines), code_lang))
    _flush_text_buffer(text_buf, blocks)

    # ── Aggressive merging if too many blocks ──
    if aggressive or len(blocks) > AGGRESSIVE_BLOCK_THRESHOLD:
        blocks = _aggressive_merge(blocks)

    return blocks


def _aggressive_merge(blocks: List[dict]) -> List[dict]:
    """Second pass: merge consecutive paragraphs more aggressively."""
    merged: List[dict] = []
    para_buf = ""

    def flush():
        nonlocal para_buf
        if para_buf:
            while para_buf:
                chunk = para_buf[:MAX_RICH_TEXT]
                if len(para_buf) > MAX_RICH_TEXT:
                    nl = chunk.rfind("\n")
                    if nl > MAX_RICH_TEXT // 2:
                        chunk = para_buf[:nl]
                merged.append(_make_paragraph(chunk))
                para_buf = para_buf[len(chunk):].lstrip("\n")

    for b in blocks:
        if b["type"] == "paragraph":
            text = "".join(
                seg.get("text", {}).get("content", "")
                for seg in b["paragraph"]["rich_text"]
            )
            if para_buf:
                para_buf += "\n" + text
            else:
                para_buf = text
        else:
            flush()
            merged.append(b)

    flush()
    return merged


def should_skip(path: Path) -> bool:
    for part in path.parts:
        if part in EXCLUDE_DIR_NAMES:
            return True
    return False


def collect_markdown_files(vault_root: Path) -> List[Path]:
    files: List[Path] = []
    for p in vault_root.rglob("*.md"):
        if should_skip(p):
            continue
        files.append(p)
    return sorted(files)


def load_state(path: Path) -> dict:
    if not path.exists():
        return {"lastRunEpoch": 0, "files": {}}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {"lastRunEpoch": 0, "files": {}}


def save_state(path: Path, state: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def pick_targets(
    all_files: List[Path], mode: str, state: dict, explicit_paths: Optional[List[Path]] = None
) -> List[Path]:
    if explicit_paths:
        normalized = [p.resolve() for p in explicit_paths if p.exists()]
        return sorted(normalized)

    if mode == "full":
        return all_files

    # incremental
    last_run = float(state.get("lastRunEpoch", 0))
    targets: List[Path] = []
    for p in all_files:
        try:
            mtime = p.stat().st_mtime
        except Exception:  # noqa: BLE001
            continue
        if mtime >= last_run:
            targets.append(p)
    return sorted(targets)


def sync_one(
    notion: NotionClient,
    parent_page_id: str,
    md_path: Path,
    dry_run: bool,
    page_cache: Dict[str, dict],
) -> SyncResult:
    title = md_path.name

    # ── Cache lookup instead of search API ──
    cached = page_cache.get(title)
    action = "updated"

    if cached is None:
        # Fallback: search API (rare – new file not in cache)
        page = notion.find_page_under_parent(parent_page_id, title)
        if page is None:
            if dry_run:
                return SyncResult(md_path, "dry-run(create)", "N/A", 0)
            page = notion.create_page_under_parent(parent_page_id, title)
            action = "created"
            page_cache[title] = page  # update cache
        else:
            page_cache[title] = page
        page_id = page["id"]
    else:
        page_id = cached["id"]

    md_text = safe_read_text(md_path)
    blocks = markdown_to_blocks(md_text, md_path)

    if dry_run:
        return SyncResult(md_path, "dry-run(update)", page_id, len(blocks))

    notion.archive_children(page_id)
    notion.append_children(page_id, blocks)
    return SyncResult(md_path, action, page_id, len(blocks))


################################################################################
# ──── Post-sync folder organizer ────
# Obsidian 폴더 → Notion 부모 페이지 자동 매핑. 동기화 후 루트에 남은 고아 페이지를 올바른 폴더로 이동.
################################################################################

# Obsidian 디렉터리 접두사 → Notion 폴더 page_id
FOLDER_MAP: Dict[str, str] = {
    "01_코어기획":   "31e70bd1-67e9-810e-9365-fb421a89bf72",
    "02_UI_UX":      "31e70bd1-67e9-8101-832e-e17fcd9ead8b",
    "03_데이터테이블": "31e70bd1-67e9-8159-bdc8-d6edd832f4e6",
    "시나리오":       "31e70bd1-67e9-811a-baff-e367b2aec7d1",
    "월드맵":         "31e70bd1-67e9-81d6-9aae-fdbfc0efd8f3",
    "캐릭터":         "31e70bd1-67e9-8162-8783-df23d1b34084",
    "04_검증_P0":    "31e70bd1-67e9-81c4-ac87-df3d99e057b0",
    "99_백업이관":   "31e70bd1-67e9-810e-9365-fb421a89bf72",  # 코어기획에 넣기
    "ue5_project":   "31e70bd1-67e9-810e-9365-fb421a89bf72",
    "k8s":           "31e70bd1-67e9-810e-9365-fb421a89bf72",
    "server":        "31e70bd1-67e9-810e-9365-fb421a89bf72",
    "client":        "31e70bd1-67e9-810e-9365-fb421a89bf72",
}

# 루트에 남아도 되는 페이지 (이동 안 함)
ROOT_KEEP_TITLES = {
    "README.md",
    "SSOT_참조_락_규칙.md",
    "정합성_검증_체크리스트.md",
    "에테르나크로니클_통합_가이드.md",
    "분류이동_결과_2026-03-07.md",
    "분류이동_결과_2026-03-09.md",
}

# 아카이브 대상 제목 패턴 (중복 잔재)
ARCHIVE_TITLE_PATTERNS = ["_unlocked"]


def _resolve_folder(file_path: Path, vault_root: Path) -> Optional[str]:
    """파일 경로에서 Notion 폴더 page_id를 결정."""
    try:
        rel = file_path.relative_to(vault_root)
    except ValueError:
        return None
    parts = rel.parts
    if len(parts) < 2:
        return None  # 루트 파일
    for prefix, folder_id in FOLDER_MAP.items():
        if parts[0] == prefix or parts[0].startswith(prefix):
            return folder_id
    return None


def post_sync_organize(
    notion: "NotionClient",
    parent_page_id: str,
    state: dict,
    vault_root: Path,
    dry_run: bool,
) -> None:
    """동기화 후 루트의 고아 페이지를 올바른 폴더로 이동하고, 중복/잔재를 아카이브."""
    print("\n[organize] 루트 페이지 정리 시작 ...")

    # 루트 직접 자식 페이지 조회
    root_children = notion.list_children(parent_page_id)
    root_pages = [c for c in root_children if c.get("type") == "child_page"]
    # 폴더 페이지 ID (이동 대상에서 제외)
    folder_ids = set(FOLDER_MAP.values())

    # state에서 file_path → pageId 역매핑
    page_to_file: Dict[str, str] = {}
    for fpath, info in state.get("files", {}).items():
        pid = info.get("pageId", "")
        if pid:
            page_to_file[pid] = fpath

    moved = 0
    archived = 0
    for pg in root_pages:
        pid = pg["id"]
        title = pg.get("child_page", {}).get("title", "")

        # 폴더 자체는 건드리지 않음
        if pid in folder_ids:
            continue
        # 루트 유지 대상
        if title in ROOT_KEEP_TITLES:
            continue

        # 아카이브 대상 확인
        should_archive = any(pat in title for pat in ARCHIVE_TITLE_PATTERNS)
        if should_archive:
            if dry_run:
                print(f"  [dry-run] archive: {title}")
            else:
                notion.request("PATCH", f"https://api.notion.com/v1/pages/{pid}", {"archived": True})
                print(f"  [archived] {title}")
                archived += 1
            continue

        # 이동 대상: state에서 원본 파일 경로 찾기
        src_file = page_to_file.get(pid)
        target_folder = None
        if src_file:
            target_folder = _resolve_folder(Path(src_file), vault_root)

        if target_folder and target_folder != parent_page_id:
            if dry_run:
                print(f"  [dry-run] move: {title} → {target_folder}")
            else:
                try:
                    notion.request(
                        "POST",
                        f"https://api.notion.com/v1/pages/{pid}/move",
                        {"parent": {"type": "page_id", "page_id": target_folder}},
                    )
                    print(f"  [moved] {title} → folder")
                    moved += 1
                except Exception as e:
                    print(f"  [move-failed] {title}: {e}")
            time.sleep(0.35)

    print(f"[organize] 완료: moved={moved}, archived={archived}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Obsidian -> Notion sync runner")
    parser.add_argument("--mode", choices=["full", "incremental"], default="incremental")
    parser.add_argument("--vault-root", default=str(DEFAULT_VAULT_ROOT))
    parser.add_argument("--parent-page-id", default=DEFAULT_PARENT_PAGE_ID)
    parser.add_argument("--state-file", default=str(DEFAULT_STATE_FILE))
    parser.add_argument("--file", action="append", help="특정 파일만 동기화 (반복 가능)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-organize", action="store_true", help="동기화 후 폴더 정리 건너뛰기")
    args = parser.parse_args()

    token = os.getenv("NOTION_API_KEY")
    if not token:
        key_path = Path(os.path.expanduser("~/.config/notion/api_key"))
        if key_path.exists():
            token = key_path.read_text(encoding="utf-8").strip()

    if not token:
        raise SystemExit("NOTION_API_KEY 미설정, ~/.config/notion/api_key도 없음")

    vault_root = Path(args.vault_root).resolve()
    state_file = Path(args.state_file).resolve()
    state = load_state(state_file)

    all_files = collect_markdown_files(vault_root)

    explicit = [Path(f).resolve() for f in args.file] if args.file else None
    targets = pick_targets(all_files, args.mode, state, explicit)

    if not targets:
        print("동기화 대상 없음")
        return

    notion = NotionClient(token)

    # ── Build page cache once ──
    print(f"[init] Building page cache from parent {args.parent_page_id} ...")
    page_cache = notion.build_page_cache(args.parent_page_id)

    results: List[SyncResult] = []

    started = time.time()
    print(f"[sync] {len(targets)} files to process (mode={args.mode})")
    for idx, md in enumerate(targets, 1):
        try:
            r = sync_one(
                notion=notion,
                parent_page_id=args.parent_page_id,
                md_path=md,
                dry_run=args.dry_run,
                page_cache=page_cache,
            )
            results.append(r)
            print(f"[{idx}/{len(targets)}] [{r.action}] {md.name} -> {r.page_id} (blocks={r.block_count})")

            if not args.dry_run:
                state.setdefault("files", {})[str(md)] = {
                    "lastSyncedEpoch": time.time(),
                    "lastAction": r.action,
                    "pageId": r.page_id,
                    "blockCount": r.block_count,
                }
        except Exception as e:  # noqa: BLE001
            print(f"[{idx}/{len(targets)}] [failed] {md.name}: {e}")

    finished = time.time()
    if not args.dry_run:
        state["lastRunEpoch"] = finished
        state["lastRunMode"] = args.mode
        state["lastRunCount"] = len(results)
        save_state(state_file, state)

    print("---")
    print(f"mode={args.mode} dryRun={args.dry_run}")
    print(f"targets={len(targets)} synced={len(results)} elapsed={finished-started:.2f}s")

    # ── Post-sync folder organize ──
    if not getattr(args, "no_organize", False):
        post_sync_organize(
            notion=notion,
            parent_page_id=args.parent_page_id,
            state=state,
            vault_root=vault_root,
            dry_run=args.dry_run,
        )


if __name__ == "__main__":
    main()

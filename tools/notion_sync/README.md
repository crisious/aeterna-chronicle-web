# Notion Sync Runner (P2-05)

에테르나크로니클 Obsidian markdown를 Notion 부모 페이지 하위로 동기화하는 러너.

- 스크립트: `tools/notion_sync/sync_runner.py`
- Notion API 버전: `2025-09-03`
- 기본 parent page id: `30f70bd1-67e9-8107-a3e8-c89f7ead9d4f`

---

## 1) 실행 방법

### 1.1 증분 동기화 (기본)

```bash
python3 tools/notion_sync/sync_runner.py --mode incremental
```

### 1.2 전체 동기화

```bash
python3 tools/notion_sync/sync_runner.py --mode full
```

### 1.3 특정 파일만 동기화

```bash
python3 tools/notion_sync/sync_runner.py \
  --file "/abs/path/to/챕터3_시나리오.md" \
  --file "/abs/path/to/P2-03_텔레메트리_KPI_대시보드_정의_v1.1.md"
```

### 1.4 Dry run (실제 반영 없이 계획만 출력)

```bash
python3 tools/notion_sync/sync_runner.py --mode incremental --dry-run
```

---

## 2) 인증

우선순위:
1. 환경변수 `NOTION_API_KEY`
2. 파일 `~/.config/notion/api_key`

둘 다 없으면 실행 실패.

---

## 3) 상태 파일

- 기본 위치: `에테르나크로니클/.sync_state/notion_sync_state.json`
- 저장 내용:
  - 마지막 실행 시각
  - 파일별 마지막 동기화 시각/액션/페이지ID/블록수

증분 모드는 파일 mtime >= lastRunEpoch 기준으로 대상 선정.

---

## 4) 설계 메모

- 파일명(`*.md`)을 Notion 페이지 title canonical로 사용
- 기존 페이지 있으면 블록 아카이브 후 전체 본문 재업로드
- 없으면 신규 페이지 생성
- Synology 잠금(`Errno 11`) 대응: 읽기 retry 내장

---

## 5) 주의

- README/인덱스 파일도 대상에 포함된다. 제외하려면 스크립트의 exclude 규칙 확장 필요.
- 대량 full sync는 API 호출량이 크므로 오프피크 시간에 실행 권장.

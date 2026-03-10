# 에테르나 크로니클 — P2-05 Notion↔Obsidian 동기화 자동화 구축 리포트 v1

> 작성일: 2026-03-07
> 상태: Done (v1)

---

## 1) 목표

- 수동 동기화 반복 작업을 줄이기 위해
  - 전체 동기화(full)
  - 증분 동기화(incremental)
  - 단일 파일 동기화(file-target)
  를 하나의 실행기로 통합.

---

## 2) 구현 산출물

1. `tools/notion_sync/sync_runner.py`
   - Notion API 기반 업서트 러너
   - 모드:
     - `--mode full`
     - `--mode incremental`(기본)
     - `--file ...`(반복 지정 가능)
     - `--dry-run`
   - 동작:
     - 파일명 기준 페이지 검색/생성
     - 기존 블록 아카이브 후 전체 본문 업로드
     - 상태 파일(`.sync_state/notion_sync_state.json`) 기록
   - 안정화:
     - Synology 잠금(Errno 11) 읽기 재시도

2. `tools/notion_sync/README.md`
   - 실행 명령/인증/상태파일/주의사항 문서화

---

## 3) 검증

- 실행: `python3 tools/notion_sync/sync_runner.py --mode incremental --dry-run`
- 결과: 대상 파일 120건 스캔/계획 출력, 스크립트 오류 없이 종료
- 확인 포인트:
  - 기존 Notion 페이지 update 후보 감지
  - 신규 create 후보 감지
  - 증분 모드 동작 확인

---

## 4) 운영 규칙

- 일상 운영: incremental
- 대규모 구조 변경 후: full
- 급한 수정 반영: file-target

---

## 5) 한계 및 후속

- 현재는 `README.md` 등 인덱스 파일도 동기화 대상 포함
  - 후속(v1.1): exclude 패턴 설정 옵션 추가 권장
- Notion 호출량 제어(속도 제한/배치 정책) 고도화 가능

---

## 6) 최종 판정

- **P2-05 Done (v1)**
